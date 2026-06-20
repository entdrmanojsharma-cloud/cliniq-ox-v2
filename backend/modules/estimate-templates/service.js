/* 
  Purpose: Business service orchestration layer for the Estimate Templates Module.
  Responsibility: Enforce templates rules, active status checks, duplication maps, and soft deletes.
  Handles FIXED_PACKAGE and DETAILED template types with package metadata.
*/

const writeAuditLog = require('../../shared/audit');

class EstimateTemplatesService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getTemplates(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { templates, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      visibility: query.visibility,
      templateType: query.templateType,
      search: query.search
    });

    return {
      templates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTemplateById(id, hospitalId) {
    const template = await this.repository.findById(id, hospitalId);
    if (!template) {
      const err = new Error('Estimate template not found.');
      err.status = 404;
      err.code = 'ERR_TEMPLATE_NOT_FOUND';
      throw err;
    }
    return template;
  }

  async createTemplate(hospitalId, data, userContext) {
    const existing = await this.repository.findByName(data.templateName, hospitalId);
    if (existing) {
      const err = new Error('A template with this name already exists.');
      err.status = 409;
      err.code = 'ERR_TEMPLATE_NAME_EXISTS';
      throw err;
    }

    const newTemplate = await this.repository.create({
      hospitalId,
      templateName: data.templateName,
      createdBy: userContext.userId,
      visibility: data.visibility || 'GLOBAL',
      templateType: data.templateType || 'DETAILED',
      packagePrice: data.packagePrice || null,
      packageNotes: data.packageNotes || null,
      includedItems: data.includedItems || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      templateItems: data.templateItems
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_TEMPLATE',
      targetTable: 'estimate_templates',
      targetId: newTemplate.id,
      payload: newTemplate
    });

    return newTemplate;
  }

  async updateTemplate(id, hospitalId, data, userContext) {
    const existing = await this.getTemplateById(id, hospitalId);

    if (data.templateName && data.templateName !== existing.templateName) {
      const nameCheck = await this.repository.findByName(data.templateName, hospitalId);
      if (nameCheck) {
        const err = new Error('Template name already in use.');
        err.status = 409;
        err.code = 'ERR_TEMPLATE_NAME_EXISTS';
        throw err;
      }
    }

    const updated = await this.repository.update(id, hospitalId, {
      templateName: data.templateName,
      visibility: data.visibility,
      templateType: data.templateType,
      packagePrice: data.packagePrice,
      packageNotes: data.packageNotes,
      includedItems: data.includedItems,
      isActive: data.isActive,
      templateItems: data.templateItems
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_TEMPLATE',
      targetTable: 'estimate_templates',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async duplicateTemplate(id, hospitalId, data, userContext) {
    const source = await this.getTemplateById(id, hospitalId);

    const nameCheck = await this.repository.findByName(data.templateName, hospitalId);
    if (nameCheck) {
      const err = new Error('Duplicate template name already in use.');
      err.status = 409;
      err.code = 'ERR_TEMPLATE_NAME_EXISTS';
      throw err;
    }

    // Map source templateItems for duplication
    const duplicatedItems = source.templateItems.map((item) => ({
      itemType: item.itemType,
      description: item.description,
      defaultQuantity: item.defaultQuantity,
      defaultRate: Number(item.defaultRate),
      discountType: item.discountType,
      discountValue: Number(item.discountValue)
    }));

    const duplicatedTemplate = await this.repository.create({
      hospitalId,
      templateName: data.templateName,
      createdBy: userContext.userId,
      visibility: source.visibility,
      templateType: source.templateType,
      packagePrice: source.packagePrice ? Number(source.packagePrice) : null,
      packageNotes: source.packageNotes || null,
      includedItems: source.includedItems || null,
      templateItems: duplicatedItems
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'DUPLICATE_TEMPLATE',
      targetTable: 'estimate_templates',
      targetId: duplicatedTemplate.id,
      payload: { sourceId: id, duplicated: duplicatedTemplate }
    });

    return duplicatedTemplate;
  }

  async toggleStatus(id, hospitalId, isActive, userContext) {
    await this.getTemplateById(id, hospitalId);

    await this.prisma.estimateTemplate.update({
      where: { id, hospitalId },
      data: { isActive }
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: isActive ? 'ACTIVATE_TEMPLATE' : 'DEACTIVATE_TEMPLATE',
      targetTable: 'estimate_templates',
      targetId: id,
      payload: { id, isActive }
    });

    return { id, isActive };
  }

  async softDeleteTemplate(id, hospitalId, userContext) {
    await this.getTemplateById(id, hospitalId);

    await this.prisma.estimateTemplate.update({
      where: { id, hospitalId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: userContext.userId
      }
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'SOFT_DELETE_TEMPLATE',
      targetTable: 'estimate_templates',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = EstimateTemplatesService;
