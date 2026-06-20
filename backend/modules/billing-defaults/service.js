/* 
  Purpose: Business service orchestration layer for the Billing Defaults Module.
  Responsibility: Manage tenant defaults configurations, retrieve defaults with self-healing creation, 
  update settings with audit logs, map legacy plural keys to singular DB field names,
  and generate dynamic package inclusion paragraphs from configured billing components.
*/

const writeAuditLog = require('../../shared/audit');

// Map incoming body (which may have legacy plural keys) to singular DB field names
function mapToDbFields(data) {
  return {
    otCharge:               data.otCharge               ?? data.otCharges,
    gaCharge:               data.gaCharge               ?? data.gaCharges,
    localAnaesthesiaCharge: data.localAnaesthesiaCharge ?? data.laCharges,
    sedationCharge:         data.sedationCharge         ?? data.sedationCharges,
    surgeonCharge:          data.surgeonCharge          ?? data.surgeonCharges,
    assistantSurgeonCharge: data.assistantSurgeonCharge ?? data.assistantSurgeonCharges,
    roomCharge:             data.roomCharge             ?? data.roomCharges,
    icuCharge:              data.icuCharge              ?? data.icuCharges,
    wardCharge:             data.wardCharge             ?? data.wardCharges,
    nursingCharge:          data.nursingCharge          ?? data.nursingCharges,
    monitoringCharge:       data.monitoringCharge       ?? data.monitoringCharges,
    dressingCharge:         data.dressingCharge         ?? data.dressingCharges,
    consumableCharge:       data.consumableCharge       ?? data.consumableCharges,
    equipmentCharge:        data.equipmentCharge        ?? data.equipmentCharges,
    admissionCharge:        data.admissionCharge        ?? data.admissionCharges,
    registrationCharge:     data.registrationCharge     ?? data.registrationCharges
  };
}

// Add legacy plural aliases to a DB record for frontend compatibility
function addLegacyAliases(record) {
  if (!record) return record;
  return {
    ...record,
    // Legacy plural aliases
    otCharges:               Number(record.otCharge               || 0),
    gaCharges:               Number(record.gaCharge               || 0),
    laCharges:               Number(record.localAnaesthesiaCharge || 0),
    sedationCharges:         Number(record.sedationCharge         || 0),
    surgeonCharges:          Number(record.surgeonCharge          || 0),
    assistantSurgeonCharges: Number(record.assistantSurgeonCharge || 0),
    roomCharges:             Number(record.roomCharge             || 0),
    icuCharges:              Number(record.icuCharge              || 0),
    wardCharges:             Number(record.wardCharge             || 0),
    nursingCharges:          Number(record.nursingCharge          || 0),
    monitoringCharges:       Number(record.monitoringCharge       || 0),
    dressingCharges:         Number(record.dressingCharge         || 0),
    consumableCharges:       Number(record.consumableCharge       || 0),
    equipmentCharges:        Number(record.equipmentCharge        || 0),
    admissionCharges:        Number(record.admissionCharge        || 0),
    registrationCharges:     Number(record.registrationCharge     || 0)
  };
}

/**
 * Build the professional inclusion paragraph from configured billing defaults.
 *
 * Rules:
 * - Surgeon Charges: ALWAYS included
 * - Assistant Surgeon Charges: included if configured (> 0)
 * - OT Charges: ALWAYS included
 * - Anaesthesia Charges: included ONLY if anaesthesiaType is GA / SPINAL / OTHER
 * - Room Charges: ALWAYS included; phrase reflects stayDays
 * - ICU Charges: included if configured
 * - Nursing Charges: included if configured
 * - Monitoring Charges: included if configured
 * - Dressing Charges: included if configured
 * - Consumable Charges: included if configured (as "routine consumables")
 * - Equipment Charges: included if configured
 * - Admission Charges: included if configured
 * - Registration Charges: included if configured
 * - Ward / Sedation: included if configured
 */
