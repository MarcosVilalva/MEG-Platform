import type { ReactNode } from 'react';
import './login.css';
import './auth-screens.css';
import { LoginIcon } from './LoginScreen';

type AuthScreenLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  variant?: "register";
};

export function AuthScreenLayout({ title, description, children, variant }: AuthScreenLayoutProps) {
  return (
    <main className={`meg-login meg-auth-page ${variant === "register" ? "meg-auth-register" : ""}`} aria-label={title}>
      <div className="meg-login-frame">
        <section className="meg-login-hero" aria-label="Conheça o MEG Finanças">
          <img className="meg-login-logo" src={`${import.meta.env.BASE_URL}meg-web-evolution/visual-loading/${variant === 'register' ? 'logo-transparent.webp' : 'logo.webp'}`} alt="MEG Finanças" width="153" height="150" />
          {variant === 'register' ? (
            <>
              <div className="meg-register-hero-copy">
                <p className="meg-register-hero-eyebrow">MEG WEB EVOLUTION</p>
                <h2>Seu próximo passo <span>começa aqui.</span></h2>
                <p className="meg-register-hero-description">
                  Solicite acesso ou crie seu espaço MEG para organizar suas finanças
                  com mais clareza.
                </p>
              </div>
              <div className="meg-register-hero-signature" aria-hidden="true">
                <span className="meg-register-hero-signature-line" />
                <span>CLAREZA PARA DECIDIR</span>
              </div>
            </>
          ) : (
            <>
              <div className="meg-login-hero-copy">
                <h2>Sua vida financeira,<span> com clareza para decidir.</span></h2>
                <p className="meg-login-intro">Saldo, compromissos e projeções em uma visão única para você saber onde está e para onde está indo.</p>
              </div>
              <div className="meg-login-features" aria-label="Benefícios do MEG">
                <article className="meg-login-feature"><span className="meg-login-feature-icon" aria-hidden="true"><LoginIcon name="bars" /></span><div><strong>Saldo real</strong><span>Visão completa e atualizada</span></div></article>
                <article className="meg-login-feature"><span className="meg-login-feature-icon" aria-hidden="true"><LoginIcon name="target" /></span><div><strong>Projetos</strong><span>Mais controle para seus planos</span></div></article>
                <article className="meg-login-feature"><span className="meg-login-feature-icon" aria-hidden="true"><LoginIcon name="sliders" /></span><div><strong>Controle</strong><span>Decisões melhores todos os dias</span></div></article>
              </div>
            </>
          )}
        </section>
        <section className="meg-login-panel meg-auth-card" aria-labelledby="meg-auth-heading">
          <header className="meg-auth-header meg-login-panel-top">
            <span className="meg-login-security-icon"><LoginIcon name="shield" /></span>
            <div>
              <p className="meg-login-panel-label">ACESSO SEGURO</p>
              <h1 id="meg-auth-heading">{title}</h1>
              <p className="meg-login-panel-lead">{description}</p>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
