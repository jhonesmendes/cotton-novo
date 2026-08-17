import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function listar(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function referencias(_req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function criarReferencia(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function atualizarReferencia(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function buscarPorId(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function criar(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function atualizar(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deletar(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function atualizarStatus(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=liberacoes.controller.d.ts.map