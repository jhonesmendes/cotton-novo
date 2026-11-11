import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import { STATUS_LABELS, VeiculoStatus } from '@/utils/status';

// Busca global (Ctrl/⌘+K): placa, motorista ou instrução em qualquer status.
// Abre a liberação já rolada até o veículo encontrado.
export default function BuscaGlobal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');
  useEffect(() => { const t = setTimeout(() => setTermo(texto.trim()), 250); return () => clearTimeout(t); }, [texto]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ['busca-global', termo],
    queryFn: () => api.get('/liberacoes', { params: { status: '', busca: termo, limit: 8 } }).then((r) => r.data),
    enabled: termo.length >= 2,
  });

  const t = termo.toLowerCase();
  const resultados = (data?.data ?? []).flatMap((l: any) => {
    const veiculos = (l.veiculos ?? []).filter((v: any) => v.ativo && (v.placa?.toLowerCase().includes(t) || v.motoristaNome?.toLowerCase().includes(t)));
    if (!veiculos.length) return [{ chave: `l${l.id}`, url: `/liberacoes/${l.id}`, titulo: l.instrucao, sub: `${l.clienteNome ?? l.cliente?.nome ?? ''} · ${l.status}` }];
    return veiculos.map((v: any) => ({
      chave: `v${v.id}`,
      url: `/liberacoes/${l.id}#veiculo-${v.id}`,
      titulo: `${v.placa} · ${v.motoristaNome}`,
      sub: `${l.instrucao} · ${STATUS_LABELS[v.status as VeiculoStatus] ?? v.status}`,
    }));
  });

  const abrir = (url: string) => { onClose(); navigate(url); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-ui-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={(e) => { e.preventDefault(); if (resultados[0]) abrir(resultados[0].url); }} className="flex items-center gap-3 border-b border-ui-border px-4">
          <MagnifyingGlassIcon className="h-5 w-5 text-ui-text-muted" />
          <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Placa, motorista ou instrução..."
            className="w-full bg-transparent py-4 text-sm text-ui-text outline-none" />
          <kbd className="rounded border border-ui-border px-1.5 text-[10px] text-ui-text-muted">Esc</kbd>
        </form>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {termo.length < 2 && <li className="px-4 py-6 text-center text-sm text-ui-text-muted">Digite pelo menos 2 letras</li>}
          {termo.length >= 2 && !isFetching && !resultados.length && <li className="px-4 py-6 text-center text-sm text-ui-text-muted">Nada encontrado</li>}
          {resultados.map((r: any) => (
            <li key={r.chave}>
              <button type="button" onClick={() => abrir(r.url)} className="w-full px-4 py-2 text-left hover:bg-ui-muted">
                <p className="text-sm font-medium text-ui-text">{r.titulo}</p>
                <p className="text-xs text-ui-text-muted">{r.sub}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
