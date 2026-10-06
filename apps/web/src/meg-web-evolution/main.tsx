import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { AppShell } from './shell/AppShell';

function ShellFoundationPreview() {
  return (
    <AppShell>
      <section className="meg-shell-stage" aria-label="Área de conteúdo da nova Web" />
    </AppShell>
  );
}

const root = document.getElementById('meg-web-evolution-root');
if (!root) throw new Error('MEG_WEB_EVOLUTION_ROOT_NOT_FOUND');

createRoot(root).render(
  <React.StrictMode>
    <ShellFoundationPreview />
  </React.StrictMode>
);
