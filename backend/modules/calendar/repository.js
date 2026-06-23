/* 
  Purpose: Data Access Object for the Calendar Events Module.
  Responsibility: Provide querying interfaces for scheduler slots, status overrides, and candidate fetching for overlap audits.
*/

class CalendarRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder, startFrom, startTo, doctorId, otRoomId, patientId, eventType, eventStatus, search }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(startFrom && { startTime: { gte: new Date(startFrom) } }),
      ...(startTo && { startTime: { lte: new Date(startTo) } }),
      ...(doctorId && { doctorId }),
      ...(otRoomId && { otRoomId }),
      ...(patientId && { patientId }),
      ...(eventType && { eventType }),
      ...(eventStatus && { eventStatus })
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { uhid: { contains: search, mode: 'insensitive' } } },
        { patient: { mobile: { contains: search, mode: 'insensitive' } } },
        { doctor: { firstName: { contains: search, mode: 'insensitive' } } },
        { doctor: { lastName: { contains: search, mode: 'insensitive' } } },
        { surgery: { surgeryName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { startTime: 'asc' };

    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          doctor: {
            select: { firstName: true, lastName: true, specialty: true }
          },
          assistantSurgeon: {
            select: { firstName: true, lastName: true, specialty: true }
          },
          patient: {
            select: { name: true, uhid: true, dateOfBirth: true, gender: true }
          },
          otRoom: {
            select: { roomName: true }
          },
          surgery: {
            select: { id: true, surgeryCode: true, surgeryName: true, category: true, defaultSurgeonFee: true }
          },
          estimate: {
            include: {
              estimateSurgeries: {
                include: { surgery: true }
              }
            }
          }
        }
      }),
      this.prisma.calendarEvent.count({ where })
    ]);

    return { events, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.calendarEvent.findFirst({
      where: { id, hospitalId, isActive: true },
      include: {
        doctor: true,
        assistantSurgeon: true,
        patient: true,
        otRoom: true,
        surgery: true,
        estimate: true
      }
    });
  }

  async findConflictCandidates(hospitalId, doctorId, otRoomId, excludeId) {
    return this.prisma.calendarEvent.findMany({
      where: {
        hospitalId,
        isActive: true,
        eventStatus: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          ...(doctorId ? [{ doctorId }] : []),
          ...(otRoomId ? [{ otRoomId }] : [])
        ]
      }
    });
  }

  async create(data) {
    return this.prisma.calendarEvent.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.calendarEvent.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }
}

module.exports = CalendarRepository;
