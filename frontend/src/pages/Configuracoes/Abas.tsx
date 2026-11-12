import { NavLink } from 'react-router-dom';

// Abas de Configurações (só ADMIN).
const ABAS = [
  { to: '/configuracoes/usuarios', rotulo: 'Usuários' },
  { to: '/configuracoes/email', rotulo: 'E-mail (SMTP)' },
  { to: '/configuracoes/permissoes', rotulo: 'Permissões' },
];

export default function AbasConfiguracoes() {
  return (
    <div className="flex gap-1 border-b border-ui-border">
      {ABAS.map((a) => (
        <NavLink key={a.to} to={a.to}
          className={({ isActive }) => `-mb-px border-b-2 px-4 py-2 text-sm font-medium ${isActive ? 'border-ui-primary text-ui-primary' : 'border-transparent text-ui-text-muted hover:text-ui-text'}`}>
          {a.rotulo}
        </NavLink>
      ))}
    </div>
  );
}
