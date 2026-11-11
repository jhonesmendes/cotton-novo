import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowTrendingDownIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, CheckBadgeIcon, CubeIcon,
  ExclamationTriangleIcon, MapPinIcon, NoSymbolIcon, PlusCircleIcon, ShieldCheckIcon, SparklesIcon, TruckIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/auth.store';
import { Modo, SITUACOES, SituacaoPrazo, Vazio } from './Blocos';
import { TipoEvento, descreverAtividade, tempoRelativo, tipoAtividade } from './atividade';

// Dashboard no estilo Safra (escuro, destaque verde-limão): cabeçalho com saudação
// e resumo em frase, KPIs com ícone e minigráfico de área, barras em degradê,
// rosca segmentada, linha do tempo com marcador HOJE e feed com ícones.

const num = (v: number) => v.toLocaleString('pt-BR');
const eixo = { fontSize: 11, fill: 'var(--viz-axis)' };
const LIMAO = '#c6f24e';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Caixa({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-white/10 bg-[#0d1410] px-3 py-2 text-xs text-gray-900 shadow-lg">{children}</div>;
}

export function CardSafra({ titulo, descricao, acao, children, className = '' }: { titulo: string; descricao?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`ui-card p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-gray-900">{titulo}</h2>
          {descricao && <p className="text-xs text-gray-500">{descricao}</p>}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

// ─── Cabeçalho ──────────────────────────────────────────────────────────────
export function CabecalhoSafra({ vencidas, vencendo, acoes }: { vencidas: number; vencendo: number; acoes?: ReactNode }) {
  const nome = useAuthStore((s) => s.user?.nome)?.split(' ')[0] ?? '';
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#c6f24e]">
          <SparklesIcon className="h-4 w-4" />{saudacao()}, {nome}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-gray-900 sm:text-4xl">Visão geral das cargas</h1>
        <p className="mt-1 text-sm text-gray-500">
          {vencidas > 0 || vencendo > 0 ? (
            <>
              {vencidas > 0 && <strong className="text-[#e0574e]">{vencidas} {vencidas === 1 ? 'carga vencida' : 'cargas vencidas'}</strong>}
              {vencidas > 0 && vencendo > 0 && ' e '}
              {vencendo > 0 && `${vencendo} vencendo nos próximos 3 dias`} {vencidas + vencendo === 1 ? 'precisa' : 'precisam'} da sua atenção.
            </>
          ) : 'Nenhuma carga vencida ou vencendo nos próximos 3 dias.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-600">
          <CalendarDaysIcon className="h-4 w-4 text-[#c6f24e]" /><span className="capitalize">{hoje}</span>
        </span>
        {acoes}
      </div>
    </header>
  );
}

// ─── KPI ────────────────────────────────────────────────────────────────────
type Tom = 'ciano' | 'risco' | 'ambar' | 'limao';
const TONS: Record<Tom, { cor: string; fundo: string; borda: string; Icone: typeof TruckIcon }> = {
  ciano: { cor: '#1ea2b6', fundo: 'rgb(30 162 182 / .06)', borda: 'rgb(255 255 255 / .07)', Icone: TruckIcon },
  risco: { cor: '#e0574e', fundo: 'rgb(224 87 78 / .10)', borda: 'rgb(224 87 78 / .35)', Icone: ExclamationTriangleIcon },
  ambar: { cor: '#d99a2b', fundo: 'rgb(217 154 43 / .06)', borda: 'rgb(255 255 255 / .07)', Icone: CubeIcon },
  limao: { cor: LIMAO, fundo: 'rgb(198 242 78 / .05)', borda: 'rgb(255 255 255 / .07)', Icone: CheckBadgeIcon },
};

export function KpiSafra({ titulo, valor, sufixo, tom, detalhe, historico, comparacao, meta, onClick }: {
  titulo: string;
  valor: number;
  sufixo?: string;
  tom: Tom;
  detalhe?: ReactNode;
  historico: number[];
  comparacao: { delta: number; melhorQuandoSobe: boolean } | null;
  meta?: number;
  onClick?: () => void;
}) {
  const t = TONS[tom];
  const dados = historico.map((v, i) => ({ i, v }));
  const bom = comparacao && comparacao.delta !== 0 ? (comparacao.delta > 0) === comparacao.melhorQuandoSobe : null;
  const idGrad = `kpi-${tom}`;
  return (
    <button type="button" onClick={onClick}
      className="relative flex min-h-[148px] flex-col overflow-hidden rounded-ui-lg border p-5 text-left transition hover:brightness-110"
      style={{ background: `linear-gradient(180deg, ${t.fundo}, transparent), rgb(var(--c-surface))`, borderColor: t.borda }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{titulo}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-ui-md" style={{ background: `${t.cor}22`, color: t.cor }}>
          <t.Icone className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-1 font-display text-4xl font-bold text-gray-900">{num(valor)}<span className="text-2xl text-gray-500">{sufixo}</span></p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {comparacao && (
          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold"
            style={{ background: bom === false ? 'rgb(224 87 78 / .15)' : 'rgb(47 158 110 / .15)', color: bom === false ? '#f08a82' : '#5fd1a0' }}>
            {comparacao.delta >= 0 ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
            {num(Math.abs(Math.round(comparacao.delta * 10) / 10))}{sufixo ?? ''}
          </span>
        )}
        {detalhe}
      </div>
      {meta != null && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="relative h-1.5 rounded-full bg-white/10">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, valor)}%`, background: LIMAO }} />
            </div>
            <p className="mt-1 flex justify-between text-[11px] text-gray-500">
              <span>Meta {num(meta)}%</span>
              <span>{valor < meta ? `faltam ${num(Math.round((meta - valor) * 10) / 10)} p.p.` : 'meta atingida'}</span>
            </p>
          </div>
          <AnelMeta valor={valor} />
        </div>
      )}
      {dados.length > 1 && meta == null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.cor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={t.cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={t.cor} strokeWidth={2} fill={`url(#${idGrad})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
}

function AnelMeta({ valor }: { valor: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(255 255 255 / .1)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={LIMAO} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${(Math.min(100, valor) / 100) * c} ${c}`} transform="rotate(-90 20 20)" />
    </svg>
  );
}

