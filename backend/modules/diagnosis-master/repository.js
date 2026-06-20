class DiagnosisMasterRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return this.prisma.diagnosisMaster.create({
      data,
      include: {
        procedures: {
          include: {
            surgery: true
          }
        }
      }
    });
  }

  async findById(id, hospitalId) {
    return this.prisma.diagnosisMaster.findFirst({
      where: {
        id,
        hospitalId,
        deletedAt: null
      },
      include: {
        procedures: {
          include: {
            surgery: true
          }
        }
      }
    });
  }

  async findByCode(hospitalId, diagnosisCode) {
    return this.prisma.diagnosisMaster.findFirst({
      where: {
        hospitalId,
        diagnosisCode,
        deletedAt: null
      }
    });
  }

  async list(hospitalId) {
    return this.prisma.diagnosisMaster.findMany({
      where: {
        hospitalId,
        deletedAt: null
      },
      include: {
        procedures: {
          include: {
            surgery: true
          }
        }
      },
      orderBy: {
        diagnosisName: 'asc'
      }
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.diagnosisMaster.updateMany({
      where: { id, hospitalId },
      data
    });
  }

  async delete(id, hospitalId, deletedBy) {
    return this.prisma.diagnosisMaster.updateMany({
      where: { id, hospitalId },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false
      }
    });
  }

  async setProcedures(diagnosisId, procedureIdsWithDefault) {
    // procedureIdsWithDefault should be an array of { surgeryId, isDefault }
    // Delete existing mappings
    await this.prisma.diagnosisProcedure.deleteMany({
      where: { diagnosisId }
    });
    
    // Add new mappings
    if (procedureIdsWithDefault && procedureIdsWithDefault.length > 0) {
      const data = procedureIdsWithDefault.map(p => ({
        diagnosisId,
        surgeryId: p.surgeryId,
        isDefault: p.isDefault || false
      }));
      await this.prisma.diagnosisProcedure.createMany({
        data
      });
    }
  }
}

module.exports = DiagnosisMasterRepository;
