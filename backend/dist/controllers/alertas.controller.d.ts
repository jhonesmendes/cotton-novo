import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function listarAlertas(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function historico(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getConfig(_req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function salvarConfig(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=alertas.controller.d.ts.map