// ─── Pendências por cliente: barras em degradê ──────────────────────────────
export function BarrasClientesSafra({ dados, modo, selecionado, onSelecionar }: {
  dados: { id: number; nome: string; fardos: number; cargas: number }[];
  modo: Modo;
  selecionado?: number;
  onSelecionar: (id: number) => void;
}) {
  const chave = modo === 'fardos' ? 'fardos' : 'cargas';
  const ordenados = [...dados].sort((a, b) => b[chave] - a[chave]);
  const resto = ordenados.slice(8);
  const linhas = resto.length
    ? [...ordenados.slice(0, 8), { id: -1, nome: `Outros (${resto.length})`, fardos: resto.reduce((s, d) => s + d.fardos, 0), cargas: resto.reduce((s, d) => s + d.cargas, 0) }]
    : ordenados;
  if (!linhas.length) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, linhas.length * 30)}>
      <BarChart data={linhas} layout="vertical" margin={{ left: 4, right: 56 }} barCategoryGap={7}>
        <defs>
          <linearGradient id="safra-barra" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2e9a6b" />
            <stop offset="100%" stopColor={LIMAO} />
          </linearGradient>
        </defs>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="nome" width={112} tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgb(255 255 255 / .04)' }} content={({ active, payload }) => active && payload?.[0] ? (
          <Caixa>
            <p className="font-semibold">{payload[0].payload.nome}</p>
            <p>{num(payload[0].payload.fardos)} fardos a carregar · {num(payload[0].payload.cargas)} carga(s)</p>
          </Caixa>
        ) : null} />
        <Bar dataKey={chave} radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => d.id > 0 && onSelecionar(d.id)}
          label={{ position: 'right', fontSize: 12, fontWeight: 700, fill: 'rgb(var(--g-800))', formatter: (v: number) => num(v) }}>
          {linhas.map((l) => (
            <Cell key={l.id} fill={l.id > 0 ? 'url(#safra-barra)' : 'var(--series-outros)'} opacity={selecionado && selecionado !== l.id ? 0.3 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Volume por filial: rosca segmentada com % no centro ────────────────────
const MAX_FILIAIS = 6;
export function RoscaFiliaisSafra({ dados, modo, selecionado, onSelecionar }: {
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
    ? [...principais, { id: -1, nome: `Outras (${resto.length})`, total: resto.reduce((s, d) => s + d.total, 0), cargas: resto.reduce((s, d) => s + d.cargas, 0) }]
    : principais;
  const cor = (id: number) => { const i = principais.findIndex((d) => d.id === id); return i >= 0 ? `var(--series-${i + 1})` : 'var(--series-outros)'; };
  const soma = dados.reduce((s, d) => s + d[chave], 0);
  const destaque = principais.find((d) => d.id === selecionado) ?? principais[0];
  const pct = (v: number) => (soma ? Math.round((v / soma) * 100) : 0);
  const lista = todas ? ordenados : fatias;
  if (!dados.length) return <Vazio />;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={fatias} dataKey={chave} nameKey="nome" innerRadius="70%" outerRadius="100%" paddingAngle={3} cornerRadius={5}
              stroke="none" cursor="pointer" onClick={(d: any) => (d.id > 0 ? onSelecionar(d.id) : setTodas(true))} isAnimationActive={false}>
              {fatias.map((d) => <Cell key={d.id} fill={cor(d.id)} opacity={selecionado && selecionado !== d.id ? 0.3 : 1} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {destaque && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <span className="font-display text-3xl font-bold text-gray-900">{pct(destaque[chave])}%</span>
            <span className="text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500">{destaque.nome}</span>
          </div>
        )}
      </div>
      <div className="w-full min-w-0">
        <ul className={`space-y-2.5 text-sm ${todas ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
          {lista.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => (d.id > 0 ? onSelecionar(d.id) : setTodas(true))}
                className={`w-full text-left ${selecionado && selecionado !== d.id ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor(d.id) }} />
                    <span className="truncate text-gray-800">{d.nome}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gray-600">{pct(d[chave])}%</span>
                </div>
                <div className="ml-[18px] mt-1 h-1 rounded-full bg-white/[.06]">
                  <div className="h-1 rounded-full" style={{ width: `${pct(d[chave])}%`, background: cor(d.id) }} />
                </div>
              </button>
            </li>
          ))}
        </ul>
        {resto.length > 0 && (
          <button type="button" onClick={() => setTodas((t) => !t)} className="mt-3 text-xs font-semibold text-[#c6f24e] hover:underline">
            {todas ? 'Mostrar só as principais' : `Ver todas as ${dados.length} filiais`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Linha do tempo com marcador HOJE ───────────────────────────────────────
export function LinhaDoTempoSafra({ dados, modo, dia, situacao, onDia, onSituacao }: {
  dados: any[];
  modo: Modo;
  dia?: string;
  situacao?: string;
  onDia: (dia: string) => void;
  onSituacao: (s: SituacaoPrazo) => void;
}) {
  const prefixo = modo === 'fardos' ? '' : 'cargas';
  const hoje = dados[1]?.rotulo; // primeiro balde depois de "Vencidas" é hoje
  const temDados = dados.some((d) => SITUACOES.some((s) => d[`${prefixo}${s.chave}`] > 0));
  return (
    <>
      <div className="mb-2 flex flex-wrap justify-end gap-3">
        {SITUACOES.map(({ chave, rotulo, cor }) => (
          <button key={chave} type="button" onClick={() => onSituacao(chave)}
            className={`flex items-center gap-1.5 text-xs ${situacao && situacao !== chave ? 'opacity-40' : 'text-gray-600'} ${situacao === chave ? 'font-semibold text-gray-900' : ''}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: cor }} />{rotulo}
          </button>
        ))}
      </div>
      {!temDados ? <Vazio texto="Nenhum deadline nas próximas 3 semanas para este filtro" /> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dados} margin={{ left: -18, right: 4, top: 16 }} barCategoryGap={5}>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / .05)" />
            <XAxis dataKey="rotulo" tick={eixo} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} />
            {hoje && <ReferenceLine x={hoje} stroke={LIMAO} strokeDasharray="3 3" label={{ value: 'HOJE', position: 'top', fill: LIMAO, fontSize: 10, fontWeight: 700 }} />}
            <Tooltip cursor={{ fill: 'rgb(255 255 255 / .04)' }} content={({ active, payload }) => active && payload?.length ? (
              <Caixa>
                <p className="mb-1 font-semibold">{payload[0].payload.dia === 'vencidas' ? 'Já vencidas' : `Deadline ${payload[0].payload.rotulo}`}</p>
                {SITUACOES.filter((s) => payload[0].payload[`${prefixo}${s.chave}`] > 0).map((s) => (
                  <p key={s.chave} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />{s.rotulo}: {num(payload[0].payload[`${prefixo}${s.chave}`])} {modo}
                  </p>
                ))}
              </Caixa>
            ) : null} />
            {SITUACOES.map((s, i) => (
              <Bar key={s.chave} dataKey={`${prefixo}${s.chave}`} stackId="prazo" fill={s.cor}
                radius={i === SITUACOES.length - 1 ? [5, 5, 0, 0] : 0} cursor="pointer"
                onClick={(d: any) => (d.dia !== 'vencidas' ? onDia(d.dia) : onSituacao('VENCIDO'))}>
                {dados.map((d) => <Cell key={d.dia} opacity={dia && dia !== d.dia ? 0.3 : 1} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

// ─── Atividade ao vivo com ícones ───────────────────────────────────────────
const ICONE_EVENTO: Record<TipoEvento, { Icone: typeof TruckIcon; cor: string }> = {
  lancado: { Icone: PlusCircleIcon, cor: '#c6f24e' },
  etapa: { Icone: TruckIcon, cor: '#1ea2b6' },
  sm: { Icone: ShieldCheckIcon, cor: '#8f6fdf' },
  agenda: { Icone: CalendarDaysIcon, cor: '#d99a2b' },
  inativo: { Icone: NoSymbolIcon, cor: '#e0574e' },
  rastreio: { Icone: MapPinIcon, cor: '#2f9e6e' },
  outro: { Icone: BanknotesIcon, cor: '#8c9b93' },
};

export function AtividadeSafra({ itens }: { itens: any[] }) {
  if (!itens.length) return <Vazio texto="Sem alterações recentes" />;
  return (
    <ul className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
      {itens.map((a) => {
        const { Icone, cor } = ICONE_EVENTO[tipoAtividade(a)];
        return (
          <li key={a.id}>
            <Link to={`/liberacoes/${a.liberacaoId}${a.veiculoId ? `#veiculo-${a.veiculoId}` : ''}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[.04]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${cor}1f`, color: cor }}>
                <Icone className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-gray-800">
                  {a.tabela === 'Veiculo' && <strong className="font-mono text-gray-900">{a.descricao} </strong>}
                  {descreverAtividade(a)}
                </span>
                <span className="block truncate text-xs text-gray-500">{a.instrucao} · {a.usuario}</span>
              </span>
              <span className="shrink-0 text-[11px] text-gray-500">{tempoRelativo(a.em)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SeloAoVivo() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
      style={{ background: 'rgb(47 158 110 / .15)', color: '#5fd1a0' }}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5fd1a0]" />AO VIVO
    </span>
  );
}
