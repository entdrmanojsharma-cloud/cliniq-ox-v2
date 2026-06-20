/* 
  Purpose: Data Access Object for the Estimates Module.
  Responsibility: Handle Prisma queries, bulk transaction writes, and hospital isolation for estimates.
*/

class EstimatesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder, status, search, surgeonId, surgeryId, packageTemplateId, isPackage, startDate, endDate }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(status && { status }),
      ...(surgeonId && { surgeonId }),
      ...(packageTemplateId && { packageTemplateId }),
      ...(isPackage !== undefined && { isPackage: isPackage === 'true' || isPackage === true }),
      ...(surgeryId && {
        estimateSurgeries: {
          some: {
            surgeryId
          }
        }
      }),
      ...((startDate || endDate) && {
        scheduledDate: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }),
      ...(search && {
        OR: [
          { estimateNumber: { contains: search, mode: 'insensitive' } },
          { surgeryName: { contains: search, mode: 'insensitive' } },
          { packageName: { contains: search, mode: 'insensitive' } },
          { event: { title: { contains: search, mode: 'insensitive' } } },
          { event: { patient: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      })
    };

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' };

    const [estimates, total] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          event: {
            include: {
              patient: true,
              doctor: true
            }
          },
          room: true,
          surgeon: true,
          packageTemplate: true,
          estimateSurgeries: {
            include: {
              surgery: true
            }
          },
          estimateItems: true
        }
      }),
      this.prisma.estimate.count({ where })
    ]);

    return { estimates, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.estimate.findFirst({
      where: { id, hospitalId, isActive: true },
      include: {
        event: {
          include: {
            patient: true,
            doctor: true
          }
        },
        room: true,
        surgeon: true,
        packageTemplate: true,
        estimateSurgeries: {
          include: {
            surgery: true
          }
        },
        estimateItems: true,
        estimateVersions: {
          orderBy: { versionNumber: 'desc' }
        }
      }
    });
  }

  async findByEventId(eventId, hospitalId) {
    return this.prisma.estimate.findFirst({
      where: { eventId, hospitalId, isActive: true },
      include: {
        estimateSurgeries: true,
        estimateItems: true
      }
    });
  }

  async getLatestEstimateNumber(hospitalId) {
    return this.prisma.estimate.findFirst({
      where: { hospitalId },
      orderBy: { estimateNumber: 'desc' },
      select: { estimateNumber: true }
    });
  }

  async create(data) {
    const { surgeries, items, discountAmount, ...estimateData } = data;
    return this.prisma.$transaction(async (tx) => {
      return tx.estimate.create({
        data: {
          ...estimateData,
          estimateSurgeries: {
            create: surgeries.map((s) => ({
              surgeryId: s.surgeryId,
              durationMinutes: s.durationMinutes || 0,
              surgeryCost: s.surgeryCost || 0.00,
              discountType: s.discountType || 'PERCENTAGE',
              discountValue: s.discountValue || 0.00,
              discountAmount: s.discountAmount || 0.00,
              discountPct: s.discountPct || 0.00,
              finalAmount: s.finalAmount || 0.00
            }))
          },
          ...(items && items.length > 0 && {
            estimateItems: {
              create: items.map((item) => ({
                chargeCategory: item.chargeCategory,
                description: item.description,
                quantity: item.quantity || 1,
                rate: item.rate || 0.00,
                originalAmount: item.originalAmount || 0.00,
                discountType: item.discountType || 'FIXED_AMOUNT',
                discountValue: item.discountValue || 0.00,
                discountAmount: item.discountAmount || 0.00,
                amount: item.amount || 0.00,
                itemGroup: item.itemGroup || 'CUSTOM',
                isPrintable: item.isPrintable !== undefined ? item.isPrintable : true,
                isTaxable: item.isTaxable !== undefined ? item.isTaxable : true
              }))
            }
          })
        },
        include: {
          estimateSurgeries: {
            include: {
              surgery: true
            }
          },
          estimateItems: true
        }
      });
    }, { timeout: 20000 });
  }

  async update(id, hospitalId, data) {
    const { surgeries, items, discountAmount, ...estimateData } = data;
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete associated surgery records and custom items
      if (surgeries) {
        await tx.estimateSurgery.deleteMany({
          where: { estimateId: id }
        });
      }
      if (items) {
        await tx.estimateItem.deleteMany({
          where: { estimateId: id }
        });
      }

      // 2. Perform the update and recreate association maps
      return tx.estimate.update({
        where: { id, hospitalId },
        data: {
          ...estimateData,
          ...(surgeries && {
            estimateSurgeries: {
              create: surgeries.map((s) => ({
                surgeryId: s.surgeryId,
                durationMinutes: s.durationMinutes || 0,
                surgeryCost: s.surgeryCost || 0.00,
                discountType: s.discountType || 'PERCENTAGE',
                discountValue: s.discountValue || 0.00,
                discountAmount: s.discountAmount || 0.00,
                discountPct: s.discountPct || 0.00,
                finalAmount: s.finalAmount || 0.00
              }))
            }
          }),
          ...(items && {
            estimateItems: {
              create: items.map((item) => ({
                chargeCategory: item.chargeCategory,
                description: item.description,
                quantity: item.quantity || 1,
                rate: item.rate || 0.00,
                originalAmount: item.originalAmount || 0.00,
                discountType: item.discountType || 'FIXED_AMOUNT',
                discountValue: item.discountValue || 0.00,
                discountAmount: item.discountAmount || 0.00,
                amount: item.amount || 0.00,
                itemGroup: item.itemGroup || 'CUSTOM',
                isPrintable: item.isPrintable !== undefined ? item.isPrintable : true,
                isTaxable: item.isTaxable !== undefined ? item.isTaxable : true
              }))
            }
          })
        },
        include: {
          estimateSurgeries: {
            include: {
              surgery: true
            }
          },
          estimateItems: true
        }
      });
    }, { timeout: 20000 });
  }

  async createVersion(tx, data) {
    const client = tx || this.prisma;
    return client.estimateVersion.create({
      data
    });
  }

  async getLatestVersionNumber(estimateId) {
    const lastVersion = await this.prisma.estimateVersion.findFirst({
      where: { estimateId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true }
    });
    return lastVersion ? lastVersion.versionNumber : 0;
  }
}

module.exports = EstimatesRepository;
