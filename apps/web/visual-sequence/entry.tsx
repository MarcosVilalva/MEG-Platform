import React from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingScreen } from '../src/meg-web-evolution/auth/LoadingScreen';
import './preview.css';

/**
 * Preview exclusivamente visual da Tela 01.
 * Carregamento real segue no fluxo de autenticação; sem acesso a API,
 * sem usuários fictícios e sem leitura/escrita financeira neste entrypoint.
 */
function Preview() {
  return (
    <div className="meg-sequence-preview">
      <LoadingScreen preview progress={0}
        onNavigateLogin={() => { /* Ainda não implementar telas seguintes. */ }}
      />
      <span className="meg-sequence-preview__notice">
        MEG Web · revisão visual da Tela 01 · sem conexão financeira
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
