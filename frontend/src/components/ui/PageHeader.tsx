import type { ReactNode } from 'react';
import { useThemeStore } from '@/stores/theme.store';

// Cabeçalho de página. No estilo Lavoura vira uma faixa na cor da marca.
export default function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  const faixa = useThemeStore((s) => s.estilo) === 'LAVOURA';
  if (faixa) {
    return (
      <header className="ui-faixa flex flex-col gap-4 rounded-ui-xl px-6 py-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-white/75">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
    );
  }
  return <header className="ui-page-header"><div><h1 className="text-2xl font-bold tracking-tight text-ui-text">{title}</h1>{description && <p className="mt-1 text-sm text-ui-text-muted">{description}</p>}</div>{action && <div>{action}</div>}</header>;
}
