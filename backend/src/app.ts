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

// A instância de desenvolvimento pode priorizar o .env local sem alterar a
// configuração herdada por processos de produção.
dotenv.config({ override: process.env.NODE_ENV === 'development' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

app.get('/health', (_, res) => {
  res.json({ status: 'ok', source: 'cotton-backend', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Cotton Backend rodando em http://localhost:${PORT}`);
});

export default app;
