import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(value?: string | Date | null, fmt = 'dd/MM/yyyy') {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? format(d, fmt, { locale: ptBR }) : '—';
}

export function formatDateTime(value?: string | Date | null) {
  return formatDate(value, 'dd/MM/yyyy HH:mm');
}

export function formatMoney(value?: number | null) {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatTelefone(tel?: string | null) {
  if (!tel) return '—';
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

export function formatToneladas(valor?: number | null) {
  if (valor == null) return '—';
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t`;
}

// Peso: o banco guarda toneladas; o usuário digita kg (como vem da balança/NF).
export const kgParaToneladas = (kg: number) => kg / 1000;
export const toneladasParaKg = (t: number) => Math.round(t * 1000 * 1000) / 1000;

// "35,760 t" — 3 casas, para não confundir kg com t.
export function formatPeso(toneladas?: number | null) {
  if (toneladas == null) return '—';
  return `${toneladas.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} t`;
}

export function formatCpf(cpf?: string | null) {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}
