/* 
  Purpose: Business service orchestration layer for the Estimates Module.
  Responsibility: Enforce calculation breakdowns, versioning snapshots, billing protection, and template mapping.
*/

const writeAuditLog = require('../../shared/audit');
const generateSequenceNumber = require('../../shared/sequence');

class EstimatesService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getEstimates(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { estimates, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status,
      search: query.search,
      surgeonId: query.surgeonId,
      surgeryId: query.surgeryId,
      packageTemplateId: query.packageTemplateId,
      isPackage: query.isPackage,
      startDate: query.startDate,
      endDate: query.endDate
    });

    return {
      estimates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getEstimateById(id, hospitalId) {
    const estimate = await this.repository.findById(id, hospitalId);
    if (!estimate) {
      const err = new Error('Estimate record not found.');
      err.status = 404;
      err.code = 'ERR_ESTIMATE_NOT_FOUND';
      throw err;
    }
    return estimate;
  }

  async createEstimate(hospitalId, data, userContext) {
    // 1. Generate unique estimate number
    const estimateNumber = await generateSequenceNumber(this.prisma, hospitalId, 'ESTIMATE');

    // Auto-fetch event attributes if not provided
    if (data.eventId) {
      const event = await this.prisma.calendarEvent.findFirst({
        where: { id: data.eventId, hospitalId, isActive: true }
      });
      if (event) {
        if (data.surgeonId === undefined) data.surgeonId = event.doctorId;
        if (data.scheduledDate === undefined) data.scheduledDate = event.startTime;
        if (data.surgeryName === undefined) data.surgeryName = event.title;
        if (data.expectedDurationMinutes === undefined) data.expectedDurationMinutes = event.durationMinutes || 0;
      }
    }

    // 2. Resolve default rates and run calculation engine
    const calculated = await this.performCalculations(hospitalId, data, null);

    // 3. Save to database
    const newEstimate = await this.repository.create({
      hospitalId,
      estimateNumber,
      eventId: data.eventId,
      status: 'DRAFT',
      billingStatus: 'UNBILLED',
      surgeonId: data.surgeonId || null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      surgeryName: data.surgeryName || null,
      isPackage: data.isPackage || false,
      packageName: data.packageName || null,
      packagePrice: data.packagePrice || null,
      packageIncludes: data.packageIncludes || null,
      packageTemplateId: data.packageTemplateId || null,
      ...calculated
    });

    await this._handleDiscountCodeAfterSave(this.prisma, hospitalId, newEstimate, data, userContext);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_ESTIMATE',
      targetTable: 'estimates',
      targetId: newEstimate.id,
      payload: newEstimate
    });

    return newEstimate;
  }

  async updateEstimate(id, hospitalId, data, userContext) {
    const existing = await this.getEstimateById(id, hospitalId);

    // 1. Billing Protection Check
    if (existing.billingStatus !== 'UNBILLED') {
      const err = new Error('Estimate cannot be modified because billing has already initiated.');
      err.status = 400;
      err.code = 'ERR_BILLING_PROTECTED';
      throw err;
    }

    // 2. Check if APPROVED or LOCKED to trigger version snapshot
    if (existing.status === 'APPROVED' || existing.status === 'LOCKED') {
      // Create version snapshot first
      const lastVersionNum = await this.repository.getLatestVersionNumber(id);
      
      const snapshot = {
        estimate: {
          id: existing.id,
          estimateNumber: existing.estimateNumber,
          eventId: existing.eventId,
          roomId: existing.roomId,
          status: existing.status,
          billingStatus: existing.billingStatus,
          expectedDurationMinutes: existing.expectedDurationMinutes,
          expectedStayDays: existing.expectedStayDays,
          icuDays: existing.icuDays,
          icuDailyRate: existing.icuDailyRate,
          calculatedOtCharge: existing.calculatedOtCharge,
          actualOtCharge: existing.actualOtCharge,
          otDiscountType: existing.otDiscountType,
          otDiscountValue: existing.otDiscountValue,
          otDiscountAmount: existing.otDiscountAmount,
          calculatedAnaesthesiaCharge: existing.calculatedAnaesthesiaCharge,
          actualAnaesthesiaCharge: existing.actualAnaesthesiaCharge,
          anaesthesiaDiscountPct: existing.anaesthesiaDiscountPct,
          anaesthesiaDiscountType: existing.anaesthesiaDiscountType,
          anaesthesiaDiscountValue: existing.anaesthesiaDiscountValue,
          anaesthesiaDiscountAmount: existing.anaesthesiaDiscountAmount,
          roomDailyRate: existing.roomDailyRate,
          roomOriginalAmount: existing.roomOriginalAmount,
          roomDiscountType: existing.roomDiscountType,
          roomDiscountValue: existing.roomDiscountValue,
          roomDiscountAmount: existing.roomDiscountAmount,
          roomFinalAmount: existing.roomFinalAmount,
          nursingDailyRate: existing.nursingDailyRate,
          nursingOriginalAmount: existing.nursingOriginalAmount,
          nursingDiscountType: existing.nursingDiscountType,
          nursingDiscountValue: existing.nursingDiscountValue,
          nursingDiscountAmount: existing.nursingDiscountAmount,
          nursingFinalAmount: existing.nursingFinalAmount,
          icuOriginalAmount: existing.icuOriginalAmount,
          icuDiscountType: existing.icuDiscountType,
          icuDiscountValue: existing.icuDiscountValue,
          icuDiscountAmount: existing.icuDiscountAmount,
          icuFinalAmount: existing.icuFinalAmount,
          serviceDailyRate: existing.serviceDailyRate,
          serviceOriginalAmount: existing.serviceOriginalAmount,
          serviceDiscountType: existing.serviceDiscountType,
          serviceDiscountValue: existing.serviceDiscountValue,
          serviceDiscountAmount: existing.serviceDiscountAmount,
          serviceFinalAmount: existing.serviceFinalAmount,
          subtotal: existing.subtotal,
          discount: existing.discount,
          discountType: existing.discountType,
          discountValue: existing.discountValue,
          taxableAmount: existing.taxableAmount,
          gstRate: existing.gstRate,
          gstAmount: existing.gstAmount,
          grandTotal: existing.grandTotal,
          surgeonId: existing.surgeonId,
          scheduledDate: existing.scheduledDate,
          surgeryName: existing.surgeryName,
          isPackage: existing.isPackage,
          packageName: existing.packageName,
          packagePrice: existing.packagePrice,
          packageIncludes: existing.packageIncludes,
          packageTemplateId: existing.packageTemplateId,
          approvalRemark: existing.approvalRemark
        },
        estimateSurgeries: existing.estimateSurgeries,
        estimateItems: existing.estimateItems
      };

      const calculatedNew = await this.performCalculations(hospitalId, { ...existing, ...data }, existing);

      await this.repository.createVersion(null, {
        estimateId: id,
        versionNumber: lastVersionNum + 1,
        createdBy: userContext.userId,
        previousTotal: existing.grandTotal,
        newTotal: calculatedNew.grandTotal,
        changeSummary: `Estimate updated in ${existing.status} status.`,
        changeReason: data.changeReason || 'Clinical update',
        snapshot
      });

      // Reset status to DRAFT
      data.status = 'DRAFT';
    }

    // 3. Recalculate
    const calculated = await this.performCalculations(hospitalId, { ...existing, ...data }, existing);

    // 4. Save update
    const updatedEstimate = await this.repository.update(id, hospitalId, {
      surgeonId: data.surgeonId !== undefined ? data.surgeonId : existing.surgeonId,
      scheduledDate: data.scheduledDate !== undefined ? (data.scheduledDate ? new Date(data.scheduledDate) : null) : existing.scheduledDate,
      surgeryName: data.surgeryName !== undefined ? data.surgeryName : existing.surgeryName,
      isPackage: data.isPackage !== undefined ? data.isPackage : existing.isPackage,
      packageName: data.packageName !== undefined ? data.packageName : existing.packageName,
      packagePrice: data.packagePrice !== undefined ? data.packagePrice : existing.packagePrice,
      packageIncludes: data.packageIncludes !== undefined ? data.packageIncludes : existing.packageIncludes,
      packageTemplateId: data.packageTemplateId !== undefined ? data.packageTemplateId : existing.packageTemplateId,
      ...calculated,
      status: data.status || existing.status
    });

    await this._handleDiscountCodeAfterSave(this.prisma, hospitalId, updatedEstimate, data, userContext, existing);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_ESTIMATE',
      targetTable: 'estimates',
      targetId: id,
      payload: { previous: existing, updated: updatedEstimate }
    });

    return updatedEstimate;
  }

  async updateStatus(id, hospitalId, newStatus, remarks, userContext) {
    const existing = await this.getEstimateById(id, hospitalId);

    // Role gate: Only DOCTOR can approve or reject estimates
    if ((newStatus === 'APPROVED' || newStatus === 'REJECTED') && userContext.role !== 'DOCTOR') {
      const err = new Error('Only Doctor users can approve or reject estimates.');
      err.status = 403;
      err.code = 'ERR_APPROVAL_FORBIDDEN';
      throw err;
    }

    // 1. Billing Protection Check
    if (existing.billingStatus !== 'UNBILLED') {
      const err = new Error('Estimate status cannot be changed because billing has already initiated.');
      err.status = 400;
      err.code = 'ERR_BILLING_PROTECTED';
      throw err;
    }

    // 2. Validate Transitions
    const allowed = {
      DRAFT: ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'],
      PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['LOCKED', 'CANCELLED'],
      REJECTED: ['DRAFT', 'PENDING_APPROVAL', 'CANCELLED'],
      LOCKED: (userContext.role === 'DOCTOR') ? ['APPROVED'] : [],
      CANCELLED: []
    };

    if (!allowed[existing.status] || !allowed[existing.status].includes(newStatus)) {
      const err = new Error(`Invalid status transition from ${existing.status} to ${newStatus}.`);
      err.status = 400;
      err.code = 'ERR_INVALID_TRANSITION';
      throw err;
    }

    const updateData = { status: newStatus };
    if (newStatus === 'APPROVED') {
      updateData.approvedBy = userContext.userId;
      updateData.approvalDatetime = new Date();
      updateData.approvalRemark = remarks || null;
    } else if (newStatus === 'REJECTED') {
      updateData.approvalRemark = remarks || null;
    }

    await this.prisma.estimate.update({
      where: { id, hospitalId },
      data: updateData
    });

    // --- Trigger Notifications ---
    try {
      if (newStatus === 'PENDING_APPROVAL') {
        const doctors = await this.prisma.user.findMany({
          where: { hospitalId, role: 'DOCTOR', isActive: true }
        });
        const patientName = existing.event?.patient?.name || 'Unknown Patient';
        for (const doc of doctors) {
          await this.prisma.notification.create({
            data: {
              hospitalId,
              userId: doc.id,
              title: 'Estimate Approval Pending',
              message: `Estimate #${existing.estimateNumber} for patient ${patientName} is pending your approval.`,
              type: 'ESTIMATE_PENDING',
              linkId: existing.id
            }
          });
        }
      } else if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
        const event = existing.event;
        if (event && event.createdBy) {
          const statusText = newStatus === 'APPROVED' ? 'approved' : 'rejected';
          const doctorName = `Dr. ${userContext.firstName || ''} ${userContext.lastName || ''}`.trim() || 'A Doctor';
          const patientName = existing.event?.patient?.name || 'Unknown Patient';
          await this.prisma.notification.create({
            data: {
              hospitalId,
              userId: event.createdBy,
              title: `Estimate ${newStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
              message: `Estimate #${existing.estimateNumber} for patient ${patientName} has been ${statusText} by ${doctorName}.`,
              type: `ESTIMATE_${newStatus}`,
              linkId: existing.id
            }
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification Trigger Error]', notifErr);
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: `TRANSITION_ESTIMATE_STATUS_${newStatus}`,
      targetTable: 'estimates',
      targetId: id,
      payload: { id, previousStatus: existing.status, newStatus, remarks }
    });

    return { id, status: newStatus };
  }

  async createFromTemplate(hospitalId, data, userContext) {
    const template = await this.prisma.estimateTemplate.findFirst({
      where: { id: data.templateId, hospitalId, isActive: true },
      include: { templateItems: true }
    });

    if (!template) {
      const err = new Error('Estimate template not found.');
      err.status = 404;
      err.code = 'ERR_TEMPLATE_NOT_FOUND';
      throw err;
    }

    // Build the estimate creation payload from the template configurations
    const estimatePayload = {
      eventId: data.eventId,
      roomId: data.roomId || null,
      expectedDurationMinutes: data.expectedDurationMinutes || 0,
      expectedStayDays: data.expectedStayDays || 0,
      icuDays: data.icuDays || 0,
      gstRate: data.gstRate,
      surgeries: [],
      items: [],
      isPackage: template.templateType === 'FIXED_PACKAGE',
      packageName: template.templateType === 'FIXED_PACKAGE' ? template.templateName : null,
      packagePrice: template.templateType === 'FIXED_PACKAGE' ? Number(template.packagePrice) : null,
      packageIncludes: template.templateType === 'FIXED_PACKAGE' ? template.includedItems : null,
      packageTemplateId: template.id
    };

    for (const item of template.templateItems) {
      switch (item.itemType) {
        case 'SURGERY_FEE':
          estimatePayload.surgeries.push({
            surgeryId: item.description,
            surgeryCost: Number(item.defaultRate),
            discountType: item.discountType || 'PERCENTAGE',
            discountValue: Number(item.discountValue)
          });
          break;
        case 'OT_CHARGE':
          estimatePayload.actualOtCharge = Number(item.defaultRate);
          estimatePayload.otDiscountType = item.discountType || 'PERCENTAGE';
          estimatePayload.otDiscountValue = Number(item.discountValue);
          break;
        case 'ANAESTHESIA':
          estimatePayload.actualAnaesthesiaCharge = Number(item.defaultRate);
          estimatePayload.anaesthesiaDiscountType = item.discountType || 'PERCENTAGE';
          estimatePayload.anaesthesiaDiscountValue = Number(item.discountValue);
          break;
        case 'ROOM_CHARGE':
          estimatePayload.roomDailyRate = Number(item.defaultRate);
          estimatePayload.roomDiscountType = item.discountType || 'PERCENTAGE';
          estimatePayload.roomDiscountValue = Number(item.discountValue);
          break;
        case 'NURSING':
          estimatePayload.nursingDailyRate = Number(item.defaultRate);
          estimatePayload.nursingDiscountType = item.discountType || 'PERCENTAGE';
          estimatePayload.nursingDiscountValue = Number(item.discountValue);
          break;
        case 'ICU':
          estimatePayload.icuDailyRate = Number(item.defaultRate);
          estimatePayload.icuDiscountType = item.discountType || 'PERCENTAGE';
          estimatePayload.icuDiscountValue = Number(item.discountValue);
          break;
        case 'ADDITIONAL':
          estimatePayload.items.push({
            chargeCategory: 'ADDITIONAL',
            description: item.description,
            quantity: item.defaultQuantity,
            rate: Number(item.defaultRate),
            discountType: item.discountType || 'FIXED_AMOUNT',
            discountValue: Number(item.discountValue),
            itemGroup: item.itemGroup || 'ADDITIONAL',
            isPrintable: item.isPrintable !== false,
            isTaxable: item.isTaxable !== false
          });
          break;
      }
    }

    // Override template properties with any explicit payload customizations
    if (data.surgeries && data.surgeries.length > 0) {
      estimatePayload.surgeries = data.surgeries;
    }
    if (data.items && data.items.length > 0) {
      estimatePayload.items = data.items;
    }
    if (data.isPackage !== undefined) {
      estimatePayload.isPackage = data.isPackage;
    }
    if (data.packageName !== undefined) {
      estimatePayload.packageName = data.packageName;
    }
    if (data.packagePrice !== undefined) {
      estimatePayload.packagePrice = data.packagePrice;
    }
    if (data.packageIncludes !== undefined) {
      estimatePayload.packageIncludes = data.packageIncludes;
    }

    return this.createEstimate(hospitalId, estimatePayload, userContext);
  }

  async getVersions(estimateId, hospitalId) {
    await this.getEstimateById(estimateId, hospitalId);
    return this.prisma.estimateVersion.findMany({
      where: { estimateId },
      orderBy: { versionNumber: 'desc' }
    });
  }

  // Helper calculation engine
  async performCalculations(hospitalId, data, existingRecord) {
    const surgeries = data.surgeries || [];
    const items = data.items || [];
    const expectedStayDays = data.expectedStayDays || 0;
    const expectedDurationMinutes = data.expectedDurationMinutes || 0;
    const icuDays = data.icuDays || 0;

    // Step 4: Auto-load billing defaults for any rate not explicitly provided
    let billingDefaults = null;
    const needsDefaults = (
      data.actualOtCharge === undefined ||
      data.actualAnaesthesiaCharge === undefined ||
      data.roomDailyRate === undefined ||
      data.nursingDailyRate === undefined ||
      data.icuDailyRate === undefined ||
      data.serviceDailyRate === undefined
    );
    if (needsDefaults) {
      billingDefaults = await this.prisma.billingDefaults.findUnique({
        where: { hospitalId }
      });
    }

    // 1. Resolve Surgery Base Fees and calculate surgery discounts
    const resolvedSurgeries = [];
    let surgeriesTotalFinal = 0;

    for (const s of surgeries) {
      let cost = s.surgeryCost;
      if (cost === undefined || cost === null) {
        // Fetch default from SurgeryMaster
        const master = await this.prisma.surgeryMaster.findFirst({
          where: { id: s.surgeryId, hospitalId, isActive: true }
        });
        cost = master ? Number(master.defaultSurgeonFee) : 0.00;
      }

      const discType = s.discountType || 'PERCENTAGE';
      const discVal = s.discountValue || 0.00;
      let discAmt = 0.00;

      if (discType === 'PERCENTAGE') {
        discAmt = cost * (discVal / 100);
      } else {
        discAmt = discVal;
      }

      if (discAmt > cost) discAmt = cost;
      const finalAmt = cost - discAmt;

      // Compatibility bridges:
      const discountPct = discType === 'PERCENTAGE' ? discVal : (cost > 0 ? (discAmt / cost) * 100 : 0.00);

      resolvedSurgeries.push({
        surgeryId: s.surgeryId,
        durationMinutes: s.durationMinutes || 0,
        surgeryCost: cost,
        discountType: discType,
        discountValue: discVal,
        discountAmount: discAmt,
        discountPct,
        finalAmount: finalAmt
      });

      surgeriesTotalFinal += finalAmt;
    }

    // 2. OT Charges Calculation
    let otRoomRate = 0.00;
    // Resolve OT Hourly Charge if roomId or otRoomId is known
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: data.eventId, hospitalId, isActive: true }
    });
    if (event && event.otRoomId) {
      const otRoom = await this.prisma.otRoomMaster.findFirst({
        where: { id: event.otRoomId, hospitalId, isActive: true }
      });
      if (otRoom) {
        otRoomRate = Number(otRoom.defaultHourlyCharge);
      }
    }

    const calculatedOtCharge = (expectedDurationMinutes / 60) * otRoomRate;
    let actualOt = data.actualOtCharge;
    if (actualOt === undefined || actualOt === null) {
      // Use billing defaults OT charge if no room-based calculation and defaults available
      if (calculatedOtCharge === 0 && billingDefaults && Number(billingDefaults.otCharge) > 0) {
        actualOt = Number(billingDefaults.otCharge);
      } else {
        actualOt = calculatedOtCharge;
      }
    }

    const otDiscType = data.otDiscountType || 'PERCENTAGE';
    const otDiscVal = data.otDiscountValue || 0.00;
    let otDiscAmt = 0.00;
    if (otDiscType === 'PERCENTAGE') {
      otDiscAmt = actualOt * (otDiscVal / 100);
    } else {
      otDiscAmt = otDiscVal;
    }
    if (otDiscAmt > actualOt) otDiscAmt = actualOt;
    const otFinalAmt = actualOt - otDiscAmt;

    // 3. Anaesthesia Charges Calculation
    let anaesthesiaRate = 0.00;
    // Fetch default from HospitalChargeMaster under ANAESTHESIA category
    const anaesthCharge = await this.prisma.hospitalChargeMaster.findFirst({
      where: { hospitalId, chargeCategory: 'ANAESTHESIA', isActive: true }
    });
    if (anaesthCharge) {
      anaesthesiaRate = Number(anaesthCharge.defaultRate);
    }

    const calculatedAnaesthesiaCharge = (expectedDurationMinutes / 60) * anaesthesiaRate;
    let actualAnaesth = data.actualAnaesthesiaCharge;
    if (actualAnaesth === undefined || actualAnaesth === null) {
      // Use billing defaults GA charge if no master-based calculation and defaults available
      if (calculatedAnaesthesiaCharge === 0 && billingDefaults && Number(billingDefaults.gaCharge) > 0) {
        actualAnaesth = Number(billingDefaults.gaCharge);
      } else {
        actualAnaesth = calculatedAnaesthesiaCharge;
      }
    }

    const anaesthDiscType = data.anaesthesiaDiscountType || 'PERCENTAGE';
    const anaesthDiscVal = data.anaesthesiaDiscountValue || 0.00;
    let anaesthDiscAmt = 0.00;
    if (anaesthDiscType === 'PERCENTAGE') {
      anaesthDiscAmt = actualAnaesth * (anaesthDiscVal / 100);
    } else {
      anaesthDiscAmt = anaesthDiscVal;
    }
    if (anaesthDiscAmt > actualAnaesth) anaesthDiscAmt = actualAnaesth;
    const anaesthFinalAmt = actualAnaesth - anaesthDiscAmt;
    const anaesthesiaDiscountPct = anaesthDiscType === 'PERCENTAGE' ? anaesthDiscVal : (actualAnaesth > 0 ? (anaesthDiscAmt / actualAnaesth) * 100 : 0.00);

    // 4. Room / Bed Charges
    let roomDailyRate = data.roomDailyRate;
    if ((roomDailyRate === undefined || roomDailyRate === null) && data.roomId) {
      const room = await this.prisma.roomMaster.findFirst({
        where: { id: data.roomId, hospitalId, isActive: true }
      });
      roomDailyRate = room ? Number(room.defaultDailyCharge) : 0.00;
    } else if (roomDailyRate === undefined || roomDailyRate === null) {
      // Auto-load room charge from billing defaults
      roomDailyRate = billingDefaults ? Number(billingDefaults.roomCharge || 0) : 0.00;
    }

    const roomOriginalAmount = expectedStayDays === 0 ? roomDailyRate : expectedStayDays * roomDailyRate;
    const roomDiscType = data.roomDiscountType || 'PERCENTAGE';
    const roomDiscVal = data.roomDiscountValue || 0.00;
    let roomDiscAmt = 0.00;
    if (roomDiscType === 'PERCENTAGE') {
      roomDiscAmt = roomOriginalAmount * (roomDiscVal / 100);
    } else {
      roomDiscAmt = roomDiscVal;
    }
    if (roomDiscAmt > roomOriginalAmount) roomDiscAmt = roomOriginalAmount;
    const roomFinalAmount = roomOriginalAmount - roomDiscAmt;

    // 5. Nursing Charges
    const nursingDailyRate = (data.nursingDailyRate !== undefined && data.nursingDailyRate !== null)
      ? data.nursingDailyRate
      : (billingDefaults ? Number(billingDefaults.nursingCharge || 0) : 0.00);
    const nursingOriginalAmount = expectedStayDays * nursingDailyRate;
    const nursingDiscType = data.nursingDiscountType || 'PERCENTAGE';
    const nursingDiscVal = data.nursingDiscountValue || 0.00;
    let nursingDiscAmt = 0.00;
    if (nursingDiscType === 'PERCENTAGE') {
      nursingDiscAmt = nursingOriginalAmount * (nursingDiscVal / 100);
    } else {
      nursingDiscAmt = nursingDiscVal;
    }
    if (nursingDiscAmt > nursingOriginalAmount) nursingDiscAmt = nursingOriginalAmount;
    const nursingFinalAmount = nursingOriginalAmount - nursingDiscAmt;

    // 6. ICU Charges
    const icuDailyRate = (data.icuDailyRate !== undefined && data.icuDailyRate !== null)
      ? data.icuDailyRate
      : (billingDefaults ? Number(billingDefaults.icuCharge || 0) : 0.00);
    const icuOriginalAmount = icuDays * icuDailyRate;
    const icuDiscType = data.icuDiscountType || 'PERCENTAGE';
    const icuDiscVal = data.icuDiscountValue || 0.00;
    let icuDiscAmt = 0.00;
    if (icuDiscType === 'PERCENTAGE') {
      icuDiscAmt = icuOriginalAmount * (icuDiscVal / 100);
    } else {
      icuDiscAmt = icuDiscVal;
    }
    if (icuDiscAmt > icuOriginalAmount) icuDiscAmt = icuOriginalAmount;
    const icuFinalAmount = icuOriginalAmount - icuDiscAmt;

    // 7. Service Charges
    const serviceDailyRate = (data.serviceDailyRate !== undefined && data.serviceDailyRate !== null)
      ? data.serviceDailyRate
      : (billingDefaults ? Number(billingDefaults.monitoringCharge || 0) : 0.00);
    const serviceOriginalAmount = expectedStayDays * serviceDailyRate;
    const serviceDiscType = data.serviceDiscountType || 'PERCENTAGE';
    const serviceDiscVal = data.serviceDiscountValue || 0.00;
    let serviceDiscAmt = 0.00;
    if (serviceDiscType === 'PERCENTAGE') {
      serviceDiscAmt = serviceOriginalAmount * (serviceDiscVal / 100);
    } else {
      serviceDiscAmt = serviceDiscVal;
    }
    if (serviceDiscAmt > serviceOriginalAmount) serviceDiscAmt = serviceOriginalAmount;
    const serviceFinalAmount = serviceOriginalAmount - serviceDiscAmt;

    // 8. Custom Line Items (`estimate_items`)
    const resolvedItems = [];
    let taxableItemsTotalFinal = 0;
    let nonTaxableItemsTotalFinal = 0;

    for (const item of items) {
      const qty = item.quantity || 1;
      const rate = item.rate || 0.00;
      const originalAmount = qty * rate;
      const discType = item.discountType || 'FIXED_AMOUNT';
      const discVal = item.discountValue || 0.00;
      let discAmt = 0.00;

      if (discType === 'PERCENTAGE') {
        discAmt = originalAmount * (discVal / 100);
      } else {
        discAmt = discVal;
      }

      if (discAmt > originalAmount) discAmt = originalAmount;
      const amount = originalAmount - discAmt;

      const isPrintable = item.isPrintable !== false;
      const isTaxable = item.isTaxable !== false;

      resolvedItems.push({
        chargeCategory: item.chargeCategory,
        description: item.description,
        quantity: qty,
        rate,
        originalAmount,
        discountType: discType,
        discountValue: discVal,
        discountAmount: discAmt,
        amount,
        itemGroup: item.itemGroup || 'CUSTOM',
        isPrintable,
        isTaxable
      });

      if (isTaxable) {
        taxableItemsTotalFinal += amount;
      } else {
        nonTaxableItemsTotalFinal += amount;
      }
    }

    // 9. Subtotals and Global Discount
    let taxableSubtotal = surgeriesTotalFinal + otFinalAmt + anaesthFinalAmt + roomFinalAmount + nursingFinalAmount + icuFinalAmount + serviceFinalAmount + taxableItemsTotalFinal;
    const nonTaxableSubtotal = nonTaxableItemsTotalFinal;

    const isPackage = data.isPackage !== undefined ? data.isPackage : (existingRecord ? existingRecord.isPackage : false);
    if (isPackage) {
      const packagePrice = Number(data.packagePrice !== undefined ? data.packagePrice : (existingRecord ? existingRecord.packagePrice : 0));
      taxableSubtotal = packagePrice;
    }

    const subtotal = taxableSubtotal + nonTaxableSubtotal;

    let discountCodeRecord = null;
    let discountCodeBenefit = 0.00;

    if (data.discountCode) {
      const normalized = data.discountCode.toUpperCase().trim();
      discountCodeRecord = await this.prisma.discountCode.findUnique({
        where: {
          hospitalId_code: { hospitalId, code: normalized }
        }
      });
      if (discountCodeRecord && discountCodeRecord.status === 'ACTIVE') {
        const now = new Date();
        if (now >= discountCodeRecord.validFrom && now <= discountCodeRecord.validTo && discountCodeRecord.usageCount < discountCodeRecord.usageLimit) {
          if (discountCodeRecord.discountType === 'PERCENTAGE') {
            discountCodeBenefit = taxableSubtotal * (Number(discountCodeRecord.value) / 100);
          } else {
            discountCodeBenefit = Number(discountCodeRecord.value);
          }
          if (discountCodeBenefit > taxableSubtotal) {
            discountCodeBenefit = taxableSubtotal;
          }
        }
      }
    }

    const globalDiscType = discountCodeRecord ? discountCodeRecord.discountType : 'FIXED_AMOUNT';
    const globalDiscVal = discountCodeRecord ? Number(discountCodeRecord.value) : 0.00;
    const globalDiscAmt = discountCodeBenefit;

    const taxableAmount = taxableSubtotal - globalDiscAmt;

    // 10. GST & Grand Total
    let gstRate = data.gstRate;
    if (gstRate === undefined || gstRate === null) {
      const profile = await this.prisma.hospitalProfile.findUnique({
        where: { id: hospitalId }
      });
      gstRate = profile ? Number(profile.defaultGstRate) : 18.00;
    }

    const gstAmount = taxableAmount * (gstRate / 100);
    const grandTotal = taxableAmount + gstAmount + nonTaxableSubtotal;

    return {
      expectedStayDays,
      expectedDurationMinutes,
      icuDays,
      icuDailyRate,
      calculatedOtCharge,
      actualOtCharge: actualOt,
      otDiscountType: otDiscType,
      otDiscountValue: otDiscVal,
      otDiscountAmount: otDiscAmt,
      calculatedAnaesthesiaCharge,
      actualAnaesthesiaCharge: actualAnaesth,
      anaesthesiaDiscountPct,
      anaesthesiaDiscountType: anaesthDiscType,
      anaesthesiaDiscountValue: anaesthDiscVal,
      anaesthesiaDiscountAmount: anaesthDiscAmt,
      roomId: data.roomId || null,
      roomDailyRate,
      roomOriginalAmount,
      roomDiscountType: roomDiscType,
      roomDiscountValue: roomDiscVal,
      roomDiscountAmount: roomDiscAmt,
      roomFinalAmount,
      nursingDailyRate,
      nursingOriginalAmount,
      nursingDiscountType: nursingDiscType,
      nursingDiscountValue: nursingDiscVal,
      nursingDiscountAmount: nursingDiscAmt,
      nursingFinalAmount,
      icuOriginalAmount,
      icuDiscountType: icuDiscType,
      icuDiscountValue: icuDiscVal,
      icuDiscountAmount: icuDiscAmt,
      icuFinalAmount,
      serviceDailyRate,
      serviceOriginalAmount,
      serviceDiscountType: serviceDiscType,
      serviceDiscountValue: serviceDiscVal,
      serviceDiscountAmount: serviceDiscAmt,
      serviceFinalAmount,
      subtotal,
      discount: globalDiscAmt,
      discountType: globalDiscType,
      discountValue: globalDiscVal,
      discountAmount: globalDiscAmt,
      discountCode: discountCodeRecord ? discountCodeRecord.code : null,
      discountCodeBenefit,
      taxableAmount,
      gstRate,
      gstAmount,
      grandTotal,
      surgeries: resolvedSurgeries,
      items: resolvedItems
    };
  }

  async _handleDiscountCodeAfterSave(tx, hospitalId, estimate, data, userContext, existingEstimate = null) {
    if (estimate.discountCode) {
      if (existingEstimate && existingEstimate.discountCode === estimate.discountCode) {
        return;
      }

      const normalized = estimate.discountCode.toUpperCase().trim();
      const code = await tx.discountCode.findUnique({
        where: { hospitalId_code: { hospitalId, code: normalized } }
      });
      if (code) {
        await tx.discountCode.update({
          where: { id: code.id },
          data: { usageCount: { increment: 1 } }
        });

        let patientName = 'Unknown Patient';
        if (estimate.eventId) {
          const event = await tx.calendarEvent.findFirst({
            where: { id: estimate.eventId },
            include: { patient: true }
          });
          if (event && event.patient) {
            patientName = event.patient.name;
          }
        }

        let docName = null;
        if (code.doctorId) {
          const doc = await tx.doctor.findUnique({ where: { id: code.doctorId } });
          if (doc) {
            docName = `Dr. ${doc.firstName} ${doc.lastName}`;
          }
        }

        const user = await tx.user.findUnique({ where: { id: userContext.userId } });
        const appliedByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff';

        await tx.discountCodeAuditLog.create({
          data: {
            hospitalId,
            estimateId: estimate.id,
            estimateNumber: estimate.estimateNumber,
            patientName,
            codeApplied: code.code,
            discountAmount: estimate.discountCodeBenefit,
            appliedByUserId: userContext.userId,
            appliedByName,
            doctorId: code.doctorId,
            doctorName: docName
          }
        });
      }
    }
  }
}

module.exports = EstimatesService;
