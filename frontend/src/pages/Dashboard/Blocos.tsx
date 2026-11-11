import { ReactNode, useState } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CheckCircleIcon, ExclamationTriangleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

// ─── Tipos / constantes ─────────────────────────────────────────────────────
export type Modo = 'fardos' | 'cargas';
export type SituacaoPrazo = 'VENCIDO' | 'CRITICO' | 'ATENCAO' | 'NO_PRAZO';

// Situação do prazo usa a paleta de status (reservada) e sempre vem com ícone + rótulo.
export const SITUACOES: { chave: SituacaoPrazo; rotulo: string; cor: string; Icone: typeof ClockIcon }[] = [
  { chave: 'VENCIDO', rotulo: 'Vencido', cor: 'var(--status-critical)', Icone: ExclamationCircleIcon },
  { chave: 'CRITICO', rotulo: 'Crítico (≤1 dia)', cor: 'var(--status-serious)', Icone: ExclamationTriangleIcon },
  { chave: 'ATENCAO', rotulo: 'Atenção (≤3 dias)', cor: 'var(--status-warning)', Icone: ClockIcon },
  { chave: 'NO_PRAZO', rotulo: 'No prazo', cor: 'var(--status-good)', Icone: CheckCircleIcon },
];
export const rotuloSituacao = (s: string) => SITUACOES.find((x) => x.chave === s)?.rotulo ?? s;

const num = (v: number) => v.toLocaleString('pt-BR');
const eixo = { fontSize: 11, fill: 'var(--viz-axis)' };

