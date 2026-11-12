import { useState } from 'react';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { STATUS_LABELS, VeiculoStatus } from '@/utils/status';
import { formatMoney } from '@/utils/format';

// Carroceria vem no nome do modelo de carreta ("RODOTREM SIDER", "LS GRANELEIRO"):
// VEÍCULO = o resto do nome; MODELO = a carroceria.
const CARROCERIAS = ['SIDER', 'GRANELEIRO'];
export function partesModelo(nomeDescricao?: string | null) {
  const nome = (nomeDescricao ?? '').trim().toUpperCase();
  const carroceria = CARROCERIAS.find((c) => nome.split(/\s+/).includes(c)) ?? '';
  const veiculo = carroceria ? nome.split(/\s+/).filter((p) => p !== carroceria).join(' ') : nome;
  return { veiculo: veiculo || nome, modelo: carroceria };
}

const metros = (m?: number | null) => (m == null ? '' : m.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));

interface DadosInforme {
  comprimento: string;
  altura: string;
  captacao: string;
}

// Texto no formato da mensagem "ORDENS COTTON" do WhatsApp.
export function textoInforme(v: any, lib: any, posicao: number, dados: DadosInforme) {
  const { veiculo, modelo } = partesModelo(v.modeloCarreta?.nomeDescricao);
  const hoje = new Date().toLocaleDateString('pt-BR');
  const altura = dados.altura ? Number(dados.altura.replace(',', '.')) : null;
  return [
    `ORDENS COTTON ${hoje}`,
    '',
    `${posicao} - ${v.placa}`,
    `VEÍCULO: ${veiculo || '—'}`,
    `MODELO: ${modelo || '—'}`,
    `CUMPRIMENTO: ${dados.comprimento || '—'}`,
    `ALTURA: ${altura != null && !Number.isNaN(altura) ? metros(altura) : '—'}`,
    `CAPACIDADE: ${v.qtdFardos} FARDOS`,
    `ORIGEM: ${lib.origemNome ?? lib.terminal?.nome ?? '—'}`,
    `COLETA: ${lib.localColetaNome ?? lib.localColeta?.nome ?? '—'}`,
    `DESTINO: ${lib.destinoNome ?? lib.destino?.nome ?? '—'}`,
    `CAPTAÇÃO: ${dados.captacao || '—'}`,
    `CADASTRO: ${v.cadastradoPor || '—'}`,
    `FRETE: ${formatMoney(v.freteMotorista)}/t`,
    `PAGAMENTO: ${v.formaPagamento || '—'}`,
    `STATUS: ${STATUS_LABELS[v.status as VeiculoStatus] ?? v.status}`,
  ].join('\n');
}

// Linha embaixo da placa depois de preencher o Informe.
export function LinhaInforme({ v }: { v: any }) {
  if (!v.comprimento && v.altura == null && !v.captacao) {
    return <p className="text-[10px] font-medium text-amber-600">Informe pendente</p>;
  }
  const { modelo } = partesModelo(v.modeloCarreta?.nomeDescricao);
  const partes = [
    modelo,
    v.comprimento,
    v.altura != null && `alt. ${metros(v.altura)} m`,
    `cap. ${v.qtdFardos} fardos`,
    v.captacao && `Captação: ${v.captacao}`,
    v.cadastradoPor && `Cadastro: ${v.cadastradoPor}`,
  ].filter(Boolean);
  return <p className="text-[10px] text-gray-500 max-w-[260px] truncate" title={partes.join(' · ')}>{partes.join(' · ')}</p>;
}

interface Props {
  v: any;
  lib: any;
  posicao: number;
  captacoes: string[];
  salvar: (campos: Record<string, unknown>) => Promise<unknown>;
  // Sem permissão de alterar veículo: só vê e copia o texto.
  somenteLeitura?: boolean;
  onClose: () => void;
}

export default function InformeModal({ v, lib, posicao, captacoes, salvar, somenteLeitura, onClose }: Props) {
  const [dados, setDados] = useState<DadosInforme>({
    comprimento: v.comprimento ?? '',
    altura: v.altura != null ? String(v.altura).replace('.', ',') : '',
    captacao: v.captacao ?? '',
  });
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const texto = textoInforme(v, lib, posicao, dados);
  const set = (campo: keyof DadosInforme, valor: string) => setDados((d) => ({ ...d, [campo]: valor }));

  const alturaNumero = dados.altura.trim() ? Number(dados.altura.replace(',', '.')) : null;
  const alturaInvalida = alturaNumero != null && (Number.isNaN(alturaNumero) || alturaNumero <= 0 || alturaNumero > 10);

  async function gravar() {
    if (alturaInvalida) return toast.error('Altura em metros (ex.: 2,75)');
    setSalvando(true);
    try {
      await salvar({ comprimento: dados.comprimento.trim() || null, altura: alturaNumero, captacao: dados.captacao.trim() || null });
      onClose();
    } finally {
      setSalvando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('Não foi possível copiar — selecione o texto e copie manualmente');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-800">Informe · {v.placa}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4 p-6">
          <fieldset disabled={somenteLeitura} className="grid grid-cols-3 gap-3">
            <label className="block text-xs text-gray-500">Comprimento
              <input value={dados.comprimento} onChange={(e) => set('comprimento', e.target.value.toUpperCase())} placeholder="12.35X12.35"
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm" />
            </label>
            <label className="block text-xs text-gray-500">Altura (m)
              <input value={dados.altura} onChange={(e) => set('altura', e.target.value)} placeholder="2,75" inputMode="decimal"
                className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${alturaInvalida ? 'border-red-400' : 'border-gray-200'}`} />
            </label>
            <label className="block text-xs text-gray-500">Captação
              <input value={dados.captacao} onChange={(e) => set('captacao', e.target.value)} placeholder="Quem captou" list="sugestoes-captacao"
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm" />
              <datalist id="sugestoes-captacao">{captacoes.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
          </fieldset>
          <pre className="max-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-lg border bg-gray-50 p-3 font-mono text-xs text-gray-800">{texto}</pre>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5">
          <button onClick={copiar} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {copiado ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
            {copiado ? 'Copiado' : 'Copiar dados'}
          </button>
          {!somenteLeitura && <button onClick={gravar} disabled={salvando}
            className="rounded-lg bg-ui-primary px-4 py-2 text-sm font-medium text-white hover:bg-ui-primary-hover disabled:opacity-60">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>}
        </div>
      </div>
    </div>
  );
}
