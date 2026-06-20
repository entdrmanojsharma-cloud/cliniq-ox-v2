/* 
  Purpose: Define validation rules for the Rooms Master Module.
  Responsibility: Validate incoming create and update payloads against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name is required.').max(150),
  roomType: z.string().min(1, 'Room type is required.').max(100),
  defaultDailyCharge: z.number().nonnegative().optional()
});

const updateRoomSchema = z.object({
  roomName: z.string().min(1, 'Room name is required.').max(150).optional(),
  roomType: z.string().min(1, 'Room type is required.').max(100).optional(),
  defaultDailyCharge: z.number().nonnegative().optional()
});

class RoomsValidator {
  constructor() {
    this.validateCreate = validateSchema(createRoomSchema);
    this.validateUpdate = validateSchema(updateRoomSchema);
  }
}

module.exports = RoomsValidator;
