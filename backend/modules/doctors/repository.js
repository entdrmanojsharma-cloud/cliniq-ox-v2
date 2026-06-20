/* 
  Purpose: Data Access Object for the Doctors Module.
  Responsibility: Handle doctor profile queries with pagination, sorting, soft-delete, and tenancy scope check.
*/

class DoctorsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, sortBy, sortOrder, specialty }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(specialty && { specialty: { contains: specialty, mode: 'insensitive' } })
    };

    const orderBy = sortBy ? { [sortBy]: sortOrder || 'asc' } : { firstName: 'asc' };

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: {
              username: true,
              role: true
            }
          }
        }
      }),
      this.prisma.doctor.count({ where })
    ]);

    return { doctors, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.doctor.findFirst({
      where: {
        id,
        hospitalId,
        isActive: true
      },
      include: {
        user: {
          select: {
            username: true,
            role: true
          }
        }
      }
    });
  }

  async findByUserId(userId, hospitalId) {
    return this.prisma.doctor.findFirst({
      where: {
        userId,
        hospitalId,
        isActive: true
      }
    });
  }

  async create(data) {
    return this.prisma.doctor.create({
      data
    });
  }

  async update(id, hospitalId, data) {
    return this.prisma.doctor.updateMany({
      where: { id, hospitalId, isActive: true },
      data
    });
  }
}

module.exports = DoctorsRepository;
