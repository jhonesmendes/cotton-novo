import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Props {
  rotulo: string;
  opcoes: { id: number; nome: string }[];
  selecionados: number[];
  onChange: (ids: number[]) => void;
  todos?: string;
}

// Seleção de vários itens (ex: clientes, filiais) num dropdown com caixas de marcação.
export default function MultiSelect({ rotulo, opcoes, selecionados, onChange, todos = 'Todos' }: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const marcados = opcoes.filter((o) => selecionados.includes(o.id));
  const resumo = marcados.length === 0 ? todos : marcados.length === 1 ? marcados[0].nome : `${marcados.length} selecionados`;
  const visiveis = opcoes.filter((o) => o.nome.toLowerCase().includes(busca.toLowerCase()));
  const alternar = (id: number) =>
    onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);

  return (
    <div className="relative" ref={ref}>
      <span className="text-xs text-ui-text-muted mb-1 block">{rotulo}</span>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="ui-input flex items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${marcados.length ? 'text-ui-text font-medium' : ''}`}>{resumo}</span>
        <ChevronDownIcon className="w-4 h-4 shrink-0 text-ui-text-muted" />
      </button>
      {aberto && (
        <div className="absolute z-30 mt-1 w-full min-w-[220px] rounded-ui-md border border-ui-border bg-ui-surface shadow-lg">
          {opcoes.length > 8 && (
            <div className="p-2 border-b border-ui-border">
              <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="ui-input py-1 text-sm" />
            </div>
          )}
          <ul role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto py-1">
            {visiveis.map((o) => (
              <li key={o.id}>
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-ui-muted">
                  <input type="checkbox" checked={selecionados.includes(o.id)} onChange={() => alternar(o.id)} className="rounded" />
                  <span className="truncate">{o.nome}</span>
                </label>
              </li>
            ))}
            {visiveis.length === 0 && <li className="px-3 py-2 text-sm text-ui-text-muted">Nada encontrado</li>}
          </ul>
          {selecionados.length > 0 && (
            <div className="border-t border-ui-border p-2">
              <button type="button" onClick={() => onChange([])} className="text-xs text-ui-text-muted hover:text-ui-text">Limpar seleção</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
