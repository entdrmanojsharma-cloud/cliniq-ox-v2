/*
  Purpose: HTTP controller handling requests for the Data Management Import/Export system.
  Responsibility: Expose routes for sample downloads, Excel data validation, and import execution.
*/

const xlsx = require('xlsx');
const { sendSuccess } = require('../../shared/response');

class DataManagementController {
  constructor(service) {
    this.service = service;
  }

  async getSampleTemplate(req, res, next) {
    try {
      const { importType } = req.query;
      if (!importType || !['SURGERY', 'DIAGNOSIS', 'STAFF'].includes(importType)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing importType query parameter' });
      }

      let headers = [];
      let sampleData = [];

      if (importType === 'SURGERY') {
        headers = ['Surgery Code', 'Surgery Name', 'Category', 'Default Surgeon Fee'];
        sampleData = [
          {
            'Surgery Code': 'SURG001',
            'Surgery Name': 'Appendectomy',
            'Category': 'General Surgery',
            'Default Surgeon Fee': 15000
          },
          {
            'Surgery Code': 'SURG002',
            'Surgery Name': 'Cataract Surgery',
            'Category': 'Ophthalmology',
            'Default Surgeon Fee': 12000
          }
        ];
      } else if (importType === 'DIAGNOSIS') {
        headers = ['Diagnosis Code', 'Diagnosis Name'];
        sampleData = [
          {
            'Diagnosis Code': 'DIAG001',
            'Diagnosis Name': 'Acute Appendicitis'
          },
          {
            'Diagnosis Code': 'DIAG002',
            'Diagnosis Name': 'Senile Cataract'
          }
        ];
      } else if (importType === 'STAFF') {
        headers = ['First Name', 'Last Name', 'Username', 'Password', 'Staff Type', 'Specialty', 'Department', 'License Number'];
        sampleData = [
          {
            'First Name': 'John',
            'Last Name': 'Doe',
            'Username': 'johndoe',
            'Password': 'password123',
            'Staff Type': 'Doctor',
            'Specialty': 'General Surgery',
            'Department': 'Surgery',
            'License Number': 'DOC12345'
          },
          {
            'First Name': 'Jane',
            'Last Name': 'Smith',
            'Username': 'janesmith',
            'Password': 'password123',
            'Staff Type': 'Nurse',
            'Specialty': '',
            'Department': 'OT',
            'License Number': ''
          }
        ];
      }

      const worksheet = xlsx.utils.json_to_sheet(sampleData, { header: headers });
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sample Template');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const fileName = `${importType.toLowerCase()}_master_template.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async validateData(req, res, next) {
    try {
      const { importType, fileData } = req.body;
      if (!importType || !fileData) {
        return res.status(400).json({ success: false, error: 'Missing importType or fileData in request body' });
      }

      // decode base64 file data
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      const report = await this.service.validateData(req.user.hospitalId, importType, rows);
      return sendSuccess(res, 200, report);
    } catch (err) {
      next(err);
    }
  }

  async commitImport(req, res, next) {
    try {
      const { importType, fileName, validatedData } = req.body;
      if (!importType || !validatedData) {
        return res.status(400).json({ success: false, error: 'Missing importType or validatedData in request body' });
      }

      const result = await this.service.importData(
        req.user.hospitalId,
        req.user.userId,
        importType,
        fileName || 'unnamed_import.xlsx',
        validatedData
      );

      return sendSuccess(res, 200, result);
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { importType } = req.query;
      const history = await this.service.getImportHistory(req.user.hospitalId, importType);
      return sendSuccess(res, 200, history);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DataManagementController;
