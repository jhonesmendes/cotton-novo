import React from 'react';
import { CheckCircleIcon, ClockIcon, TruckIcon, ArchiveBoxIcon } from '@heroicons/react/24/solid';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { STATUS_LABELS, VeiculoStatus } from '@/utils/status';

// "AGUARDANDO_CTE" ainda não existe como StatusVeiculo real no sistema — é só uma
// etapa decorativa pedida pro painel visual; nenhum veículo nunca fica "atual" nela
// de verdade (ver conversa sobre criar o status pra valer, se decidirem adotar).
type StatusStepKey = VeiculoStatus | 'AGUARDANDO_CTE';

interface StatusStep {
  key: StatusStepKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STATUS_FLOW: StatusStep[] = [
  {
    key: 'SOLICITADO',
    label: STATUS_LABELS.SOLICITADO,
    description: 'Instrução recebida do cliente',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  {
    key: 'FALTA_CONTRATAR',
    label: STATUS_LABELS.FALTA_CONTRATAR,
    description: 'Falta contratar caminhão',
    icon: <XCircleIcon className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
  {
    key: 'AGUARDANDO_GR',
    label: STATUS_LABELS.AGUARDANDO_GR,
    description: 'Aguardando liberação pelo GR',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  {
    key: 'LIBERADO',
    label: STATUS_LABELS.LIBERADO,
    description: 'Cadastro liberado pelo GR',
    icon: <CheckCircleIcon className="w-4 h-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
  },
  {
    key: 'EM_TRANSITO',
    label: STATUS_LABELS.EM_TRANSITO,
    description: 'Veículo em trânsito para o carregamento',
    icon: <TruckIcon className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  {
    key: 'AGUARDANDO_CARREGAMENTO',
    label: STATUS_LABELS.AGUARDANDO_CARREGAMENTO,
    description: 'Veículo no local aguardando carregamento',
    icon: <ArchiveBoxIcon className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  {
    key: 'CARREGADO',
    label: STATUS_LABELS.CARREGADO,
    description: 'Veículo carregado aguardando manifesto',
    icon: <ArchiveBoxIcon className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  {
    key: 'AGUARDANDO_NFE',
    label: 'AGUARDANDO NF-e',
    description: 'Aguardando troca de nota',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  {
    key: 'AGUARDANDO_CTE',
    label: 'AGUARDANDO CT-e',
    description: 'Aguardando filial enviar o manifesto',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  {
    key: 'FALTA_AGENDAR',
    label: STATUS_LABELS.FALTA_AGENDAR,
    description: 'Veículo em trânsito para o destino',
    icon: <TruckIcon className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  {
    key: 'AGENDADO',
    label: STATUS_LABELS.AGENDADO,
    description: 'Veículo agendado para descarregar',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  {
    key: 'AGUARDANDO_DESCARGA',
    label: STATUS_LABELS.AGUARDANDO_DESCARGA,
    description: 'Aguardando descarga no destino',
    icon: <ClockIcon className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  {
    key: 'FINALIZADO',
    label: STATUS_LABELS.FINALIZADO,
    description: 'Transporte finalizado com sucesso',
    icon: <CheckCircleIcon className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
];

const CANCELADO_STEP: StatusStep = {
  key: 'CANCELADO',
  label: STATUS_LABELS.CANCELADO,
  description: 'Operação cancelada',
  icon: <XCircleIcon className="w-4 h-4" />,
  color: 'text-red-600',
  bgColor: 'bg-red-100',
  borderColor: 'border-red-300',
};

interface TimelineStatusProps {
  status: VeiculoStatus;
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

function getStepDate(stepKey: StatusStepKey, dataAgendamento?: string | null, dataCarregamento?: string | null, dataDescarga?: string | null): string | null {
  switch (stepKey) {
    case 'AGENDADO':
    case 'LIBERADO':
    case 'AGUARDANDO_NFE':
    case 'AGUARDANDO_GR':
    case 'AGUARDANDO_CARREGAMENTO':
      return formatDateTime(dataAgendamento);
    case 'CARREGADO':
    case 'EM_TRANSITO':
    case 'AGUARDANDO_DESCARGA':
      return formatDateTime(dataCarregamento);
    case 'FINALIZADO':
      return formatDateTime(dataDescarga);
    default:
      return null;
  }
}

export default function TimelineStatus({ status, dataAgendamento, dataCarregamento, dataDescarga, compact = false }: TimelineStatusProps) {
  const isCancelled = status === 'CANCELADO';

  const steps = isCancelled
    ? [...STATUS_FLOW, CANCELADO_STEP]
    : STATUS_FLOW;

  const currentIndex = isCancelled
    ? steps.length - 1
    : STATUS_FLOW.findIndex((s) => s.key === status);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FLOW.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isActive = idx === currentIndex && !isCancelled;
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
          const isDone = isCancelled
            ? idx < steps.length - 1
            : idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPending = !isDone && !isActive;

          const date = isCancelled && isActive
            ? null
            : getStepDate(step.key, dataAgendamento, dataCarregamento, dataDescarga);

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
              {/* Circle */}
              <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                isActive
                  ? `${step.bgColor} ${step.borderColor} shadow-md ring-4 ring-${step.bgColor}/30`
                  : isDone
                  ? 'bg-green-100 border-green-400 shadow-sm'
                  : 'bg-white border-gray-200'
              }`}>
                <span className={
                  isActive ? step.color
                  : isDone ? 'text-green-600'
                  : 'text-gray-300'
                }>
                  {isDone
                    ? <CheckCircleIcon className="w-5 h-5" />
                    : React.cloneElement(step.icon as React.ReactElement, {
                        className: `w-5 h-5 ${isActive ? step.color : 'text-gray-300'}`
                      })
                  }
                </span>
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 pt-1.5 transition-opacity ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${
                    isActive ? step.color
                    : isDone ? 'text-green-700'
                    : 'text-gray-400'
                  }`}>
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
                  {date && (
                    <span className="text-[10px] text-gray-400 font-mono">{date}</span>
                  )}
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
