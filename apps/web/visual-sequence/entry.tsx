import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingScreen } from '../src/meg-web-evolution/auth/LoadingScreen';
import { LoginScreen } from '../src/meg-web-evolution/auth/LoginScreen';
import './preview.css';

/**
 * Preview visual isolado: ?tela=login (padrão), ?tela=carregamento.
 * Login real preservado, mas em previewOnly NÃO chama a API ou armazena e-mail.
 * Nunca usar dados de autenticação, contas ou credenciais neste site estático.
 */
function Preview() {
  const [notice, setNotice] = useState('');
  const view = new URLSearchParams(window.location.search).get('tela');
  const loading = view === 'carregamento';
  return (
    <div className="meg-sequence-preview" data-preview-screen={loading ? 'carregamento' : 'login'}>
      {loading ? (
        <LoadingScreen preview progress={0}
          onNavigateLogin={() => setNotice('Para revisar o Login, abra o link da Tela 02.')} />
      ) : (
        <LoginScreen previewOnly
          onAuthenticated={() => setNotice('Prévia visual: a autenticação real não é executada.')}
          onNavigate={destination =>
            setNotice(destination === 'create-account'
              ? 'Criar Conta será revisada em etapa própria.'
              : 'Recuperação de Senha será revisada em etapa própria.')} />
      )}
      <span className="meg-sequence-preview__notice" role="status" aria-live="polite">
        {notice || (loading
          ? 'Tela 01 · carregamento visual aprovado · sem conexão financeira'
          : 'Tela 02 · preview visual · não informe senha real')}
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
