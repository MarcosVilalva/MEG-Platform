/* Harness exclusivo para inspeção de viewport, sem autenticação, sem dados,
   sem alterar o AppShell aprovado ou o fluxo de produção. */
import React from 'react';
import {createRoot} from 'react-dom/client';
import '../styles/tokens.css';
import '../styles/base.css';
import {AppShell} from './AppShell';
const root=document.getElementById('meg-web-evolution-shell-test-root');
if(!root)throw new Error('SHELL_HARNESS_ROOT_MISSING');
createRoot(root).render(<React.StrictMode><AppShell><section className="meg-shell-stage" aria-label="Área de teste estrutural do Shell"/></AppShell></React.StrictMode>);
