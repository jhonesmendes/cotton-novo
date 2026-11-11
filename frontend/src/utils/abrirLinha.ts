import type { MouseEvent } from 'react';

// Clique em qualquer parte da linha de uma tabela abre o registro.
// Links/botões dentro da linha seguem com o clique deles; Ctrl/⌘+clique abre em outra aba.
export function abrirLinha(e: MouseEvent, url: string, navigate: (url: string) => void) {
  if ((e.target as HTMLElement).closest('a, button, input, select, [role="button"]')) return;
  if (e.ctrlKey || e.metaKey) window.open(url, '_blank');
  else navigate(url);
}
