import { Router } from 'express';
import { getMercadoAgro, getMercadoStatus, getSafraAlgodao } from '../controllers/mercado.controller';

export const mercadoRouter = Router();

// GET /api/mercado/agro — dados ao vivo (dólar + soja + milho + algodão)
mercadoRouter.get('/agro', getMercadoAgro);

// GET /api/mercado/safra/algodao — índice de colheita, produção, estados (CONAB/USDA)
mercadoRouter.get('/safra/algodao', getSafraAlgodao);

// GET /api/mercado/status — status do cache
mercadoRouter.get('/status', getMercadoStatus);
