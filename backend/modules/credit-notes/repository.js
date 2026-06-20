/* 
  Purpose: Define Database Access Repository for Credit Notes.
  Responsibility: Interface with Prisma client to perform CRUD operations on credit note records.
*/

class CreditNotesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, search }) {
    const where = { hospitalId };
    if (search) {
      where.creditNoteNumber = { contains: search, mode: 'insensitive' };
    }

    const [creditNotes, total] = await this.prisma.$transaction([
      this.prisma.creditNote.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: true
        }
      }),
      this.prisma.creditNote.count({ where })
    ]);

    return { creditNotes, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.creditNote.findFirst({
      where: { id, hospitalId },
      include: {
        invoice: true,
        creditNoteItems: true
      }
    });
  }

  async create(data) {
    const { creditNoteItems, ...creditNoteData } = data;
    return this.prisma.creditNote.create({
      data: {
        ...creditNoteData,
        creditNoteItems: {
          create: creditNoteItems
        }
      },
      include: {
        creditNoteItems: true
      }
    });
  }

  async findManyByInvoiceId(invoiceId) {
    return this.prisma.creditNote.findMany({
      where: { invoiceId },
      include: {
        creditNoteItems: true
      }
    });
  }
}

module.exports = CreditNotesRepository;
