import { useState } from 'react';
import Popover from '@/components/Popover';
import { RASTREAMENTO_LABELS, RASTREAMENTO_OPTIONS, StatusRastreamento } from '@/utils/status';
import { formatMoney, formatPeso, kgParaToneladas, toneladasParaKg } from '@/utils/format';

// Edição rápida na linha do veículo ("clique altera"), sem abrir o modal.
// Cada componente chama `salvar` com só os campos alterados (PUT /veiculos/:id)
// e fecha o popover quando dá certo; tudo entra na auditoria como antes.
type Salvar = (campos: Record<string, unknown>) => Promise<unknown>;

// Bolinha de situação: verde = ok, amarelo = falta informar, vermelho = risco.
// Sempre acompanha o texto escrito — a cor não carrega a informação sozinha.
type Sinal = 'ok' | 'pendente' | 'risco';
const COR_SINAL: Record<Sinal, string> = { ok: 'var(--status-good)', pendente: 'var(--status-warning)', risco: 'var(--status-critical)' };
function Bolinha({ sinal }: { sinal: Sinal }) {
  return <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle" style={{ background: COR_SINAL[sinal] }} />;
}
const sinalRastreamento = (s: string): Sinal => (s === 'PENDENTE' ? 'pendente' : s === 'NAO_RASTREADO' ? 'risco' : 'ok');
const sinalIsca = (v: any): Sinal => (v.possuiIsca === false ? 'risco' : v.possuiIsca === true && v.numeroIsca ? 'ok' : 'pendente');

// ─── Rastreamento + isca ────────────────────────────────────────────────────
export function RastreamentoIscaRapido({ v, salvar, desabilitado }: { v: any; salvar: Salvar; desabilitado?: boolean }) {
  const pendente = v.statusRastreamento === 'PENDENTE';
  return (
    <Popover desabilitado={desabilitado} titulo="Rastreamento e isca" className="min-w-[130px]"
      gatilho={
        <>
          <p className="text-[10px] text-gray-500">Rastreamento</p>
          <p className={`flex items-center text-xs font-semibold ${pendente ? 'text-amber-600' : 'text-gray-800'}`}>
            <Bolinha sinal={sinalRastreamento(v.statusRastreamento)} />
            {RASTREAMENTO_LABELS[v.statusRastreamento as StatusRastreamento] ?? v.statusRastreamento}
          </p>
          <p className="mt-0.5 flex items-center text-xs">
            <Bolinha sinal={sinalIsca(v)} />
            {v.possuiIsca === true
              ? <span className="text-gray-800">Isca <span className="font-mono">{v.numeroIsca || 'sem número'}</span></span>
              : v.possuiIsca === false
              ? <span className="text-gray-500">Não possui isca</span>
              : <span className="text-amber-600">Isca pendente</span>}
          </p>
        </>
      }>
      {(fechar) => <PainelRastreamento v={v} salvar={salvar} fechar={fechar} />}
    </Popover>
  );
}

