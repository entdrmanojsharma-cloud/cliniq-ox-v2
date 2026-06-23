/* 
  Purpose: Business service orchestration layer for the Calendar Events Module.
  Responsibility: Enforce event overlap conflict checks (including recurring slots), validate workflow state-machines, and write audits.
*/

const writeAuditLog = require('../../shared/audit');
const { getOccurrences } = require('./recurrence');

class CalendarService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getEvents(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { events, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      startFrom: query.startFrom,
      startTo: query.startTo,
      doctorId: query.doctorId,
      otRoomId: query.otRoomId,
      patientId: query.patientId,
      eventType: query.eventType,
      eventStatus: query.eventStatus,
      search: query.search
    });

    return {
      events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getEventById(id, hospitalId) {
    const event = await this.repository.findById(id, hospitalId);
    if (!event) {
      const err = new Error('Calendar event not found.');
      err.status = 404;
      err.code = 'ERR_EVENT_NOT_FOUND';
      throw err;
    }
    return event;
  }

  async createEvent(hospitalId, data, userContext) {
    let conflictWarningMsg = null;
    // Skip conflict check if user explicitly chose to override
    if (!data.forceCreate) {
      const conflict = await this.detectConflict(hospitalId, null, data.doctorId, data.otRoomId, data.startTime, data.endTime, data.recurrenceRule);
      if (conflict) {
        const err = new Error(conflict.message);
        err.status = 409;
        err.code = conflict.code;
        err.conflictWarning = true;   // frontend can offer "Save Anyway"
        throw err;
      }
    } else {
      const conflict = await this.detectConflict(hospitalId, null, data.doctorId, data.otRoomId, data.startTime, data.endTime, data.recurrenceRule);
      if (conflict) {
        conflictWarningMsg = conflict.message;
      }
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const durationMinutes = Math.round((end - start) / 60000);

    const newEvent = await this.repository.create({
      hospitalId,
      eventType: data.eventType,
      eventStatus: 'PENDING',
      title: data.title,
      startTime: start,
      endTime: end,
      doctorId: data.doctorId || null,
      assistantSurgeonId: data.assistantSurgeonId || null,
      otRoomId: data.otRoomId || null,
      patientId: data.patientId || null,
      recurrenceRule: data.recurrenceRule || null,
      location: data.location || null,
      description: data.description || null,
      surgeryId: data.surgeryId || null,
      surgeryCost: data.surgeryCost !== undefined && data.surgeryCost !== null ? Number(data.surgeryCost) : null,
      durationMinutes,
      priority: data.forceCreate ? 'LOW' : 'NORMAL',
      createdBy: userContext.userId,
      diagnoses: data.diagnoses || []
    });

    // --- Trigger Notifications for Conflict Override ---
    if (conflictWarningMsg) {
      try {
        const notifyUsers = new Set([userContext.userId]);
        if (data.doctorId) {
          const doctorObj = await this.prisma.doctor.findFirst({
            where: { id: data.doctorId, hospitalId }
          });
          if (doctorObj && doctorObj.userId) {
            notifyUsers.add(doctorObj.userId);
          }
        }
        for (const uid of notifyUsers) {
          await this.prisma.notification.create({
            data: {
              hospitalId,
              userId: uid,
              title: 'Schedule Conflict Override',
              message: `Event "${data.title}" was scheduled overriding a conflict: ${conflictWarningMsg}`,
              type: 'EVENT_CONFLICT',
              linkId: newEvent.id
            }
          });
        }
      } catch (notifErr) {
        console.error('[Notification Trigger Error]', notifErr);
      }
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_CALENDAR_EVENT',
      targetTable: 'calendar_events',
      targetId: newEvent.id,
      payload: newEvent
    });

    return newEvent;
  }

  async updateEvent(id, hospitalId, data, userContext) {
    const existing = await this.getEventById(id, hospitalId);

    // Guard: If rescheduling (changing times), check linked estimate approval
    if (data.startTime || data.endTime) {
      const linkedEstimate = await this.prisma.estimate.findFirst({
        where: { eventId: id, hospitalId, isActive: true }
      });
      if (linkedEstimate && linkedEstimate.status !== 'APPROVED' && linkedEstimate.status !== 'LOCKED') {
        const err = new Error(
          `Cannot reschedule: linked estimate ${linkedEstimate.estimateNumber} is in ${linkedEstimate.status} status. A Doctor must approve the estimate before the surgery can be rescheduled.`
        );
        err.status = 400;
        err.code = 'ERR_ESTIMATE_NOT_APPROVED';
        throw err;
      }
    }

    // Conflict Detection
    let conflictWarningMsg = null;
    if (data.doctorId || data.otRoomId || data.startTime || data.endTime || data.recurrenceRule !== undefined) {
      const docId = data.doctorId !== undefined ? data.doctorId : existing.doctorId;
      const roomId = data.otRoomId !== undefined ? data.otRoomId : existing.otRoomId;
      const start = data.startTime ? new Date(data.startTime) : new Date(existing.startTime);
      const end = data.endTime ? new Date(data.endTime) : new Date(existing.endTime);
      const rRule = data.recurrenceRule !== undefined ? data.recurrenceRule : existing.recurrenceRule;

      if (!data.forceCreate) {
        const conflict = await this.detectConflict(hospitalId, id, docId, roomId, start, end, rRule);
        if (conflict) {
          const err = new Error(conflict.message);
          err.status = 409;
          err.code = conflict.code;
          err.conflictWarning = true;
          throw err;
        }
      } else {
        const conflict = await this.detectConflict(hospitalId, id, docId, roomId, start, end, rRule);
        if (conflict) {
          conflictWarningMsg = conflict.message;
        }
      }
    }

    const finalStart = data.startTime ? new Date(data.startTime) : new Date(existing.startTime);
    const finalEnd = data.endTime ? new Date(data.endTime) : new Date(existing.endTime);
    const durationMinutes = Math.round((finalEnd - finalStart) / 60000);

    const updatePayload = {
      priority: data.forceCreate ? 'LOW' : existing.priority,
      title: data.title,
      eventType: data.eventType,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      doctorId: data.doctorId !== undefined ? data.doctorId : undefined,
      assistantSurgeonId: data.assistantSurgeonId !== undefined ? data.assistantSurgeonId : undefined,
      otRoomId: data.otRoomId !== undefined ? data.otRoomId : undefined,
      patientId: data.patientId !== undefined ? data.patientId : undefined,
      recurrenceRule: data.recurrenceRule !== undefined ? data.recurrenceRule : undefined,
      location: data.location !== undefined ? data.location : undefined,
      description: data.description !== undefined ? data.description : undefined,
      surgeryId: data.surgeryId !== undefined ? data.surgeryId : undefined,
      surgeryCost: data.surgeryCost !== undefined ? (data.surgeryCost !== null ? Number(data.surgeryCost) : null) : undefined,
      durationMinutes,
      diagnoses: data.diagnoses !== undefined ? data.diagnoses : undefined
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    await this.repository.update(id, hospitalId, updatePayload);
    const updated = await this.getEventById(id, hospitalId);

    // --- Trigger Notifications for Conflict Override ---
    if (conflictWarningMsg) {
      try {
        const notifyUsers = new Set([userContext.userId]);
        const finalDocId = data.doctorId !== undefined ? data.doctorId : existing.doctorId;
        if (finalDocId) {
          const doctorObj = await this.prisma.doctor.findFirst({
            where: { id: finalDocId, hospitalId }
          });
          if (doctorObj && doctorObj.userId) {
            notifyUsers.add(doctorObj.userId);
          }
        }
        for (const uid of notifyUsers) {
          await this.prisma.notification.create({
            data: {
              hospitalId,
              userId: uid,
              title: 'Schedule Conflict Override',
              message: `Event "${updated.title}" was updated overriding a conflict: ${conflictWarningMsg}`,
              type: 'EVENT_CONFLICT',
              linkId: updated.id
            }
          });
        }
      } catch (notifErr) {
        console.error('[Notification Trigger Error]', notifErr);
      }
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_CALENDAR_EVENT',
      targetTable: 'calendar_events',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async transitionStatus(id, hospitalId, status, userContext) {
    const existing = await this.getEventById(id, hospitalId);

    // Validate workflow state machine transitions
    const validTransitions = {
      PENDING: ['APPROVED', 'CANCELLED', 'POSTPONED'],
      APPROVED: ['COMPLETED', 'CANCELLED', 'POSTPONED'],
      CANCELLED: [],
      COMPLETED: [],
      POSTPONED: []
    };

    if (!validTransitions[existing.eventStatus].includes(status)) {
      const err = new Error(`Invalid event status transition from ${existing.eventStatus} to ${status}.`);
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS_TRANSITION';
      throw err;
    }

    if (status === 'COMPLETED' && existing.eventType === 'SURGERY') {
      const estimate = existing.estimate;
      if (!estimate) {
        const err = new Error('Cannot complete surgery event: No surgery estimate has been created yet.');
        err.status = 400;
        err.code = 'ERR_NO_ESTIMATE';
        throw err;
      }
      if (estimate.status !== 'APPROVED' && estimate.status !== 'LOCKED') {
        const err = new Error(`Cannot complete surgery event: The surgery estimate is in ${estimate.status} status. It must be APPROVED or LOCKED before completing the event.`);
        err.status = 400;
        err.code = 'ERR_ESTIMATE_NOT_FINISHED';
        throw err;
      }
    }

    const updateData = { eventStatus: status };
    if (status === 'APPROVED') {
      updateData.approvedBy = userContext.userId;
      updateData.approvedAt = new Date();
    }

    await this.repository.update(id, hospitalId, updateData);
    const updated = await this.getEventById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: `TRANSITION_EVENT_TO_${status}`,
      targetTable: 'calendar_events',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async postponeEvent(id, hospitalId, data, userContext) {
    const existing = await this.getEventById(id, hospitalId);

    if (existing.eventStatus === 'COMPLETED' || existing.eventStatus === 'CANCELLED' || existing.eventStatus === 'POSTPONED') {
      const err = new Error(`Cannot postpone an event that is already ${existing.eventStatus}.`);
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS_TRANSITION';
      throw err;
    }

    if (!data.startTime || !data.endTime) {
      const err = new Error(`startTime and endTime are required to postpone an event.`);
      err.status = 400;
      err.code = 'ERR_MISSING_DATETIME';
      throw err;
    }

    // Use transaction to ensure both status update and new event creation succeed
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark existing event as POSTPONED and append to description
      const originalDesc = existing.description || '';
      const postponedMsg = `\n\n[Postponed to: ${new Date(data.startTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}]`;
      const newDesc = originalDesc + postponedMsg;

      const updatedOriginal = await tx.calendarEvent.update({
        where: { id_hospitalId: { id, hospitalId } },
        data: { 
          eventStatus: 'POSTPONED',
          description: newDesc.trim()
        }
      });

      // 2. Create the new event
      const newEvent = await tx.calendarEvent.create({
        data: {
          hospitalId,
          eventType: existing.eventType,
          eventStatus: existing.eventStatus === 'APPROVED' ? 'APPROVED' : 'PENDING',
          priority: existing.priority,
          title: existing.title,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          durationMinutes: Math.round((new Date(data.endTime) - new Date(data.startTime)) / 60000),
          doctorId: existing.doctorId,
          assistantSurgeonId: existing.assistantSurgeonId,
          otRoomId: existing.otRoomId,
          patientId: existing.patientId,
          surgeryId: existing.surgeryId,
          location: existing.location,
          description: existing.description,
          surgeryCost: existing.surgeryCost,
          // Duplicate diagnoses
          diagnoses: {
            create: existing.diagnoses.map(d => ({
              diagnosisId: d.diagnosisId,
              notes: d.notes,
              hospitalId
            }))
          }
        },
        include: { doctor: true, patient: true, otRoom: true, diagnoses: { include: { diagnosis: true } } }
      });

      return { original: updatedOriginal, newEvent };
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'POSTPONE_CALENDAR_EVENT',
      targetTable: 'calendar_events',
      targetId: id,
      payload: { previous: existing, newEventId: result.newEvent.id, newStartTime: data.startTime }
    });

    return result.newEvent;
  }

  async softDeleteEvent(id, hospitalId, userContext) {
    await this.getEventById(id, hospitalId);

    await this.repository.update(id, hospitalId, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: userContext.userId
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'SOFT_DELETE_CALENDAR_EVENT',
      targetTable: 'calendar_events',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }

  // Returns a conflict descriptor { message, code } or null if no conflict.
  async detectConflict(hospitalId, eventId, doctorId, otRoomId, startTime, endTime, recurrenceRule) {
    if (!doctorId && !otRoomId) return null;

    const candidates = await this.repository.findConflictCandidates(hospitalId, doctorId, otRoomId, eventId);
    if (candidates.length === 0) return null;

    const windowStart = new Date(startTime);
    let windowEnd = new Date(startTime);
    windowEnd.setFullYear(windowEnd.getFullYear() + 1);

    if (recurrenceRule) {
      const parts = recurrenceRule.split(';').reduce((acc, part) => {
        const [key, val] = part.split('=');
        if (key && val) acc[key.toUpperCase()] = val;
        return acc;
      }, {});
      if (parts.UNTIL) {
        const uDate = new Date(parts.UNTIL.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        if (uDate < windowEnd) windowEnd = uDate;
      }
    } else {
      windowEnd = new Date(endTime);
    }

    const newOccurrences = getOccurrences(new Date(startTime), new Date(endTime), recurrenceRule, windowStart, windowEnd);

    for (const item of candidates) {
      const existingOccurrences = getOccurrences(
        new Date(item.startTime),
        new Date(item.endTime),
        item.recurrenceRule,
        windowStart,
        windowEnd
      );

      for (const newOcc of newOccurrences) {
        for (const existOcc of existingOccurrences) {
          const overlap = newOcc.startTime < existOcc.endTime && newOcc.endTime > existOcc.startTime;
          if (overlap) {
            const conflictTime = existOcc.startTime.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            if (doctorId && item.doctorId === doctorId) {
              return {
                message: `Doctor already has an event on ${conflictTime}. Do you want to schedule anyway?`,
                code: 'ERR_DOCTOR_CONFLICT'
              };
            }
            if (otRoomId && item.otRoomId === otRoomId) {
              return {
                message: `OT Room is already booked on ${conflictTime}. Do you want to schedule anyway?`,
                code: 'ERR_OT_ROOM_CONFLICT'
              };
            }
          }
        }
      }
    }

    return null;
  }

  // Kept for backward compat — now delegates to detectConflict
  async auditConflicts(hospitalId, eventId, doctorId, otRoomId, startTime, endTime, recurrenceRule) {
    const conflict = await this.detectConflict(hospitalId, eventId, doctorId, otRoomId, startTime, endTime, recurrenceRule);
    if (conflict) {
      const err = new Error(conflict.message);
      err.status = 409;
      err.code = conflict.code;
      err.conflictWarning = true;
      throw err;
    }
  }
}

module.exports = CalendarService;
