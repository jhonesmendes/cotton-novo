import { ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARIO, TermoCarga } from '@/utils/glossario';

// Dica ao passar o mouse (ou focar com o teclado) num número/rótulo de carga:
// mostra o rótulo, o nome simplificado, o valor e o que ele significa.
// Renderizada fora do card (portal), para não ser cortada por overflow.
export default function Dica({ termo, valor, children, className = '' }: {
  termo: TermoCarga;
  valor?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; acima: boolean } | null>(null);
  const g = GLOSSARIO[termo];

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const acima = r.bottom + 140 > window.innerHeight;
    setPos({ x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150), y: acima ? r.top - 8 : r.bottom + 8, acima });
  };

  return (
    <span ref={ref} tabIndex={0} onMouseEnter={abrir} onMouseLeave={() => setPos(null)} onFocus={abrir} onBlur={() => setPos(null)}
      className={`cursor-help underline decoration-dotted decoration-1 underline-offset-[3px] ${className}`}>
      {children}
      {pos && createPortal(
        <span role="tooltip"
          className="pointer-events-none fixed z-[70] w-[280px] rounded-lg border border-gray-200 bg-white p-3 text-left text-xs normal-case tracking-normal shadow-lg"
          style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.acima ? '-100%' : '0'})` }}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-gray-900">{g.rotulo}{g.simples && <span className="font-normal text-gray-500"> · {g.simples}</span>}</span>
            {valor != null && <span className="font-bold text-gray-900">{valor}</span>}
          </span>
          <span className="mt-1 block leading-snug text-gray-600">{g.explicacao}</span>
        </span>,
        document.body,
      )}
    </span>
  );
}