function PainelRastreamento({ v, salvar, fechar }: { v: any; salvar: Salvar; fechar: () => void }) {
  const [numero, setNumero] = useState(v.numeroIsca ?? '');
  const [mostrarNumero, setMostrarNumero] = useState(v.possuiIsca === true);
  const [salvando, setSalvando] = useState(false);
  const enviar = async (campos: Record<string, unknown>, fecharDepois = true) => {
    setSalvando(true);
    try {
      await salvar(campos);
      if (fecharDepois) fechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {RASTREAMENTO_OPTIONS.filter((r) => r !== 'PENDENTE').map((r) => (
          <button key={r} type="button" disabled={salvando} onClick={() => enviar({ statusRastreamento: r }, false)}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              v.statusRastreamento === r ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {RASTREAMENTO_LABELS[r]}
          </button>
        ))}
      </div>
      <div className="border-t pt-3">
        <p className="mb-1.5 text-[11px] font-semibold text-gray-500">Possui isca?</p>
        <div className="flex gap-1.5">
          <button type="button" disabled={salvando} onClick={() => setMostrarNumero(true)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              mostrarNumero ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>Sim</button>
          <button type="button" disabled={salvando} onClick={() => { setMostrarNumero(false); enviar({ possuiIsca: false }); }}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
              v.possuiIsca === false && !mostrarNumero ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>Não</button>
        </div>
        {mostrarNumero && (
          <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (numero.trim()) enviar({ possuiIsca: true, numeroIsca: numero.trim() }); }}>
            <input autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número da isca"
              className="min-w-0 flex-1 rounded-lg border border-green-300 px-2 py-1.5 text-xs" />
            <button type="submit" disabled={salvando || !numero.trim()}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Salvar</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Carga: fardos, peso (kg) e frete motorista ─────────────────────────────
export function CargaRapida({ v, salvar, desabilitado, ocultarValores, pesoMedioFardoKg }: {
  v: any; salvar: Salvar; desabilitado?: boolean; ocultarValores?: boolean; pesoMedioFardoKg?: number | null;
}) {
  return (
    <Popover desabilitado={desabilitado} titulo="Carga" alinhar="direita"
      gatilho={
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{v.qtdFardos} fardos</p>
          <p className="text-xs text-gray-500">
            {v.pesoCarregado != null
              ? formatPeso(v.pesoCarregado)
              : <span className="text-amber-600" title="Estimado pelo peso médio da instrução">
                  sem peso{pesoMedioFardoKg != null && ` · ~${formatPeso((v.qtdFardos * pesoMedioFardoKg) / 1000)} estimado`}
                </span>}
          </p>
          <p className="text-xs text-gray-400">{ocultarValores ? 'R$ ••••••' : formatMoney(v.freteMotorista)}</p>
        </div>
      }>
      {(fechar) => <PainelCarga v={v} salvar={salvar} fechar={fechar} ocultarValores={ocultarValores} />}
    </Popover>
  );
}

function PainelCarga({ v, salvar, fechar, ocultarValores }: { v: any; salvar: Salvar; fechar: () => void; ocultarValores?: boolean }) {
  const [fardos, setFardos] = useState(String(v.qtdFardos ?? ''));
  const [pesoKg, setPesoKg] = useState(v.pesoCarregado != null ? String(toneladasParaKg(v.pesoCarregado)) : '');
  const [frete, setFrete] = useState(String(v.freteMotorista ?? ''));
  const [salvando, setSalvando] = useState(false);
  const kg = Number(pesoKg);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const campos: Record<string, unknown> = {};
    if (Number(fardos) !== v.qtdFardos) campos.qtdFardos = Number(fardos);
    const novoPeso = pesoKg === '' ? null : kgParaToneladas(kg);
    if (novoPeso !== v.pesoCarregado) campos.pesoCarregado = novoPeso;
    if (!ocultarValores && Number(frete) !== v.freteMotorista) campos.freteMotorista = Number(frete);
    if (!Object.keys(campos).length) return fechar();
    setSalvando(true);
    try {
      await salvar(campos);
      fechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    // Enter salva (submit do form); Esc fecha (Popover).
    <form onSubmit={enviar} className="w-[230px] space-y-2">
      <label className="block text-[11px] text-gray-500">Fardos
        <input autoFocus type="number" min={1} value={fardos} onChange={(e) => setFardos(e.target.value)}
          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-sm" />
      </label>
      <label className="block text-[11px] text-gray-500">Peso carregado (kg)
        <input type="number" min={0} value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="Ex: 35760"
          className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-sm" />
        {pesoKg !== '' && !Number.isNaN(kg) && (
          <span className={`text-[10px] ${kg > 60000 || kg < 1000 ? 'text-amber-600' : 'text-gray-400'}`}>
            {kg > 60000 ? 'Acima de 60.000 kg — confira' : kg < 1000 ? 'Abaixo de 1.000 kg — o campo é em kg' : `= ${formatPeso(kg / 1000)}`}
          </span>
        )}
      </label>
      {!ocultarValores && (
        <label className="block text-[11px] text-gray-500">Frete motorista (R$/t)
          <input type="number" step="0.01" min={0} value={frete} onChange={(e) => setFrete(e.target.value)}
            className="mt-0.5 w-full rounded-lg border px-2 py-1.5 text-sm" />
        </label>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={fechar} className="rounded-lg border px-3 py-1 text-xs">Cancelar</button>
        <button type="submit" disabled={salvando || !(Number(fardos) > 0)}
          className="rounded-lg bg-ui-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">Salvar</button>
      </div>
    </form>
  );
}

// ─── Forma de pagamento (chip) ──────────────────────────────────────────────
export function FormaPagamentoRapida({ v, opcoes, salvar, desabilitado }: { v: any; opcoes: string[]; salvar: Salvar; desabilitado?: boolean }) {
  return (
    <Popover desabilitado={desabilitado} titulo="Forma de pagamento combinada" className="mt-1 -ml-1.5"
      gatilho={v.formaPagamento
        ? <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">{v.formaPagamento}</span>
        : <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Pagamento pendente</span>}>
      {(fechar) => (
        <div className="flex flex-col gap-1">
          {[...new Set([...(v.formaPagamento ? [v.formaPagamento] : []), ...opcoes])].map((f) => (
            <button key={f} type="button" onClick={() => salvar({ formaPagamento: f }).then(fechar)}
              className={`rounded-lg border px-2 py-1.5 text-left text-xs font-semibold ${
                v.formaPagamento === f ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{f}</button>
          ))}
          <p className="mt-1 text-[10px] text-gray-400">Só informativo — conferência no ERP. Opções em Revisão de Dados.</p>
        </div>
      )}
    </Popover>
  );
}
