/* 
  Purpose: Database access repository for the Documents Module.
  Responsibility: Fetch complete transaction graphs and coordinate with Prisma.
*/

class DocumentsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getEstimateGraph(id, hospitalId) {
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
        estimateSurgeries: {
          include: {
            surgery: true
          }
        },
        estimateItems: {
          where: { isActive: true }
        }
      }
    });
  }

  async createDocumentGeneration(data) {
    return this.prisma.documentGeneration.create({
      data
    });
  }
}

module.exports = DocumentsRepository;
