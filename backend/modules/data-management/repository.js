/*
  Purpose: Data Access Object for the Master Data Import System (Data Management).
  Responsibility: Fetch history logs, check database record existences for validation, and run transaction imports.
*/

class DataManagementRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findHistory({ hospitalId, importType }) {
    return this.prisma.importHistory.findMany({
      where: {
        hospitalId,
        ...(importType && { importType })
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  async createHistory(data) {
    return this.prisma.importHistory.create({
      data
    });
  }

  async findSurgeriesByCodes(surgeryCodes, hospitalId) {
    return this.prisma.surgeryMaster.findMany({
      where: {
        hospitalId,
        surgeryCode: { in: surgeryCodes },
        isActive: true
      }
    });
  }

  async findDiagnosesByCodes(diagnosisCodes, hospitalId) {
    return this.prisma.diagnosisMaster.findMany({
      where: {
        hospitalId,
        diagnosisCode: { in: diagnosisCodes },
        isActive: true
      }
    });
  }

  async findUsersByUsernames(usernames) {
    return this.prisma.user.findMany({
      where: {
        username: { in: usernames }
      },
      include: {
        doctorProfile: true
      }
    });
  }
}

module.exports = DataManagementRepository;