export function Cartao({ titulo, descricao, acao, children, className = '' }: { titulo: string; descricao?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`ui-card p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ui-text">{titulo}</h2>
          {descricao && <p className="text-xs text-ui-text-muted">{descricao}</p>}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

function CaixaTooltip({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-xs text-ui-text shadow-lg">{children}</div>;
}

// ─── KPI ────────────────────────────────────────────────────────────────────
// Segundo número no mesmo card (ex.: Fardos pendentes = falta carregar + falta programar).
export type KpiSecundario = { valor: number; rotulo: string };

export function Kpi({ titulo, valor, sufixo, rotuloValor, secundario, historico, comparacao, meta, onClick, destaque }: {
  titulo: string;
  valor: number;
  sufixo?: string;
  rotuloValor?: string;
  secundario?: KpiSecundario;
  historico: number[];
  // Diferença vs. 7 dias atrás (null = ainda sem histórico suficiente).
  comparacao: { delta: number; melhorQuandoSobe: boolean } | null;
  meta?: number;
  onClick?: () => void;
  destaque?: 'critico';
}) {
  const dados = historico.map((v, i) => ({ i, v }));
  return (
    <button type="button" onClick={onClick}
      className="ui-card relative overflow-hidden p-4 text-left transition hover:border-ui-primary/40 hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-muted">{titulo}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${destaque === 'critico' && valor > 0 ? 'text-red-600' : 'text-ui-text'}`}>
        {num(valor)}{sufixo}
        {rotuloValor && <span className="ml-2 font-sans text-sm font-medium text-ui-text-muted">{rotuloValor}</span>}
      </p>
      {secundario && (
        <p className="font-display text-lg font-semibold text-ui-text">
          {num(secundario.valor)}<span className="ml-2 font-sans text-xs font-medium text-ui-text-muted">{secundario.rotulo}</span>
        </p>
      )}
      <div className="mt-1 min-h-[16px] text-xs text-ui-text-muted">
        {comparacao ? (
          <span className={comparacao.delta === 0 ? '' : (comparacao.delta > 0) === comparacao.melhorQuandoSobe ? 'text-green-700' : 'text-red-600'}>
            {comparacao.delta > 0 ? '↗' : comparacao.delta < 0 ? '↘' : '→'} {num(Math.abs(Math.round(comparacao.delta * 10) / 10))}{sufixo ?? ''} vs. semana passada
          </span>
        ) : historico.length > 1 ? 'comparação após 7 dias de histórico' : null}
      </div>
      {meta != null && (
        <div className="mt-2">
          <div className="relative h-1.5 rounded-full bg-ui-muted">
            <div className="h-1.5 rounded-full bg-ui-primary" style={{ width: `${Math.min(100, valor)}%` }} />
            <div className="absolute -top-1 h-3.5 w-0.5 bg-ui-text" style={{ left: `${Math.min(100, meta)}%` }} title={`Meta ${meta}%`} />
          </div>
          <p className="mt-1 text-[11px] text-ui-text-muted">
            Meta {num(meta)}%{valor < meta ? ` · faltam ${num(Math.round((meta - valor) * 10) / 10)} p.p.` : ' · atingida'}
          </p>
        </div>
      )}
      {dados.length > 1 && (
        <div className="pointer-events-none absolute bottom-0 right-0 h-10 w-28 opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados}><Line type="monotone" dataKey="v" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}

// ─── Pendências por cliente (barras horizontais) ────────────────────────────
export function PendenciasPorCliente({ dados, modo, selecionado, onSelecionar }: {
  dados: { id: number; nome: string; fardos: number; cargas: number }[];
  modo: Modo;
  selecionado?: number;
  onSelecionar: (id: number) => void;
}) {
  const chave = modo === 'fardos' ? 'fardos' : 'cargas';
  // Até 8 clientes; o resto soma numa barra "Outros (N)".
  const ordenados = [...dados].sort((a, b) => b[chave] - a[chave]);
  const resto = ordenados.slice(8);
  const linhas = resto.length
    ? [...ordenados.slice(0, 8), { id: -1, nome: `Outros (${resto.length})`, fardos: resto.reduce((s, d) => s + d.fardos, 0), cargas: resto.reduce((s, d) => s + d.cargas, 0) }]
    : ordenados;
  if (!linhas.length) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, linhas.length * 34)}>
      <BarChart data={linhas} layout="vertical" margin={{ left: 8, right: 48 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="nome" width={120} tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--viz-grid)', opacity: 0.4 }} content={({ active, payload }) => active && payload?.[0] ? (
          <CaixaTooltip>
            <p className="font-semibold">{payload[0].payload.nome}</p>
            <p>{num(payload[0].payload.fardos)} fardos a carregar · {num(payload[0].payload.cargas)} carga(s)</p>
            <p className="text-ui-text-muted">Clique para filtrar o painel</p>
          </CaixaTooltip>
        ) : null} />
        <Bar dataKey={chave} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => d.id > 0 && onSelecionar(d.id)}
          label={{ position: 'right', fontSize: 11, fill: 'var(--viz-axis)', formatter: (v: number) => num(v) }}>
          {linhas.map((l) => (
            <Cell key={l.id} fill={l.id > 0 ? 'var(--series-1)' : 'var(--series-outros)'} opacity={selecionado && selecionado !== l.id ? 0.3 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Volume por filial (rosca + lista) ──────────────────────────────────────
// Até 6 filiais com cor própria; o resto vira "Outras" (cinza) — mais de 8 cores
// não dá para distinguir. "Ver todas" abre a lista completa.
const MAX_FILIAIS = 6;
const OUTRAS = -1;

export function VolumePorFilial({ dados, modo, selecionado, onSelecionar }: {
  dados: { id: number; nome: string; total: number; cargas: number }[];
  modo: Modo;
  selecionado?: number;
  onSelecionar: (id: number) => void;
}) {
  const [todas, setTodas] = useState(false);
  const chave = modo === 'fardos' ? 'total' : 'cargas';
  const ordenados = [...dados].sort((a, b) => b[chave] - a[chave]);
  const principais = ordenados.slice(0, MAX_FILIAIS);
  const resto = ordenados.slice(MAX_FILIAIS);
  const fatias = resto.length
    ? [...principais, { id: OUTRAS, nome: `Outras (${resto.length})`, total: resto.reduce((s, d) => s + d.total, 0), cargas: resto.reduce((s, d) => s + d.cargas, 0) }]
    : principais;
  const cor = (id: number) => {
    const i = principais.findIndex((d) => d.id === id);
    return i >= 0 ? `var(--series-${i + 1})` : 'var(--series-outros)';
  };
  const soma = dados.reduce((s, d) => s + d[chave], 0);
  const lista = todas ? ordenados : fatias;
  const clicar = (id: number) => (id === OUTRAS ? setTodas(true) : onSelecionar(id));
  if (!dados.length) return <Vazio />;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={fatias} dataKey={chave} nameKey="nome" innerRadius="62%" outerRadius="100%" paddingAngle={1}
              stroke="var(--viz-surface)" strokeWidth={2} cursor="pointer" onClick={(d: any) => clicar(d.id)} isAnimationActive={false}>
              {fatias.map((d) => <Cell key={d.id} fill={cor(d.id)} opacity={selecionado && selecionado !== d.id ? 0.3 : 1} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
              <CaixaTooltip>
                <p className="font-semibold">{payload[0].payload.nome}</p>
                <p>{num(payload[0].payload.total)} fardos · {num(payload[0].payload.cargas)} carga(s)</p>
                {payload[0].payload.id === OUTRAS && <p className="text-ui-text-muted">Clique para ver todas</p>}
              </CaixaTooltip>
            ) : null} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full min-w-0">
        <ul className={`space-y-1 text-sm ${todas ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
          {lista.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => clicar(d.id)}
                className={`w-full rounded-md px-2 py-1 text-left hover:bg-ui-muted ${selecionado && selecionado !== d.id ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor(d.id) }} />
                    <span className="truncate text-ui-text">{d.nome}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ui-text-muted">
                    {num(d[chave])} <span className="hidden sm:inline">· {soma ? Math.round((d[chave] / soma) * 100) : 0}%</span>
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {resto.length > 0 && (
          <button type="button" onClick={() => setTodas((t) => !t)} className="mt-2 px-2 text-xs font-semibold text-ui-primary hover:underline">
            {todas ? 'Mostrar só as principais' : `Ver todas as ${dados.length} filiais`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Linha do tempo de deadlines (barras empilhadas por situação) ───────────
export function LinhaDoTempo({ dados, modo, dia, situacao, onDia, onSituacao }: {
  dados: any[];
  modo: Modo;
  dia?: string;
  situacao?: string;
  onDia: (dia: string) => void;
  onSituacao: (s: SituacaoPrazo) => void;
}) {
  const prefixo = modo === 'fardos' ? '' : 'cargas';
  const temDados = dados.some((d) => SITUACOES.some((s) => d[`${prefixo}${s.chave}`] > 0));
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {SITUACOES.map(({ chave, rotulo, cor, Icone }) => (
          <button key={chave} type="button" onClick={() => onSituacao(chave)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-ui-text ${
              situacao === chave ? 'border-ui-primary bg-ui-muted font-semibold' : situacao ? 'border-ui-border opacity-50' : 'border-ui-border'
            }`}>
            <Icone className="h-3.5 w-3.5" style={{ color: cor }} />{rotulo}
          </button>
        ))}
      </div>
      {!temDados ? <Vazio texto="Nenhum deadline nas próximas 3 semanas para este filtro" /> : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dados} margin={{ left: -16, right: 4 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={48} />
            <YAxis tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--viz-grid)', opacity: 0.4 }} content={({ active, payload }) => active && payload?.length ? (
              <CaixaTooltip>
                <p className="mb-1 font-semibold">{payload[0].payload.dia === 'vencidas' ? 'Já vencidas' : `Deadline ${payload[0].payload.rotulo}`}</p>
                {SITUACOES.filter((s) => payload[0].payload[`${prefixo}${s.chave}`] > 0).map((s) => (
                  <p key={s.chave} className="flex items-center gap-1.5">
                    <s.Icone className="h-3 w-3" style={{ color: s.cor }} />{s.rotulo}: {num(payload[0].payload[`${prefixo}${s.chave}`])} {modo}
                  </p>
                ))}
                <p className="mt-1 text-ui-text-muted">Clique para filtrar por este dia</p>
              </CaixaTooltip>
            ) : null} />
            {SITUACOES.map((s, i) => (
              <Bar key={s.chave} dataKey={`${prefixo}${s.chave}`} stackId="prazo" fill={s.cor} stroke="var(--viz-surface)" strokeWidth={2}
                radius={i === SITUACOES.length - 1 ? [4, 4, 0, 0] : 0} cursor="pointer"
                onClick={(d: any) => d.dia !== 'vencidas' ? onDia(d.dia) : onSituacao('VENCIDO')}>
                {dados.map((d) => <Cell key={d.dia} opacity={dia && dia !== d.dia ? 0.3 : 1} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

export function Vazio({ texto = 'Nada para este filtro' }: { texto?: string }) {
  return <p className="py-10 text-center text-sm text-ui-text-muted">{texto}</p>;
}
