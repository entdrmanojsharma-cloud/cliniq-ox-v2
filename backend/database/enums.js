/* 
  Purpose: Define JavaScript enum objects matching database PostgreSQL schemas.
  Responsibility: Provide immutable constants for role validations, event configurations, and estimate states.
*/

const Role = Object.freeze({
  RECEPTIONIST: 'RECEPTIONIST',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN'
});

const Gender = Object.freeze({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER'
});

const EventType = Object.freeze({
  SURGERY: 'SURGERY',
  OPD: 'OPD',
  IPD: 'IPD',
  MEETING: 'MEETING',
  LEAVE: 'LEAVE',
  CONFERENCE: 'CONFERENCE',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  OTHER: 'OTHER'
});

const EventStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
});

const UnitType = Object.freeze({
  FIXED: 'FIXED',
  PER_HOUR: 'PER_HOUR',
  PER_DAY: 'PER_DAY'
});

const PendingChargeStatus = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
});

const EstimateStatus = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  LOCKED: 'LOCKED',
  CANCELLED: 'CANCELLED'
});

const Visibility = Object.freeze({
  GLOBAL: 'GLOBAL',
  PRIVATE: 'PRIVATE'
});

const TemplateItemType = Object.freeze({
  SURGERY_FEE: 'SURGERY_FEE',
  OT_CHARGE: 'OT_CHARGE',
  ANAESTHESIA: 'ANAESTHESIA',
  ROOM_CHARGE: 'ROOM_CHARGE',
  NURSING: 'NURSING',
  ICU: 'ICU',
  ADDITIONAL: 'ADDITIONAL'
});

module.exports = {
  Role,
  Gender,
  EventType,
  EventStatus,
  UnitType,
  PendingChargeStatus,
  EstimateStatus,
  Visibility,
  TemplateItemType
};
