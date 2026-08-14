"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', auth_controller_1.login);
exports.authRouter.post('/refresh', auth_controller_1.refreshToken);
exports.authRouter.get('/me', auth_1.authenticate, auth_controller_1.me);
//# sourceMappingURL=auth.routes.js.map