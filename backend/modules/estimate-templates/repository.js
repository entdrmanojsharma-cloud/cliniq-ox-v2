/* 
  Purpose: Data Access Object for the Estimate Templates Module.
  Responsibility: Handle Prisma queries and database action handlers for templates.
  Supports FIXED_PACKAGE and DETAILED template types with associated package metadata fields.
*/

class EstimateTemplatesRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAndCount({ hospitalId, skip, take, visibility, templateType, search }) {
    const where = {
      hospitalId,
      isActive: true,
      ...(visibility && { visibility }),
      ...(templateType && { templateType }),
      ...(search && {
        templateName: { contains: search, mode: 'insensitive' }
      })
    };

    const [templates, total] = await Promise.all([
      this.prisma.estimateTemplate.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          templateItems: true
        }
      }),
      this.prisma.estimateTemplate.count({ where })
    ]);

    return { templates, total };
  }

  async findById(id, hospitalId) {
    return this.prisma.estimateTemplate.findFirst({
      where: { id, hospitalId, isActive: true },
      include: {
        templateItems: true
      }
    });
  }

  async findByName(templateName, hospitalId) {
    return this.prisma.estimateTemplate.findFirst({
      where: { templateName, hospitalId, isActive: true }
    });
  }

  async create(data) {
    const { templateItems, ...templateData } = data;
    return this.prisma.$transaction(async (tx) => {
      return tx.estimateTemplate.create({
        data: {
          hospitalId:   templateData.hospitalId,
          templateName: templateData.templateName,
          createdBy:    templateData.createdBy,
          visibility:   templateData.visibility   || 'GLOBAL',
          templateType: templateData.templateType || 'DETAILED',
          packagePrice: templateData.packagePrice != null ? templateData.packagePrice : null,
          packageNotes: templateData.packageNotes || null,
          includedItems: templateData.includedItems || null,
          isActive:     templateData.isActive !== undefined ? templateData.isActive : true,
          templateItems: {
            create: (templateItems || []).map((item) => ({
              itemType:        item.itemType,
              description:     item.description,
              defaultQuantity: item.defaultQuantity || 1,
              defaultRate:     item.defaultRate || 0.00,
              discountType:    item.discountType || null,
              discountValue:   item.discountValue || 0.00,
              itemGroup:       item.itemGroup || null,
              isPrintable:     item.isPrintable !== undefined ? item.isPrintable : true,
              isTaxable:       item.isTaxable !== undefined ? item.isTaxable : true
            }))
          }
        },
        include: {
          templateItems: true
        }
      });
    }, { timeout: 20000 });
  }

  async update(id, hospitalId, data) {
    const { templateItems, ...templateData } = data;
    return this.prisma.$transaction(async (tx) => {
      if (templateItems) {
        await tx.estimateTemplateItem.deleteMany({
          where: { templateId: id }
        });
      }

      // Build update payload from provided fields only
      const updatePayload = {};
      if (templateData.templateName  !== undefined) updatePayload.templateName  = templateData.templateName;
      if (templateData.visibility    !== undefined) updatePayload.visibility    = templateData.visibility;
      if (templateData.templateType  !== undefined) updatePayload.templateType  = templateData.templateType;
      if (templateData.packagePrice  !== undefined) updatePayload.packagePrice  = templateData.packagePrice;
      if (templateData.packageNotes  !== undefined) updatePayload.packageNotes  = templateData.packageNotes;
      if (templateData.includedItems !== undefined) updatePayload.includedItems = templateData.includedItems;
      if (templateData.isActive      !== undefined) updatePayload.isActive      = templateData.isActive;

      return tx.estimateTemplate.update({
        where: { id, hospitalId },
        data: {
          ...updatePayload,
          ...(templateItems && {
            templateItems: {
              create: templateItems.map((item) => ({
                itemType:        item.itemType,
                description:     item.description,
                defaultQuantity: item.defaultQuantity || 1,
                defaultRate:     item.defaultRate || 0.00,
                discountType:    item.discountType || null,
                discountValue:   item.discountValue || 0.00,
                itemGroup:       item.itemGroup || null,
                isPrintable:     item.isPrintable !== undefined ? item.isPrintable : true,
                isTaxable:       item.isTaxable !== undefined ? item.isTaxable : true
              }))
            }
          })
        },
        include: {
          templateItems: true
        }
      });
    }, { timeout: 20000 });
  }
}

module.exports = EstimateTemplatesRepository;
