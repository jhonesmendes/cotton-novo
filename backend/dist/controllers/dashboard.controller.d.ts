import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getResumo(_req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getVeiculosVencendo(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getKPIs(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=dashboard.controller.d.ts.map