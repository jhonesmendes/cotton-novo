import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth.routes';
import { liberacoesRouter } from './routes/liberacoes.routes';
import { veiculosRouter } from './routes/veiculos.routes';
import { modelosRouter } from './routes/modelos.routes';
import { terminaisRouter } from './routes/terminais.routes';
import { alertasRouter } from './routes/alertas.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { clientesRouter } from './routes/clientes.routes';
import { origensRouter } from './routes/origens.routes';
import destinosRouter from './routes/destinos.routes';
import locaisColetaRouter from './routes/locais-coleta.routes';
import { mercadoRouter } from './routes/mercado.routes';
import prisma from './database/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/liberacoes', liberacoesRouter);
app.use('/api/veiculos', veiculosRouter);
app.use('/api/modelos', modelosRouter);
app.use('/api/terminais', terminaisRouter);
app.use('/api/alertas', alertasRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/origens', origensRouter);
app.use('/api/destinos', destinosRouter);
app.use('/api/locais-coleta', locaisColetaRouter);
app.use('/api/mercado', mercadoRouter);

app.get('/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

app.use(errorHandler);

// ─── Inicialização com verificação de banco ────────────────────────────────────
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Banco de dados MySQL conectado com sucesso');

    app.listen(PORT, () => {
      console.log(`🚀 Cotton Backend rodando em http://localhost:${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Falha ao conectar com banco de dados MySQL:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();

export default app;

