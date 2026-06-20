/* 
  Purpose: Data Access Object for the Authentication Module.
  Responsibility: Map Prisma user and hospital queries with multi-hospital isolation.
*/

class AuthRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findUserByUsername(username) {
    return this.prisma.user.findUnique({
      where: { username },
      include: { hospital: true }
    });
  }

  async findHospitalByCode(code) {
    return this.prisma.hospitalProfile.findUnique({
      where: { code }
    });
  }

  async createUser(data) {
    return this.prisma.user.create({
      data
    });
  }
  async findUserById(userId) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}

module.exports = AuthRepository;
