/* 
  Purpose: Data Access Object for the Patients Module.
  Responsibility: Handle patient CRUD queries with pagination, sorting, soft-delete, and tenancy scope check.
*/

class PatientsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder, mobile, search, pmjay }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(mobile && { mobile })
    };

    const conditions = [];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { uhid: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (pmjay === 'pmjay') {
      conditions.push({
        AND: [
          { pmjayNumber: { not: null } },
          { pmjayNumber: { not: '' } }
        ]
      });
    } else if (pmjay === 'others') {
      conditions.push({
        OR: [
          { pmjayNumber: null },
          { pmjayNumber: '' }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          consultingDoctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      this.prisma.patient.count({ where })
    ]);

    return { patients, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.patient.findFirst({
      where: {
        id,
        hospitalId,
        isActive: true
      },
      include: {
        consultingDoctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  async create(data) {
    return this.prisma.patient.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.patient.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }

  async getLatestUHID(hospitalId, yearPrefix) {
    return this.prisma.patient.findFirst({
      where: {
        hospitalId,
        uhid: {
          contains: `-${yearPrefix}-`
        }
      },
      orderBy: {
        uhid: 'desc'
      },
      select: {
        uhid: true
      }
    });
  }
}

module.exports = PatientsRepository;
