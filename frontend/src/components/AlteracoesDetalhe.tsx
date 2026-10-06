import { RegistroAuditoria, formatarValor, labelCampo } from '@/utils/auditoria';

// Detalhe de uma entrada da auditoria: "campo: antes → depois" (alteração) ou
// o snapshot dos dados (criação/exclusão).
export default function AlteracoesDetalhe({ registro, ocultarValores = false }: { registro: RegistroAuditoria; ocultarValores?: boolean }) {
  if (registro.acao === 'UPDATE') {
    return (
      <ul className="space-y-0.5">
        {registro.camposAlterados.map((campo) => (
          <li key={campo} className="text-xs text-gray-600">
            <span className="font-medium text-gray-700">{labelCampo(campo)}:</span>{' '}
            <span className="line-through text-gray-400">{formatarValor(campo, registro.dadosAntigos?.[campo], ocultarValores)}</span>
            {' → '}
            <span className="font-semibold text-gray-800">{formatarValor(campo, registro.dadosNovos?.[campo], ocultarValores)}</span>
          </li>
        ))}
      </ul>
    );
  }

  const dados = (registro.acao === 'INSERT' ? registro.dadosNovos : registro.dadosAntigos) ?? {};
  const campos = Object.keys(dados).filter((c) => c !== 'id' && dados[c] !== null && dados[c] !== '');
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
      {campos.map((campo) => (
        <div key={campo} className="text-xs text-gray-600">
          <dt className="inline font-medium text-gray-700">{labelCampo(campo)}:</dt>{' '}
          <dd className="inline">{formatarValor(campo, dados[campo], ocultarValores)}</dd>
        </div>
      ))}
    </dl>
  );
}
