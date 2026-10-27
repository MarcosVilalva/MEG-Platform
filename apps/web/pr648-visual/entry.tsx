import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LaunchTypePicker } from '../src/meg-web-evolution/launches/LaunchTypePicker';
import '../src/meg-web-evolution/launches/new-launch.css';
import '../src/meg-web-evolution/launches/launch-type-picker.css';
import './visual-preview.css';

/** Preview visual isolado. NÃO conecta API, contas, login ou dados financeiros.
 * A tela de produção não usa esse entrypoint.
 */
function Preview() {
  const [notice, setNotice] = useState('');
  const onChoose = (type: 'expense' | 'income') => {
    setNotice(type === 'expense' ? 'Despesa selecionada.' : 'Receita selecionada.');
  };
  return (
    <div className="meg-pr648-preview">
      <div className="meg-pr648-preview__identity">
        <div className="meg-pr648-preview__brand"><strong>MEG</strong><span>FINANÇAS</span></div>
        <div className="meg-pr648-preview__sidebar-item">Início</div>
        <div className="meg-pr648-preview__sidebar-item is-active">Lançamentos</div>
        <div className="meg-pr648-preview__sidebar-item">Cartões</div>
        <div className="meg-pr648-preview__sidebar-item">Pendentes</div>
        <div className="meg-pr648-preview__sidebar-item">Benefícios</div>
      </div>
      <main className="meg-pr648-preview__page">
        <div className="meg-pr648-preview__toolbar">
          <span>Buscar movimentações, contas, cartões, relatórios...</span>
          <span>Outubro de 2026</span>
        </div>
        <div className="meg-new-launch__overlay is-choice-overlay meg-pr648-preview__overlay">
          <section className="meg-new-launch is-choose" role="dialog" aria-modal="false" aria-labelledby="meg-pr648-preview-title">
            <header className="meg-new-launch__header">
              <button className="meg-new-launch__back-icon" aria-label="Voltar" type="button" onClick={() => setNotice('Prévia visual: sem navegação financeira.')}>‹</button>
              <div className="meg-new-launch__headline">
                <h2 id="meg-pr648-preview-title">Novo lançamento</h2>
                <p>Escolha o tipo de lançamento e siga com um formulário inteligente para Web.</p>
              </div>
              <button className="meg-new-launch__close" aria-label="Fechar" type="button" onClick={() => setNotice('Prévia visual: sem navegação financeira.')}>×</button>
            </header>
            <LaunchTypePicker onChoose={onChoose} onBack={() => setNotice('Prévia visual: sem navegação financeira.')}/>
          </section>
        </div>
      </main>
      <div className="meg-pr648-preview__disclaimer" role="status">
        {notice || 'PR #648 · HOMOLOGAÇÃO VISUAL · Sem login, API ou gravação financeira.'}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
