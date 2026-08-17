import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function login(req: Request, res: Response): Promise<unknown>;
export declare function refreshToken(req: AuthRequest, res: Response): Promise<void>;
export declare function getProfile(req: AuthRequest, res: Response): Promise<unknown>;
//# sourceMappingURL=auth-simple.controller.d.ts.map