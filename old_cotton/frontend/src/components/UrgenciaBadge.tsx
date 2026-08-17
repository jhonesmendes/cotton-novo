import clsx from 'clsx';

const MAP: Record<string, { label: string; cls: string }> = {
  VENCIDO:   { label: 'VENCIDO',   cls: 'badge-vencido' },
  HOJE:      { label: 'HOJE',      cls: 'badge-hoje' },
  CRITICO:   { label: 'CRÍTICO',   cls: 'badge-critico' },
  ALERTA:    { label: 'ALERTA',    cls: 'badge-alerta' },
  MONITORAR: { label: 'MONITORAR', cls: 'badge-monitorar' },
  OK:        { label: 'OK',        cls: 'badge-ok' },
};

export default function UrgenciaBadge({ nivel }: { nivel: string }) {
  const m = MAP[nivel] ?? MAP.OK;
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full', m.cls)}>
      {m.label}
    </span>
  );
}
