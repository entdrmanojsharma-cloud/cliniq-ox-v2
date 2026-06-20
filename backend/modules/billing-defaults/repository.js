/* 
  Purpose: Data Access Object for the Billing Defaults Module.
  Responsibility: Handle Prisma queries and writes for the billing defaults configuration.
*/

class BillingDefaultsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findByHospitalId(hospitalId) {
    return this.prisma.billingDefaults.findUnique({
      where: { hospitalId }
    });
  }

  async create(data) {
    return this.prisma.billingDefaults.create({
      data
    });
  }

  async update(hospitalId, data) {
    return this.prisma.billingDefaults.update({
      where: { hospitalId },
      data
    });
  }
}

module.exports = BillingDefaultsRepository;
