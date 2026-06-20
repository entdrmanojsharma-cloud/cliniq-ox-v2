/* 
  Purpose: Define validation rules for the Calendar Events Module.
  Responsibility: Validate incoming create and update payloads against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createEventSchema = z.object({
  eventType: z.enum(['SURGERY', 'OPD', 'IPD', 'MEETING', 'LEAVE', 'CONFERENCE', 'ADMINISTRATIVE', 'OTHER'], {
    errorMap: () => ({ message: 'Invalid event type.' })
  }),
  title: z.string().min(1, 'Title is required.').max(255),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO Date String.' }),
  endTime: z.string().datetime({ message: 'End time must be a valid ISO Date String.' }),
  doctorId: z.string().uuid().optional().nullable(),
  assistantSurgeonId: z.string().uuid().optional().nullable(),
  otRoomId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid().optional().nullable(),
  recurrenceRule: z.string().max(255).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  surgeryId: z.string().uuid().optional().nullable(),
  surgeryCost: z.number().optional().nullable(),
  durationMinutes: z.number().int().optional().nullable(),
  forceCreate: z.boolean().optional().nullable()
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'Start time must be before end time.',
  path: ['startTime']
});

const updateEventSchema = z.object({
  eventType: z.enum(['SURGERY', 'OPD', 'IPD', 'MEETING', 'LEAVE', 'CONFERENCE', 'ADMINISTRATIVE', 'OTHER']).optional(),
  title: z.string().min(1).max(255).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  doctorId: z.string().uuid().optional().nullable(),
  assistantSurgeonId: z.string().uuid().optional().nullable(),
  otRoomId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid().optional().nullable(),
  recurrenceRule: z.string().max(255).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  surgeryId: z.string().uuid().optional().nullable(),
  surgeryCost: z.number().optional().nullable(),
  durationMinutes: z.number().int().optional().nullable(),
  forceCreate: z.boolean().optional().nullable()
}).refine(data => {
  if (data.startTime && data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: 'Start time must be before end time.',
  path: ['startTime']
});

class CalendarValidator {
  constructor() {
    this.validateCreate = validateSchema(createEventSchema);
    this.validateUpdate = validateSchema(updateEventSchema);
  }
}

module.exports = CalendarValidator;
