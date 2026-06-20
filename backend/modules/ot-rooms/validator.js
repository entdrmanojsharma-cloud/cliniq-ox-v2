/* 
  Purpose: Define validation rules for the OT Rooms Master Module.
  Responsibility: Validate incoming create and update payloads against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createOtRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name is required.').max(150),
  defaultHourlyCharge: z.number().nonnegative().optional()
});

const updateOtRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name is required.').max(150).optional(),
  defaultHourlyCharge: z.number().nonnegative().optional()
});

class OtRoomsValidator {
  constructor() {
    this.validateCreate = validateSchema(createOtRoomSchema);
    this.validateUpdate = validateSchema(updateOtRoomSchema);
  }
}

module.exports = OtRoomsValidator;
