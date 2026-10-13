import type { ReactNode } from 'react';

export interface AcaoEscolha {
  label: string;
  onClick: () => void;
  variante?: 'primaria' | 'secundaria';
}

interface EscolhaModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  acoes: AcaoEscolha[];
  loading?: boolean;
  onClose: () => void;
}

// Aviso com várias saídas possíveis (ex: "já existe um parecido — usar, atualizar ou criar outro?").
export default function EscolhaModal({ isOpen, title, children, acoes, loading = false, onClose }: EscolhaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 leading-tight">{title}</h3>
              <div className="mt-2 text-sm text-gray-600 leading-relaxed">{children}</div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 justify-end">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            {acoes.map((acao) => (
              <button key={acao.label} type="button" onClick={acao.onClick} disabled={loading}
                className={acao.variante === 'secundaria'
                  ? 'px-4 py-2 text-sm font-semibold text-ui-primary border border-ui-primary rounded-lg hover:bg-indigo-50 disabled:opacity-50'
                  : 'px-4 py-2 text-sm font-semibold text-white bg-ui-primary rounded-lg hover:bg-ui-primary-hover disabled:opacity-50'}>
                {loading && acao.variante !== 'secundaria' ? 'Aguarde...' : acao.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
