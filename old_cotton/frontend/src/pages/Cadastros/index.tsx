import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ClientesTab from './ClientesTab';
import OrigensTab from './OrigensTab';
import DestinosTab from './DestinosTab';
import LocaisColetaTab from './LocaisColetaTab';
import TerminaisTab from './TerminaisTab';
import ModelosTab from './ModelosTab';
import clsx from 'clsx';

const tabs = ['clientes', 'origens', 'destinos', 'locaisColeta', 'terminais', 'carretas'] as const;

type TabKey = (typeof tabs)[number];

export default function CadastrosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('clientes');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabKey | null;
    if (tab && tabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  function changeTab(tab: TabKey) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cadastros Base</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie as opções (Clientes, Filiais Embarcadoras, Destinos, Locais de Coleta, Origens, Carretas) disponíveis na criação de nova liberação e veículos.
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => changeTab('clientes')}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'clientes'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Clientes
          </button>
          <button
            onClick={() => changeTab('origens')}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'origens'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Filiais Embarcadoras
          </button>
          <button
            onClick={() => changeTab('destinos')}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'destinos'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Destinos
          </button>
          <button
            onClick={() => changeTab('locaisColeta')}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'locaisColeta'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Locais de Coleta
          </button>
          <button
            onClick={() => changeTab('terminais')}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'terminais'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Origens
          </button>
          <button
            onClick={() => changeTab('carretas')}
            className={clsx(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'carretas'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Carretas
          </button>
        </nav>
      </div>

      <div className="flex-1">
        {activeTab === 'clientes' && <ClientesTab />}
        {activeTab === 'origens' && <OrigensTab />}
        {activeTab === 'destinos' && <DestinosTab />}
        {activeTab === 'locaisColeta' && <LocaisColetaTab />}
        {activeTab === 'terminais' && <TerminaisTab />}
        {activeTab === 'carretas' && <ModelosTab />}
      </div>
    </div>
  );
}
