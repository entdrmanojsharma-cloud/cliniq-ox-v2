/* 
  Purpose: Define request validation rules for the Documents Module.
  Responsibility: Validate incoming HTTP request body parameters using Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const documentTypeEnum = z.enum(['ESTIMATE', 'INVOICE', 'RECEIPT', 'CONSENT_FORM']);

const generateDocumentSchema = z.object({
  documentType: documentTypeEnum,
  targetId: z.string().uuid('Invalid target record ID format.'),
  isPrintPreview: z.boolean().optional()
});

class DocumentsValidator {
  constructor() {
    this.validateGenerate = validateSchema(generateDocumentSchema);
  }
}

module.exports = DocumentsValidator;
