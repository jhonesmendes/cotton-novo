import { Request, Response, NextFunction } from 'express';
import { PerfilUsuario } from '../types/prisma-types';
export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        perfil: PerfilUsuario;
        clienteId?: number;
        filialId?: number;
    };
}
export declare function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void;
export declare function requireRole(...roles: PerfilUsuario[]): (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map