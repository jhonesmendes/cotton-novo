import { useState } from 'react';
import { Squares2X2Icon, TableCellsIcon } from '@heroicons/react/24/outline';

// Lista em tabela ou em cards — preferência do navegador por tela (chave), vale entre sessões.
export type ModoVisualizacao = 'lista' | 'cards';

function lerModo(chave: string): ModoVisualizacao {
  try {
    return localStorage.getItem(chave) === 'cards' ? 'cards' : 'lista';
  } catch {
    return 'lista';
  }
}

export function useModoVisualizacao(chave: string) {
  const [modo, setModo] = useState<ModoVisualizacao>(() => lerModo(chave));
  const trocarModo = (m: ModoVisualizacao) => {
    setModo(m);
    try {
      localStorage.setItem(chave, m);
    } catch {
      // localStorage indisponível — a escolha vale só enquanto a tela estiver aberta.
    }
  };
  return [modo, trocarModo] as const;
}

const OPCOES = [
  ['lista', 'Lista', TableCellsIcon],
  ['cards', 'Cards', Squares2X2Icon],
] as const;

export default function AlternarVisualizacao({ modo, onChange }: {
  modo: ModoVisualizacao;
  onChange: (m: ModoVisualizacao) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-ui-md border border-ui-border p-0.5" role="group" aria-label="Modo de visualização">
      {OPCOES.map(([valor, rotulo, Icone]) => (
        <button key={valor} type="button" onClick={() => onChange(valor)}
          aria-pressed={modo === valor} title={`Visualizar em ${rotulo.toLowerCase()}`}
          className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium transition ${
            modo === valor ? 'bg-ui-primary text-white' : 'text-ui-text-muted hover:bg-ui-muted'
          }`}>
          <Icone className="w-4 h-4" />
          {rotulo}
        </button>
      ))}
    </div>
  );
}
