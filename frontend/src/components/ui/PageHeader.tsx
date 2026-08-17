import type { ReactNode } from 'react';
export default function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <header className="ui-page-header"><div><h1 className="text-2xl font-bold tracking-tight text-ui-text">{title}</h1>{description && <p className="mt-1 text-sm text-ui-text-muted">{description}</p>}</div>{action && <div>{action}</div>}</header>;
}
