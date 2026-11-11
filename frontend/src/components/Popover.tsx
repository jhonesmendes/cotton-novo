import { ReactNode, useEffect, useRef, useState } from 'react';

interface PopoverProps {
  // Conteúdo do gatilho (o bloco clicável da linha).
  gatilho: ReactNode;
  titulo?: string;
  desabilitado?: boolean;
  className?: string;
  // Recebe `fechar` para o conteúdo fechar o popover depois de salvar.
  children: (fechar: () => void) => ReactNode;
  alinhar?: 'esquerda' | 'direita';
}

// Popover simples: abre no clique, fecha no clique fora ou com Esc.
export default function Popover({ gatilho, titulo, desabilitado, className = '', children, alinhar = 'esquerda' }: PopoverProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const foraDoPopover = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', foraDoPopover);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', foraDoPopover);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" disabled={desabilitado} onClick={() => setAberto((a) => !a)} title={titulo}
        className="w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-indigo-50 disabled:cursor-default disabled:hover:bg-transparent">
        {gatilho}
      </button>
      {aberto && (
        <div className={`absolute z-30 mt-1 min-w-[240px] rounded-xl border bg-white p-3 shadow-xl ${alinhar === 'direita' ? 'right-0' : 'left-0'}`}>
          {titulo && <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{titulo}</p>}
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  );
}
