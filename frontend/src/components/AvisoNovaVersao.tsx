import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Confere se saiu deploy novo (dist/versao.json ≠ versão embutida nesta aba).
// Aba visível: mostra o aviso para a pessoa atualizar quando quiser (não perde o que
// está digitando). Aba em segundo plano: atualiza sozinha.
const INTERVALO_MS = 60_000;

async function versaoPublicada(): Promise<string | null> {
  try {
    const r = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).versao ?? null;
  } catch {
    return null;
  }
}

export default function AvisoNovaVersao() {
  const [novaVersao, setNovaVersao] = useState(false);

  useEffect(() => {
    if (__VERSAO_APP__ === 'dev') return undefined;
    let ativo = true;
    const conferir = async () => {
      const publicada = await versaoPublicada();
      if (!ativo || !publicada || publicada === __VERSAO_APP__) return;
      if (document.visibilityState === 'hidden') window.location.reload();
      else setNovaVersao(true);
    };
    const t = setInterval(conferir, INTERVALO_MS);
    const aoVoltar = () => { if (document.visibilityState === 'visible') void conferir(); };
    document.addEventListener('visibilitychange', aoVoltar);
    void conferir();
    return () => { ativo = false; clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar); };
  }, []);

  if (!novaVersao) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-ui-border bg-ui-surface px-4 py-3 text-sm text-ui-text shadow-lg">
      <ArrowPathIcon className="h-5 w-5 text-ui-primary" />
      <span>Saiu uma versão nova do Cotton.</span>
      <button type="button" onClick={() => window.location.reload()} className="ui-btn-primary px-3 py-1.5 text-xs">Atualizar agora</button>
    </div>
  );
}
