/* 
  Purpose: Data Access Object for the Hospital Profile Module.
  Responsibility: Interface database actions for hospital configurations.
*/

class HospitalProfileRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findById(id) {
    return this.prisma.hospitalProfile.findUnique({
      where: { id }
    });
  }

  async update(id, data) {
    return this.prisma.hospitalProfile.update({
      where: { id },
      data
    });
  }
}

module.exports = HospitalProfileRepository;
