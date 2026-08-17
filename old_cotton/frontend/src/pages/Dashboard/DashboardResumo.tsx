import { TruckIcon, ExclamationTriangleIcon, CubeIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

interface Props {
  data?: {
    cargasAtivas: number;
    emRisco: number;
    volumePendente: number;
    taxaCumprimento: number;
    vencidas: number;
    em3Dias: number;
  };
  loading?: boolean;
}

export default function DashboardResumo({ data, loading }: Props) {
  const cards = [
    {
      label: 'Cargas Ativas',
      value: data?.cargasAtivas ?? 0,
      icon: TruckIcon,
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Em Risco (≤ 3 dias)',
      value: data?.emRisco ?? 0,
      icon: ExclamationTriangleIcon,
      color: data?.emRisco ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700',
      iconBg: data?.emRisco ? 'bg-red-100' : 'bg-gray-100',
      sub: data ? `${data.vencidas} vencidas · ${data.em3Dias} vencendo` : '',
    },
    {
      label: 'Fardos Pendentes',
      value: data?.volumePendente?.toLocaleString('pt-BR') ?? 0,
      icon: CubeIcon,
      color: 'bg-amber-50 text-amber-700',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Taxa de Cumprimento',
      value: `${data?.taxaCumprimento ?? 0}%`,
      icon: CheckBadgeIcon,
      color: 'bg-green-50 text-green-700',
      iconBg: 'bg-green-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((_, i) => (
          <div key={i} className="bg-white rounded-xl border h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {cards.map((c) => (
        <div key={c.label} className={`bg-white rounded-2xl border border-slate-200/70 p-5 flex items-center gap-4 shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 group`}>
          <div className={`p-3 rounded-xl ${c.iconBg} ${c.color} group-hover:scale-110 transition-transform duration-300`}>
            <c.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-3xl font-display font-bold text-slate-800 mt-1">{c.value}</p>
            {c.sub && <p className="text-xs font-medium text-slate-400 mt-1">{c.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