function buildInclusionParagraph(defaults, anaesthesiaType, stayDays) {
  const isGA = ['GA', 'SPINAL', 'OTHER'].includes(anaesthesiaType);

  // Room stay phrase
  const stayNum = Number(stayDays) || 0;
  let roomPhrase;
  if (stayNum === 0) {
    roomPhrase = 'room charges for day care stay';
  } else if (stayNum === 1) {
    roomPhrase = 'room charges for 1 day stay';
  } else {
    roomPhrase = `room charges for ${stayNum} days stay`;
  }

  // Build ordered list of included items
  const parts = [];

  // Surgeon (always)
  parts.push('surgeon charges');

  // Assistant surgeon (if configured)
  if (Number(defaults.assistantSurgeonCharge) > 0) {
    parts.push('assistant surgeon charges');
  }

  // OT (always)
  parts.push('operation theatre charges');

  // Anaesthesia (GA/Spinal/Other only)
  if (isGA) {
    parts.push('anaesthesia charges');
    parts.push('anaesthetist charges');
  }

  // Room (always)
  parts.push(roomPhrase);

  // ICU (if configured)
  if (Number(defaults.icuCharge) > 0) {
    parts.push('ICU charges');
  }

  // Ward (if configured)
  if (Number(defaults.wardCharge) > 0) {
    parts.push('ward charges');
  }

  // Nursing (if configured)
  if (Number(defaults.nursingCharge) > 0) {
    parts.push('nursing charges');
  }

  // Monitoring (if configured)
  if (Number(defaults.monitoringCharge) > 0) {
    parts.push('monitoring charges');
  }

  // Dressing (if configured)
  if (Number(defaults.dressingCharge) > 0) {
    parts.push('dressing charges');
  }

  // Consumables (if configured)
  if (Number(defaults.consumableCharge) > 0) {
    parts.push('routine consumables');
  }

  // Equipment (if configured)
  if (Number(defaults.equipmentCharge) > 0) {
    parts.push('equipment charges');
  }

  // Admission (if configured)
  if (Number(defaults.admissionCharge) > 0) {
    parts.push('admission charges');
  }

  // Registration (if configured)
  if (Number(defaults.registrationCharge) > 0) {
    parts.push('registration charges');
  }

  // Sedation (if configured and anaesthesia is not already GA)
  if (!isGA && Number(defaults.sedationCharge) > 0) {
    parts.push('sedation charges');
  }

  // LA charge (if configured and type is LA)
  if (!isGA && Number(defaults.localAnaesthesiaCharge) > 0) {
    parts.push('local anaesthesia charges');
  }

  // Join parts with Oxford-style comma
  let sentence = '';
  if (parts.length === 0) {
    sentence = 'This package covers all standard hospital services required during admission.';
  } else if (parts.length === 1) {
    sentence = `This package includes ${parts[0]} and other routine hospital services required during admission.`;
  } else {
    const lastPart = parts[parts.length - 1];
    const allButLast = parts.slice(0, parts.length - 1);
    sentence = `This package includes ${allButLast.join(', ')}, ${lastPart} and other routine hospital services required during admission.`;
  }

  return sentence;
}

class BillingDefaultsService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getDefaults(hospitalId) {
    let defaults = await this.repository.findByHospitalId(hospitalId);
    if (!defaults) {
      // Self-healing: create default billing configurations if not found
      defaults = await this.repository.create({
        hospitalId
      });
    }
    return addLegacyAliases(defaults);
  }

  async updateDefaults(hospitalId, data, userContext) {
    // Ensure existing record exists first
    const existing = await this.getDefaults(hospitalId);
    
    // Map legacy/plural field names to singular DB names
    const dbFields = mapToDbFields(data);
    
    // Only update fields that were provided (not undefined)
    const updatePayload = {};
    for (const [key, value] of Object.entries(dbFields)) {
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    }

    const updated = await this.repository.update(hospitalId, updatePayload);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_BILLING_DEFAULTS',
      targetTable: 'billing_defaults',
      targetId: updated.id,
      payload: { previous: existing, updated }
    });

    return addLegacyAliases(updated);
  }

  /**
   * Generate a professional package inclusion paragraph based on:
   * - Hospital's configured billing default charge components
   * - Anaesthesia type chosen for the package (LA vs GA/Spinal/Other)
   * - Duration of stay in days
   *
   * @param {string} hospitalId
   * @param {string} anaesthesiaType  — 'LA' | 'GA' | 'SPINAL' | 'OTHER'
   * @param {number} stayDays         — number of days of inpatient stay
   * @returns {{ inclusionText: string, parts: string[] }}
   */
  async generateInclusionText(hospitalId, anaesthesiaType, stayDays) {
    // Fetch hospital defaults (or use a zero-valued defaults object)
    let defaults = await this.repository.findByHospitalId(hospitalId);
    if (!defaults) {
      defaults = {
        otCharge: 0, gaCharge: 0, localAnaesthesiaCharge: 0, sedationCharge: 0,
        surgeonCharge: 0, assistantSurgeonCharge: 0, roomCharge: 0, icuCharge: 0,
        wardCharge: 0, nursingCharge: 0, monitoringCharge: 0, dressingCharge: 0,
        consumableCharge: 0, equipmentCharge: 0, admissionCharge: 0, registrationCharge: 0
      };
    }

    const normalizedType = (anaesthesiaType || 'GA').toUpperCase();
    const inclusionText = buildInclusionParagraph(defaults, normalizedType, stayDays);

    return {
      inclusionText,
      anaesthesiaType: normalizedType,
      stayDays: Number(stayDays) || 0
    };
  }
}

module.exports = BillingDefaultsService;
