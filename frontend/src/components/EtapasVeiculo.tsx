import { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { STATUS_LABELS, STATUS_OPTIONS, VeiculoStatus, isCarregado } from '@/utils/status';

// Trilha das 8 etapas do veículo, clicável: clique numa etapa → confirma → muda o status.
// A confirmação evita mudar o status por um clique sem querer.
export default function EtapasVeiculo({ status, onMudar, desabilitado, salvando }: {
  status: VeiculoStatus;
  onMudar: (novo: VeiculoStatus) => void;
  desabilitado?: boolean;
  salvando?: boolean;
}) {
  const [proposta, setProposta] = useState<VeiculoStatus | null>(null);
  const atual = STATUS_OPTIONS.indexOf(status);

  return (
    <div className="w-full">
      <ol className="flex w-full gap-1" aria-label="Etapas do veículo">
        {STATUS_OPTIONS.map((etapa, i) => {
          const feita = i < atual;
          const ehAtual = i === atual;
          const proposto = proposta === etapa;
          const cor = ehAtual
            ? etapa === 'FINALIZADO' ? 'bg-green-600' : isCarregado(etapa) ? 'bg-indigo-600' : 'bg-amber-500'
            : feita ? 'bg-indigo-300' : 'bg-gray-200';
          return (
            <li key={etapa} className="min-w-0 flex-1">
              <button type="button" disabled={desabilitado || salvando || ehAtual}
                onClick={() => setProposta(etapa)}
                title={`${i + 1}. ${STATUS_LABELS[etapa]}`}
                aria-current={ehAtual ? 'step' : undefined}
                className={`group block w-full text-left disabled:cursor-default ${proposto ? 'ring-2 ring-indigo-500 ring-offset-1 rounded' : ''}`}>
                <span className={`block h-2 rounded-sm transition-colors ${cor} ${!ehAtual && !desabilitado ? 'group-hover:bg-indigo-400' : ''}`} />
                <span className={`mt-1 hidden truncate text-[10px] leading-tight lg:block ${ehAtual ? 'font-bold text-gray-900' : 'text-gray-400'}`}>
                  {STATUS_LABELS[etapa]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-1 flex min-h-[22px] items-center gap-2 text-xs">
        {proposta ? (
          <>
            <span className="text-gray-700">Mudar para <strong>{STATUS_LABELS[proposta]}</strong>?</span>
            <button type="button" onClick={() => { onMudar(proposta); setProposta(null); }}
              className="inline-flex items-center gap-1 rounded bg-ui-primary px-2 py-0.5 font-semibold text-white">
              <CheckIcon className="h-3.5 w-3.5" />Confirmar
            </button>
            <button type="button" onClick={() => setProposta(null)} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-gray-600">
              <XMarkIcon className="h-3.5 w-3.5" />Cancelar
            </button>
          </>
        ) : (
          <span className="text-gray-500 lg:hidden">Etapa: <strong className="text-gray-800">{STATUS_LABELS[status]}</strong></span>
        )}
      </div>
    </div>
  );
}
