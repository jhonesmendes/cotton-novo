import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useThemeStore } from '@/stores/theme.store';
import type { PontoSerie } from './tipos';

// Paleta categórica validada (dataviz/validate_palette) contra as superfícies do
// sistema: claro #ffffff e escuro #1e293b. Concluídas = slot 1, Abertas = slot 2.
const CORES = {
  light: { concluidas: '#2a78d6', abertas: '#eb6834', grade: '#e5e7eb', eixo: '#6b7280', tooltipBg: '#ffffff', tooltipBorda: '#e5e7eb', texto: '#111827' },
  dark: { concluidas: '#3987e5', abertas: '#d95926', grade: '#334155', eixo: '#94a3b8', tooltipBg: '#0f172a', tooltipBorda: '#334155', texto: '#f1f5f9' },
};

function useCores() {
  return CORES[useThemeStore((s) => s.theme) === 'dark' ? 'dark' : 'light'];
}

function Cartao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <div className="ui-card p-4">
      <h3 className="text-sm font-semibold text-ui-text">{titulo}</h3>
      <p className="text-xs text-ui-text-muted mb-3">{descricao}</p>
      {children}
    </div>
  );
}

export function GraficoAbertasConcluidas({ serie }: { serie: PontoSerie[] }) {
  const c = useCores();
  return (
    <Cartao titulo="Abertas x Concluídas" descricao="Liberações abertas (data de liberação) e concluídas (data de conclusão) em cada período">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={serie} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grade} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: c.eixo }} tickLine={false} axisLine={{ stroke: c.grade }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.eixo }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: c.grade, opacity: 0.4 }}
            contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorda}`, borderRadius: 8, fontSize: 12, color: c.texto }}
            labelStyle={{ color: c.texto, fontWeight: 600 }}
            itemStyle={{ color: c.texto }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: c.eixo }} iconType="square" />
          <Bar dataKey="concluidas" name="Concluídas" fill={c.concluidas} isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="abertas" name="Abertas" fill={c.abertas} isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </Cartao>
  );
}

export function GraficoFardosEntregues({ serie }: { serie: PontoSerie[] }) {
  const c = useCores();
  return (
    <Cartao titulo="Fardos entregues por período" descricao="Fardos carregados nas liberações concluídas em cada período">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={serie} barCategoryGap="22%" margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grade} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: c.eixo }} tickLine={false} axisLine={{ stroke: c.grade }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: c.eixo }} tickLine={false} axisLine={false} tickFormatter={(v) => Number(v).toLocaleString('pt-BR')} />
          <Tooltip
            cursor={{ fill: c.grade, opacity: 0.4 }}
            formatter={(v) => [`${Number(v).toLocaleString('pt-BR')} fardos`, 'Entregues']}
            contentStyle={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorda}`, borderRadius: 8, fontSize: 12, color: c.texto }}
            labelStyle={{ color: c.texto, fontWeight: 600 }}
            itemStyle={{ color: c.texto }}
          />
          <Bar dataKey="fardosEntregues" name="Fardos entregues" fill={c.concluidas} isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </Cartao>
  );
}
