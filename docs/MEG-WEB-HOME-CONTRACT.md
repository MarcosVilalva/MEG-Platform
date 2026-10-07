# MEG Web Evolution — Contrato Estrutural da Home

## Status

Contrato estrutural aprovado pelo usuário para a futura implementação da tela **INÍCIO**.

Este documento registra somente a estrutura soberana da Home. A implementação da Home não é autorizada antes da conclusão das etapas anteriores definidas no checkpoint oficial.

## Premissa global do viewport e do Shell

Esta regra passa a ser obrigatória para a nova Web:

- a aplicação é validada com o navegador em **zoom 100%**;
- ao abrir, o Shell deve ocupar exatamente a janela disponível;
- a página/documento não pode apresentar barra de rolagem vertical nem horizontal;
- `html`, `body`, raiz React e Shell permanecem limitados ao viewport;
- apenas a área de conteúdo abaixo da topbar pode rolar verticalmente quando o conteúdo exceder o espaço disponível;
- a sidebar pode rolar verticalmente somente quando seus itens não couberem;
- nenhum container aninhado pode usar `min-height: 100vh` ou `min-height: 100dvh`;
- a validação obrigatória do Shell inclui os viewports `1366x600`, `1366x768` e `1920x1080`, nos estados expandido e recolhido;
- em todos esses casos, `document.documentElement.scrollHeight <= window.innerHeight`;
- o logo nunca pode se sobrepor ao primeiro item do menu: o topo de `Início` deve ficar em posição vertical maior ou igual à base do logo ativo.
## Regra de soberania

O CSS abaixo é **SOBERANO**. Os percentuais visuais do print são apenas referência descritiva e não substituem os spans definidos.

### Grid desktop definitivo

- Linha 1: `balance` span 7 + `flow` span 5
- Linha 2: 4 KPIs, cada um span 3
- Linha 3: `benefits` span 6 + `quick` span 6
- Linha 4: `recent` span 6 + `upcoming` span 6

## Estrutura HTML obrigatória

```html
<div class="app">
  <aside class="sidebar"></aside>
  <div class="main">
    <header class="topbar"></header>
    <main class="dash">
      <section class="card balance"></section>
      <section class="card flow"></section>
      <a class="card kpi kpi--pay"></a>
      <a class="card kpi kpi--invoice"></a>
      <a class="card kpi kpi--pending"></a>
      <a class="card kpi kpi--paid"></a>
      <section class="card benefits"></section>
      <section class="card quick"></section>
      <section class="card recent"></section>
      <section class="card upcoming"></section>
    </main>
  </div>
</div>
```

## CSS estrutural obrigatório

```css
.app{height:100vh;height:100dvh;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr)}
.main{min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:1rem}
.topbar{flex:0 0 auto}
.dash{flex:1;min-height:0;overflow-y:auto;display:grid;gap:1rem;grid-template-columns:minmax(0,1fr)}
.dash>*{min-width:0}

@media (min-width:640px){
  .app{grid-template-columns:4.5rem minmax(0,1fr)}
  .dash{grid-template-columns:repeat(2,minmax(0,1fr))}
  .balance,.flow,.benefits,.quick,.recent,.upcoming{grid-column:1/-1}
}

@media (min-width:1024px){
  .app{grid-template-columns:13rem minmax(0,1fr)}
  .main{padding:1.25rem}
  .dash{grid-template-columns:repeat(12,minmax(0,1fr))}
  .balance{grid-column:span 7}
  .flow{grid-column:span 5}
  .kpi{grid-column:span 3}
  .benefits{grid-column:span 6}
  .quick{grid-column:span 6}
  .recent,.upcoming{grid-column:span 6}
}
```

## Regras da futura implementação

- Não alterar nomes de classe nem o grid acima.
- Dados devem vir da fonte única.
- Nenhum número financeiro pode ser digitado manualmente na UI.
- Saldo, fatura, status, totais e competência devem consumir exclusivamente as autoridades financeiras registradas em `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`.
- Responsividade somente nos breakpoints principais de 640px e 1024px.
- Zero rolagem horizontal.
- DataGrid deve ser usado apenas quando a etapa específica estiver concluída e disponível; até lá, a Home não deve ser antecipada.
