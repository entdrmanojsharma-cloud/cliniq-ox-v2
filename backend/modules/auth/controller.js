/* 
  Purpose: HTTP controller handling requests for the Authentication Module.
  Responsibility: Map incoming bodies to auth signup/login workflows and format standard responses.
*/

const { sendSuccess } = require('../../shared/response');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async verifyUsername(req, res, next) {
    try {
      const { username } = req.body;
      const exists = await this.authService.verifyUsername(username);
      return sendSuccess(res, 200, { exists });
    } catch (err) {
      next(err);
    }
  }

  async signup(req, res, next) {
    try {
      const data = await this.authService.signup(req.body);
      return sendSuccess(res, 201, data);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const data = await this.authService.login(req.body);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  // New refresh token endpoint
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const data = await this.authService.refreshAccessToken(refreshToken);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { username } = req.body;
      const data = await this.authService.requestForgotPassword(username);
      return sendSuccess(res, 200, data);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      const data = await this.authService.changePassword(req.user.userId, newPassword);
      return sendSuccess(res, 200, data);
    } catch (err) { next(err); }
  }

  async listStaff(req, res, next) {
    try {
      const data = await this.authService.listStaff(req.user.hospitalId);
      return sendSuccess(res, 200, { staff: data });
    } catch (err) { next(err); }
  }

  async updateStaff(req, res, next) {
    try {
      if (req.params.id === req.user.userId && req.body.isActive === false) {
        const err = new Error('You cannot deactivate your own account.');
        err.status = 400;
        err.code = 'ERR_BAD_REQUEST';
        throw err;
      }
      const data = await this.authService.updateStaff(req.user.hospitalId, req.params.id, req.body);
      return sendSuccess(res, 200, data);
    } catch (err) { next(err); }
  }

  async deleteStaff(req, res, next) {
    try {
      const data = await this.authService.deleteStaff(req.user.hospitalId, req.params.id);
      return sendSuccess(res, 200, data);
    } catch (err) { next(err); }
  }
}

module.exports = AuthController;
