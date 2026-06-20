/*
  Purpose: Business service logic for Master Data Import System (Data Management).
  Responsibility: Formulate validation rules, compare uploaded arrays against database records, and run bulk operations inside transactional scopes.
*/

const bcrypt = require('bcryptjs');

class DataManagementService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getImportHistory(hospitalId, importType) {
    return this.repository.findHistory({ hospitalId, importType });
  }

  async validateData(hospitalId, importType, rows) {
    if (!Array.isArray(rows)) {
      throw new Error('Rows must be an array of objects');
    }

    const report = {
      toAdd: [],
      toUpdate: [],
      errors: []
    };

    if (importType === 'SURGERY') {
      const codesInSheet = new Set();
      const surgeryCodes = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row indexing offset (header is row 1)

        const rawCode = row['Surgery Code'] || row['surgeryCode'];
        const rawName = row['Surgery Name'] || row['surgeryName'];
        const rawCategory = row['Category'] || row['category'];
        const rawFee = row['Default Surgeon Fee'] || row['defaultSurgeonFee'];

        const code = rawCode ? String(rawCode).trim() : '';
        const name = rawName ? String(rawName).trim() : '';
        const category = rawCategory ? String(rawCategory).trim() : '';
        const feeStr = rawFee !== undefined ? String(rawFee).trim() : '';

        const itemErrors = [];
        if (!code) itemErrors.push('Missing "Surgery Code"');
        if (!name) itemErrors.push('Missing "Surgery Name"');
        if (!category) itemErrors.push('Missing "Category"');

        let defaultSurgeonFee = 0;
        if (feeStr) {
          defaultSurgeonFee = Number(feeStr);
          if (isNaN(defaultSurgeonFee) || defaultSurgeonFee < 0) {
            itemErrors.push('Invalid "Default Surgeon Fee" (must be a positive number)');
          }
        }

        if (code) {
          if (codesInSheet.has(code)) {
            itemErrors.push(`Duplicate "Surgery Code" "${code}" in spreadsheet`);
          } else {
            codesInSheet.add(code);
            surgeryCodes.push(code);
          }
        }

        const formattedRow = {
          rowNum,
          surgeryCode: code,
          surgeryName: name,
          category,
          defaultSurgeonFee,
          errors: itemErrors
        };

        if (itemErrors.length > 0) {
          report.errors.push(formattedRow);
        } else {
          report.toAdd.push(formattedRow);
        }
      }

      if (surgeryCodes.length > 0) {
        const existing = await this.repository.findSurgeriesByCodes(surgeryCodes, hospitalId);
        const existingMap = new Map(existing.map(s => [s.surgeryCode, s]));

        const verifiedToAdd = [];
        for (const row of report.toAdd) {
          const match = existingMap.get(row.surgeryCode);
          if (match) {
            row.id = match.id;
            report.toUpdate.push(row);
          } else {
            verifiedToAdd.push(row);
          }
        }
        report.toAdd = verifiedToAdd;
      }
    } else if (importType === 'DIAGNOSIS') {
      const codesInSheet = new Set();
      const diagnosisCodes = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const rawCode = row['Diagnosis Code'] || row['diagnosisCode'];
        const rawName = row['Diagnosis Name'] || row['diagnosisName'];

        const code = rawCode ? String(rawCode).trim() : '';
        const name = rawName ? String(rawName).trim() : '';

        const itemErrors = [];
        if (!code) itemErrors.push('Missing "Diagnosis Code"');
        if (!name) itemErrors.push('Missing "Diagnosis Name"');

        if (code) {
          if (codesInSheet.has(code)) {
            itemErrors.push(`Duplicate "Diagnosis Code" "${code}" in spreadsheet`);
          } else {
            codesInSheet.add(code);
            diagnosisCodes.push(code);
          }
        }

        const formattedRow = {
          rowNum,
          diagnosisCode: code,
          diagnosisName: name,
          errors: itemErrors
        };

        if (itemErrors.length > 0) {
          report.errors.push(formattedRow);
        } else {
          report.toAdd.push(formattedRow);
        }
      }

      if (diagnosisCodes.length > 0) {
        const existing = await this.repository.findDiagnosesByCodes(diagnosisCodes, hospitalId);
        const existingMap = new Map(existing.map(d => [d.diagnosisCode, d]));

        const verifiedToAdd = [];
        for (const row of report.toAdd) {
          const match = existingMap.get(row.diagnosisCode);
          if (match) {
            row.id = match.id;
            report.toUpdate.push(row);
          } else {
            verifiedToAdd.push(row);
          }
        }
        report.toAdd = verifiedToAdd;
      }
    } else if (importType === 'STAFF') {
      const usernamesInSheet = new Set();
      const usernames = [];

      const ALLOWED_STAFF_TYPES = ['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant', 'Receptionist', 'Nurse', 'Technician', 'Admin', 'Other'];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const rawFirst = row['First Name'] || row['firstName'];
        const rawLast = row['Last Name'] || row['lastName'];
        const rawUsername = row['Username'] || row['username'];
        const rawPassword = row['Password'] || row['password'];
        const rawStaff = row['Staff Type'] || row['staffType'];
        const rawSpec = row['Specialty'] || row['specialty'];
        const rawDept = row['Department'] || row['department'];
        const rawLicense = row['License Number'] || row['licenseNumber'];

        const firstName = rawFirst ? String(rawFirst).trim() : '';
        const lastName = rawLast ? String(rawLast).trim() : '';
        const username = rawUsername ? String(rawUsername).trim().toLowerCase() : '';
        const password = rawPassword ? String(rawPassword).trim() : '';
        const staffType = rawStaff ? String(rawStaff).trim() : '';
        
        const specialty = rawSpec ? String(rawSpec).trim() : '';
        const department = rawDept ? String(rawDept).trim() : '';
        const licenseNumber = rawLicense ? String(rawLicense).trim() : '';

        const itemErrors = [];
        if (!firstName) itemErrors.push('Missing "First Name"');
        if (!username) itemErrors.push('Missing "Username"');
        if (!staffType) itemErrors.push('Missing "Staff Type"');

        if (staffType && !ALLOWED_STAFF_TYPES.includes(staffType)) {
          itemErrors.push(`Invalid "Staff Type" "${staffType}". Allowed: ${ALLOWED_STAFF_TYPES.join(', ')}`);
        }

        if (username) {
          if (usernamesInSheet.has(username)) {
            itemErrors.push(`Duplicate "Username" "${username}" in spreadsheet`);
          } else {
            usernamesInSheet.add(username);
            usernames.push(username);
          }
        }

        const formattedRow = {
          rowNum,
          firstName,
          lastName,
          username,
          password,
          staffType,
          specialty,
          department,
          licenseNumber,
          errors: itemErrors
        };

        if (itemErrors.length > 0) {
          report.errors.push(formattedRow);
        } else {
          report.toAdd.push(formattedRow);
        }
      }

      if (usernames.length > 0) {
        const existingUsers = await this.repository.findUsersByUsernames(usernames);
        const existingMap = new Map(existingUsers.map(u => [u.username, u]));

        const verifiedToAdd = [];
        for (const row of report.toAdd) {
          const match = existingMap.get(row.username);
          if (match) {
            if (match.hospitalId !== hospitalId) {
              row.errors.push(`Username "${row.username}" is globally taken by another hospital`);
              report.errors.push(row);
            } else {
              row.id = match.id;
              if (row.password && row.password.length < 6) {
                row.errors.push('Password must be at least 6 characters if updating');
                report.errors.push(row);
              } else {
                report.toUpdate.push(row);
              }
            }
          } else {
            if (!row.password) {
              row.errors.push('Password is required for new staff logins');
              report.errors.push(row);
            } else if (row.password.length < 6) {
              row.errors.push('Password must be at least 6 characters');
              report.errors.push(row);
            } else {
              verifiedToAdd.push(row);
            }
          }
        }
        report.toAdd = verifiedToAdd;
      }
    } else {
      throw new Error(`Invalid import type: ${importType}`);
    }

    return report;
  }

  async importData(hospitalId, userId, importType, fileName, validatedData) {
    const { toAdd, toUpdate } = validatedData;
    let addedCount = 0;
    let updatedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      if (importType === 'SURGERY') {
        for (const s of toUpdate) {
          await tx.surgeryMaster.update({
            where: { id: s.id },
            data: {
              surgeryName: s.surgeryName,
              category: s.category,
              defaultSurgeonFee: s.defaultSurgeonFee,
              isActive: true
            }
          });
          updatedCount++;
        }

        for (const s of toAdd) {
          await tx.surgeryMaster.create({
            data: {
              hospitalId,
              surgeryCode: s.surgeryCode,
              surgeryName: s.surgeryName,
              category: s.category,
              defaultSurgeonFee: s.defaultSurgeonFee,
              isActive: true
            }
          });
          addedCount++;
        }
      } else if (importType === 'DIAGNOSIS') {
        for (const d of toUpdate) {
          await tx.diagnosisMaster.update({
            where: { id: d.id },
            data: {
              diagnosisName: d.diagnosisName,
              isActive: true
            }
          });
          updatedCount++;
        }

        for (const d of toAdd) {
          await tx.diagnosisMaster.create({
            data: {
              hospitalId,
              diagnosisCode: d.diagnosisCode,
              diagnosisName: d.diagnosisName,
              isActive: true
            }
          });
          addedCount++;
        }
      } else if (importType === 'STAFF') {
        for (const u of toUpdate) {
          const updatePayload = {
            firstName: u.firstName,
            lastName: u.lastName || null,
            staffType: u.staffType,
            isActive: true
          };

          if (u.password) {
            updatePayload.passwordHash = await bcrypt.hash(u.password, 10);
            updatePayload.plainPassword = u.password;
          }

          const isDocType = ['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant'].includes(u.staffType);
          updatePayload.role = isDocType ? 'DOCTOR' : u.staffType === 'Admin' ? 'ADMIN' : 'RECEPTIONIST';

          const user = await tx.user.update({
            where: { id: u.id },
            data: updatePayload
          });

          if (isDocType) {
            const docPayload = {
              firstName: u.firstName,
              lastName: u.lastName || '',
              specialty: u.specialty || 'General',
              department: u.department || null,
              licenseNumber: u.licenseNumber || 'N/A',
              isActive: true
            };

            await tx.doctor.upsert({
              where: { userId: user.id },
              create: {
                hospitalId,
                userId: user.id,
                ...docPayload
              },
              update: docPayload
            });
          } else {
            await tx.doctor.deleteMany({
              where: { userId: user.id }
            });
          }
          updatedCount++;
        }

        for (const u of toAdd) {
          const passwordHash = await bcrypt.hash(u.password, 10);
          const isDocType = ['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant'].includes(u.staffType);
          const role = isDocType ? 'DOCTOR' : u.staffType === 'Admin' ? 'ADMIN' : 'RECEPTIONIST';

          const user = await tx.user.create({
            data: {
              hospitalId,
              username: u.username,
              passwordHash,
              plainPassword: u.password,
              firstName: u.firstName,
              lastName: u.lastName || null,
              role,
              staffType: u.staffType,
              isActive: true,
              mustChangePassword: false
            }
          });

          if (isDocType) {
            await tx.doctor.create({
              data: {
                hospitalId,
                userId: user.id,
                firstName: u.firstName,
                lastName: u.lastName || '',
                specialty: u.specialty || 'General',
                department: u.department || null,
                licenseNumber: u.licenseNumber || 'N/A',
                isActive: true
              }
            });
          }
          addedCount++;
        }
      }

      await tx.importHistory.create({
        data: {
          hospitalId,
          userId,
          importType,
          fileName,
          addedCount,
          updatedCount,
          errorCount: 0,
          status: 'SUCCESS'
        }
      });
    }, { timeout: 60000 });

    return {
      importType,
      addedCount,
      updatedCount,
      message: `Successfully imported ${addedCount} records and updated ${updatedCount} records.`
    };
  }
}

module.exports = DataManagementService;
