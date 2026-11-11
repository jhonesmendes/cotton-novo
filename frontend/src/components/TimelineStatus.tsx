import React from 'react';
import { CheckCircleIcon, TruckIcon, ArchiveBoxIcon, MapPinIcon, DocumentCheckIcon, CalendarDaysIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { STATUS_DESCRICOES, STATUS_LABELS, STATUS_OPTIONS, VeiculoStatus, isCarregado } from '@/utils/status';

type StepKey = VeiculoStatus | 'INATIVO';

interface StatusStep {
  key: StepKey;
  label: string;
  description: string;
  icon: React.ReactElement;
  color: string;
  bgColor: string;
  borderColor: string;
}

const ICONES: Record<VeiculoStatus, React.ReactElement> = {
  AGUARDANDO_GR: <ShieldCheckIcon className="w-4 h-4" />,
  TRANSITO_CARREGAMENTO: <TruckIcon className="w-4 h-4" />,
  LOCAL: <MapPinIcon className="w-4 h-4" />,
  MANIFESTADO: <DocumentCheckIcon className="w-4 h-4" />,
  FALTA_AGENDAR: <TruckIcon className="w-4 h-4" />,
  AGENDADO: <CalendarDaysIcon className="w-4 h-4" />,
  AGUARDANDO_DESCARGA: <ArchiveBoxIcon className="w-4 h-4" />,
  FINALIZADO: <CheckCircleIcon className="w-4 h-4" />,
};

// Programado (antes de carregar) em âmbar; carregado em azul; finalizado em verde.
function cores(status: VeiculoStatus) {
  if (status === 'FINALIZADO') return { color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-300' };
  if (isCarregado(status)) return { color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
  return { color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' };
}

const STATUS_FLOW: StatusStep[] = STATUS_OPTIONS.map((key) => ({
  key,
  label: STATUS_LABELS[key],
  description: STATUS_DESCRICOES[key],
  icon: ICONES[key],
  ...cores(key),
}));

const INATIVO_STEP: StatusStep = {
  key: 'INATIVO',
  label: 'INATIVO',
  description: 'Veículo excluído (inativado) — fora das somas',
  icon: <NoSymbolIcon className="w-4 h-4" />,
  color: 'text-gray-600',
  bgColor: 'bg-gray-100',
  borderColor: 'border-gray-300',
};

interface TimelineStatusProps {
  status: VeiculoStatus;
  ativo?: boolean;
  dataAgendamento?: string | null;
  dataCarregamento?: string | null;
  dataDescarga?: string | null;
  compact?: boolean;
}

function formatDateTime(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getStepDate(stepKey: StepKey, dataAgendamento?: string | null, dataCarregamento?: string | null, dataDescarga?: string | null): string | null {
  switch (stepKey) {
    case 'MANIFESTADO':
      return formatDateTime(dataCarregamento);
    case 'AGENDADO':
      return formatDateTime(dataAgendamento);
    case 'FINALIZADO':
      return formatDateTime(dataDescarga);
    default:
      return null;
  }
}

export default function TimelineStatus({ status, ativo = true, dataAgendamento, dataCarregamento, dataDescarga, compact = false }: TimelineStatusProps) {
  const inativo = !ativo;
  const posicao = STATUS_FLOW.findIndex((s) => s.key === status);
  const steps = inativo ? [...STATUS_FLOW, INATIVO_STEP] : STATUS_FLOW;
  // Inativo: mostra até onde chegou e a etapa final "INATIVO" como atual.
  const currentIndex = inativo ? steps.length - 1 : posicao;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FLOW.map((step, idx) => {
          const isDone = idx < posicao || (inativo && idx === posicao);
          const isActive = idx === posicao && !inativo;
          return (
            <div key={step.key} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                isActive
                  ? `${step.bgColor} ${step.color} ${step.borderColor}`
                  : isDone
                  ? 'bg-green-50 text-green-600 border-green-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
                <span className={isActive ? step.color : isDone ? 'text-green-500' : 'text-gray-300'}>
                  {isDone ? <CheckCircleIcon className="w-3 h-3" /> : step.icon}
                </span>
                {step.label}
              </div>
              {idx < STATUS_FLOW.length - 1 && (
                <div className={`h-px w-3 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />

      <div className="space-y-0">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isDone = !isActive && (inativo ? idx <= posicao : idx < currentIndex);
          const isPending = !isDone && !isActive;
          const date = getStepDate(step.key, dataAgendamento, dataCarregamento, dataDescarga);

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
              <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                isActive
                  ? `${step.bgColor} ${step.borderColor} shadow-md`
                  : isDone
                  ? 'bg-green-100 border-green-400 shadow-sm'
                  : 'bg-white border-gray-200'
              }`}>
                {isDone
                  ? <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  : React.cloneElement(step.icon, { className: `w-5 h-5 ${isActive ? step.color : 'text-gray-300'}` })}
              </div>

              <div className={`flex-1 min-w-0 pt-1.5 transition-opacity ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${isActive ? step.color : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                    <span className="mr-1 text-[10px] font-semibold text-gray-400">{step.key === 'INATIVO' ? '' : `${idx + 1}.`}</span>
                    {step.label}
                    {isActive && (
                      <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${step.bgColor} ${step.color}`}>
                        ATUAL
                      </span>
                    )}
                    {isDone && (
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        ✓ CONCLUÍDO
                      </span>
                    )}
                  </span>
                  {date && <span className="text-[10px] text-gray-400 font-mono">{date}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
