import {EvolutionFinancialIcon as Icon,type EvolutionFinancialIconName as IconName} from '../components/EvolutionFinancialIcon';
import '../styles/preview.css';

type PreviewKey='home'|'movements'|'launch'|'payables'|'settlement'|'cards'|'card-center'|'benefit'|'cashflow'|'analytics'|'history'|'settings'|'period'|'menu';

const previewKeys:PreviewKey[]=['home','movements','launch','payables','settlement','cards','card-center','benefit','cashflow','analytics','history','settings','period','menu'];

const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);

function requestedPreview():PreviewKey{
  const value=new URLSearchParams(window.location.search).get('preview') as PreviewKey|null;
  return value&&previewKeys.includes(value)?value:'home';
}
function openPreview(preview:PreviewKey){
  const url=new URL(window.location.href);
  url.searchParams.set('screen','preview');
  url.searchParams.set('preview',preview);
  window.location.href=url.toString();
}

const nav:Array<[PreviewKey,IconName,string]>= [
  ['home','home','Início'],
  ['movements','receipt','Lançamentos'],
  ['launch','plus','Novo'],
  ['payables','wallet','Pendentes'],
  ['cards','card','Cartões'],
  ['cashflow','chart','Fluxo de caixa'],
  ['analytics','trend','Relatórios'],
  ['history','clock','Histórico'],
  ['settings','settings','Configurações']
];

function Shell({screen,children,title,subtitle}:{screen:PreviewKey;children:React.ReactNode;title:string;subtitle:string}){
  return <main className="evo-preview" data-evolution-screen="preview" data-evolution-preview={screen}>
    <aside className="evo-preview-sidebar">
      <button className="evo-preview-brand" type="button" aria-label="MEG Finanças">
        <img src="./brand/meg-loading-lockup.svg" alt="MEG Finanças"/>
      </button>
      <nav>
        {nav.map(([key,icon,label])=><button key={key} className={screen===key?'active':''} type="button" onClick={()=>openPreview(key)}><Icon name={icon}/><span>{label}</span></button>)}
      </nav>
      <div className="evo-preview-side-bottom">
        <button type="button" className={screen==='menu'?'active':''} onClick={()=>openPreview('menu')}><Icon name="menu"/><span>Menu</span></button>
      </div>
    </aside>

    <section className="evo-preview-workspace">
      <header className="evo-preview-topbar">
        <div className="evo-preview-pagecopy"><span>MEG WEB</span><strong>{title}</strong><small>{subtitle}</small></div>
        <button className="evo-preview-period" type="button" onClick={()=>openPreview('period')}><Icon name="calendar"/><span><b>Out/2026</b><small>Mês atual</small></span><Icon name="chevron-down"/></button>
        <button className="evo-preview-user" type="button"><span>M</span><b>Marcos</b></button>
      </header>
      <div className="evo-preview-canvas">{children}</div>
    </section>
  </main>;
}

function Metric({icon,label,value,tone='default',note}:{icon:IconName;label:string;value:string;tone?:string;note?:string}){
  return <article className={'evo-preview-metric '+tone}><span><Icon name={icon}/></span><div><small>{label}</small><strong>{value}</strong>{note&&<em>{note}</em>}</div></article>;
}

function Home(){
  return <Shell screen="home" title="Situação atual" subtitle="Acompanhe seu caixa e compromissos.">
    <section className="evo-preview-home-grid">
      <article className="evo-preview-balance">
        <span><Icon name="wallet" size={30}/></span>
        <div><small>Saldo disponível</small><strong>{money(8420.34)}</strong><p>Considerando apenas lançamentos realizados.</p></div>
      </article>
      <section className="evo-preview-flow">
        <Metric icon="banknote" label="Entradas no mês" value={money(12540)} tone="income"/>
        <Metric icon="receipt" label="Saídas no mês" value={money(8790)} tone="expense"/>
        <Metric icon="trend" label="Resultado do mês" value={money(3750)} tone="result"/>
      </section>
      <section className="evo-preview-summary">
        <Metric icon="receipt" label="Contas a pagar" value="6" note={money(568)} tone="danger"/>
        <Metric icon="card" label="Faturas de cartões" value="3" note={money(2864.42)} tone="blue"/>
        <Metric icon="list" label="Outras pendências" value="12" note={money(941.80)} tone="amber"/>
        <Metric icon="check-line" label="Contas pagas" value="28" note={money(6285.33)} tone="green"/>
      </section>
      <button className="evo-preview-benefit" type="button" onClick={()=>openPreview('benefit')}><span><Icon name="food"/></span><div><small>Benefício Alimentação</small><em>Saldo disponível</em><strong>{money(1436.52)}</strong></div><Icon name="chevron-right"/></button>
      <section className="evo-preview-quick">
        <header><div><span><Icon name="bolt"/></span><p><b>Ações rápidas</b><small>Acesse as principais funcionalidades.</small></p></div></header>
        <div>
          <button><Icon name="card"/><span>Cartões</span></button>
          <button><Icon name="receipt"/><span>Pagar conta</span></button>
          <button><Icon name="chart"/><span>Fluxo de caixa</span></button>
          <button><Icon name="trend"/><span>Ver relatórios</span></button>
        </div>
      </section>
    </section>
  </Shell>;
}

const movementRows=[
  ['03/10','Supermercado Central','Supermercado','Pix',-185.90],
  ['02/10','Salário','Receita','Conta Corrente',5200],
  ['01/10','Netflix','Assinaturas','Cartão LATAM',-55.90],
  ['30/09','Posto Avenida','Combustível','Mercado Pago',-243.17],
  ['30/09','Verocard','Benefício','Verocard Alimentação',2000],
  ['29/09','Internet Fibra','Comunicação','Débito',-119.90],
];

function Movements(){
  return <Shell screen="movements" title="Lançamentos" subtitle="A mesma lista do App, expandida para leitura e filtro no desktop.">
    <section className="evo-preview-movements-layout">
      <aside className="evo-preview-filters">
        <h3>Filtros</h3>
        <label><span>Buscar</span><div><Icon name="search"/><input value="" readOnly placeholder="Descrição, categoria..."/></div></label>
        <label><span>Tipo</span><button>Todos <Icon name="chevron-down"/></button></label>
        <label><span>Status</span><button>Todos <Icon name="chevron-down"/></button></label>
        <label><span>Conta</span><button>Todas <Icon name="chevron-down"/></button></label>
        <button className="evo-preview-primary"><Icon name="plus"/>Novo lançamento</button>
      </aside>
      <article className="evo-preview-table-card">
        <header><div><b>Outubro 2026</b><small>6 lançamentos visíveis</small></div><button><Icon name="sliders"/>Filtrar</button></header>
        <div className="evo-preview-table">
          <div className="head"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Forma</span><span>Valor</span></div>
          {movementRows.map((r,i)=><div className="row" key={i}><span>{r[0]}</span><span><b>{r[1]}</b><small>{Number(r[4])>0?'Receita':'Despesa'}</small></span><span>{r[2]}</span><span>{r[3]}</span><strong className={Number(r[4])>0?'positive':'negative'}>{Number(r[4])>0?'+ ':''}{money(Number(r[4]))}</strong></div>)}
        </div>
      </article>
    </section>
  </Shell>;
}

function Launch(){
  return <Shell screen="launch" title="Novo lançamento" subtitle="Expansão direta do fluxo Despesa / Receita / Alimentação do App.">
    <section className="evo-preview-modal-frame">
      <article className="evo-preview-launch">
        <header><div><span><Icon name="plus"/></span><div><b>Novo lançamento</b><small>Registre uma movimentação financeira.</small></div></div><button><Icon name="x"/></button></header>
        <div className="evo-preview-launch-types">
          <button className="active"><Icon name="receipt"/><b>Despesa</b><small>Conta, compra ou compromisso.</small></button>
          <button><Icon name="banknote"/><b>Receita</b><small>Entrada, salário ou crédito.</small></button>
          <button><Icon name="food"/><b>Alimentação</b><small>Compra pelo benefício.</small></button>
        </div>
        <div className="evo-preview-launch-form">
          <section>
            <label><span>Descrição</span><input value="Supermercado Central" readOnly/></label>
            <div className="grid2">
              <label><span>Valor</span><input value="R$ 185,90" readOnly/></label>
              <label><span>Data</span><input value="03/10/2026" readOnly/></label>
            </div>
            <label><span>Categoria</span><button><Icon name="cart"/><b>Supermercado</b><Icon name="chevron-right"/></button></label>
            <label><span>Conta</span><button><Icon name="wallet"/><b>Conta Corrente</b><Icon name="chevron-right"/></button></label>
          </section>
          <aside>
            <label><span>Forma de pagamento</span><button><Icon name="arrows-right-left"/><b>Pix</b><Icon name="chevron-right"/></button></label>
            <label><span>Situação</span><div className="evo-preview-segment"><button className="active">Pago</button><button>Pendente</button></div></label>
            <article className="evo-preview-launch-summary"><small>Resumo</small><p><span>Tipo</span><b>Despesa</b></p><p><span>Conta</span><b>Conta Corrente</b></p><p><span>Total</span><strong>{money(185.90)}</strong></p></article>
            <button className="evo-preview-primary wide">Salvar lançamento</button>
          </aside>
        </div>
      </article>
    </section>
  </Shell>;
}

const payableRows=[
  ['Hoje','CPFL Energia','03/10/2026',189.42,'Vence hoje'],
  ['Hoje','Internet Fibra','03/10/2026',119.90,'Vence hoje'],
  ['Amanhã','Farmácia Saúde','04/10/2026',84.60,'Pendente'],
  ['07 OUT','Condomínio','07/10/2026',420.00,'Pendente'],
  ['10 OUT','Seguro Auto','10/10/2026',312.18,'Pendente'],
];

function Payables(){
  return <Shell screen="payables" title="Pendentes" subtitle="Agrupados por data, com seleção e baixa em lote como no App.">
    <section className="evo-preview-payables">
      <header className="evo-preview-tabs"><button className="active">Todas</button><button>A pagar</button><button>Pagas</button><button>Vencidas</button><label><Icon name="search"/><input placeholder="Buscar pendência" readOnly/></label></header>
      <div className="evo-preview-payable-grid">
        <article className="evo-preview-payable-list">
          <div className="group-title"><b>HOJE</b><span>2 compromissos</span><strong>{money(309.32)}</strong></div>
          {payableRows.map((r,i)=><button key={i} className="evo-preview-payable-row"><span className="check"></span><span className="icon"><Icon name={i===0?'bolt':i===1?'wifi':i===2?'heart-pulse':i===3?'house':'car'}/></span><span><b>{r[1]}</b><small>{r[2]} · {r[4]}</small></span><strong>{money(Number(r[3]))}</strong><Icon name="chevron-right"/></button>)}
        </article>
        <aside className="evo-preview-selection">
          <span><Icon name="wallet"/></span><small>Selecionados</small><strong>2 contas</strong><b>{money(309.32)}</b><p>Saldo disponível: {money(8420.34)}</p><button className="evo-preview-primary wide" onClick={()=>openPreview('settlement')}>Pagar selecionados</button>
        </aside>
      </div>
    </section>
  </Shell>;
}

function Settlement(){
  return <Shell screen="settlement" title="Confirmar pagamento" subtitle="Baixa com data escolhida, validação de saldo e resumo antes de confirmar.">
    <section className="evo-preview-modal-frame">
      <article className="evo-preview-settlement">
        <header><span><Icon name="wallet"/></span><div><b>Confirmar pagamento</b><small>2 compromissos selecionados</small></div></header>
        <section className="evo-preview-settle-summary"><p><span>CPFL Energia</span><b>{money(189.42)}</b></p><p><span>Internet Fibra</span><b>{money(119.90)}</b></p><strong><span>Total</span><b>{money(309.32)}</b></strong></section>
        <label><span>Data da baixa</span><button><Icon name="calendar"/><b>03/10/2026</b><Icon name="chevron-down"/></button></label>
        <article className="evo-preview-balance-check"><span><Icon name="check-line"/></span><div><small>Saldo após pagamento</small><strong>{money(8111.02)}</strong><p>Saldo suficiente para concluir.</p></div></article>
        <footer><button>Cancelar</button><button className="evo-preview-primary">Confirmar pagamento</button></footer>
      </article>
    </section>
  </Shell>;
}

const cards=[
  ['./assets/cards/latam-user-model-v61.svg','LATAM Pass','•••• 8842'],
  ['./assets/cards/mercado-pago-visa-v662.svg','Mercado Pago','•••• 2309'],
  ['./assets/cards/riachuelo-mastercard-visual.svg','Riachuelo','•••• 5511'],
];

function Cards(){
  return <Shell screen="cards" title="Cartões" subtitle="O carrossel infinito do App ganha área lateral para resumo e fatura.">
    <section className="evo-preview-cards-layout">
      <article className="evo-preview-card-carousel">
        <header><div><b>Meus cartões</b><small>Crédito e benefício em uma visão única.</small></div><button><Icon name="plus"/>Adicionar</button></header>
        <div className="evo-preview-card-stage">{cards.map((c,i)=><button key={c[1]} className={i===0?'active':''}><img src={c[0]} alt=""/><span><b>{c[1]}</b><small>{c[2]}</small></span></button>)}</div>
        <div className="evo-preview-dots"><i className="active"/><i/><i/></div>
      </article>
      <article className="evo-preview-card-snapshot">
        <header><div><b>LATAM Pass</b><small>Fatura 10/2026</small></div><button onClick={()=>openPreview('card-center')}>Abrir central <Icon name="chevron-right"/></button></header>
        <div className="evo-preview-card-metrics"><Metric icon="wallet" label="Limite total" value={money(12000)}/><Metric icon="trend" label="Disponível" value={money(7335.58)} tone="income"/><Metric icon="receipt" label="Fatura atual" value={money(4664.42)} tone="expense"/><Metric icon="calendar" label="Vencimento" value="12/10"/></div>
        <div className="evo-preview-usage"><span><i style={{width:'39%'}}/></span><small>39% utilizado · melhor dia para compra: 05</small></div>
      </article>
      <article className="evo-preview-card-statement">
        <header><b>Lançamentos da fatura</b><button>Ver todos</button></header>
        {movementRows.slice(0,4).map((r,i)=><div key={i}><span><Icon name={i===0?'cart':i===1?'banknote':i===2?'repeat':'fuel'}/></span><p><b>{r[1]}</b><small>{r[0]}</small></p><strong>{money(Math.abs(Number(r[4])))}</strong></div>)}
      </article>
    </section>
  </Shell>;
}

function CardCenter(){
  return <Shell screen="card-center" title="Central do cartão" subtitle="A central móvel ampliada sem perder a lógica de fatura do App.">
    <section className="evo-preview-card-center">
      <article className="evo-preview-card-focus"><img src="./assets/cards/latam-user-model-v61.svg" alt="LATAM Pass"/><div><b>LATAM Pass</b><small>•••• 8842 · Mastercard</small></div></article>
      <section className="evo-preview-card-center-metrics"><Metric icon="receipt" label="Fatura atual" value={money(4664.42)} tone="expense"/><Metric icon="wallet" label="Limite disponível" value={money(7335.58)} tone="income"/><Metric icon="calendar" label="Fecha em" value="2 dias"/><Metric icon="calendar" label="Vence em" value="12/10"/></section>
      <article className="evo-preview-table-card span2">
        <header><div><b>Movimentações da fatura</b><small>Outubro 2026</small></div><button><Icon name="search"/>Buscar</button></header>
        <div className="evo-preview-table compact">{movementRows.slice(0,5).map((r,i)=><div className="row simple" key={i}><span><Icon name={i===0?'cart':i===1?'banknote':i===2?'repeat':i===3?'fuel':'food'}/></span><span><b>{r[1]}</b><small>{r[0]} · {r[2]}</small></span><strong>{money(Math.abs(Number(r[4])))}</strong><Icon name="chevron-right"/></div>)}</div>
      </article>
    </section>
  </Shell>;
}

function Benefit(){
  return <Shell screen="benefit" title="Benefício Alimentação" subtitle="Saldo, recargas e consumo do Verocard com a mesma identidade do cartão benefício do App.">
    <section className="evo-preview-benefit-page">
      <article className="evo-preview-benefit-card">
        <img src="./assets/cards/verocard-alimentacao-v659.svg" alt="Verocard Alimentação"/>
        <div><small>Saldo disponível</small><strong>{money(1436.52)}</strong><p>Última recarga em 30/09/2026</p></div>
      </article>
      <section className="evo-preview-benefit-metrics"><Metric icon="wallet" label="Saldo" value={money(1436.52)} tone="income"/><Metric icon="up" label="Recargas" value={money(2000)}/><Metric icon="food" label="Consumido" value={money(563.48)} tone="expense"/><Metric icon="list" label="Movimentos" value="14"/></section>
      <article className="evo-preview-table-card">
        <header><div><b>Movimentações do benefício</b><small>Outubro 2026</small></div><button>Ver todas</button></header>
        <div className="evo-preview-table compact">
          {[
            ['03/10','Supermercado Central',185.90,'expense'],
            ['02/10','Padaria Avenida',42.80,'expense'],
            ['30/09','Recarga Verocard',2000,'income'],
            ['29/09','Restaurante Família',68.50,'expense'],
          ].map((r,i)=><div className="row simple" key={i}><span><Icon name={r[3]==='income'?'up':'food'}/></span><span><b>{r[1]}</b><small>{r[0]}</small></span><strong className={r[3]==='income'?'positive':'negative'}>{r[3]==='income'?'+ ':'- '}{money(Number(r[2]))}</strong><Icon name="chevron-right"/></div>)}
        </div>
      </article>
    </section>
  </Shell>;
}

function Cashflow(){
  const bars=[48,64,56,82,71,90,75,62,84,68,78,88];
  return <Shell screen="cashflow" title="Fluxo de caixa" subtitle="O módulo do App ganha escala para análise mensal sem perder a leitura simples.">
    <section className="evo-preview-cashflow">
      <section className="evo-preview-cash-kpis"><Metric icon="wallet" label="Saldo inicial" value={money(4670.34)}/><Metric icon="up" label="Entradas previstas" value={money(12540)} tone="income"/><Metric icon="down" label="Saídas previstas" value={money(10690)} tone="expense"/><Metric icon="trend" label="Saldo projetado" value={money(6520.34)} tone="result"/></section>
      <article className="evo-preview-chart-card">
        <header><div><b>Projeção do período</b><small>Entradas, saídas e saldo acumulado</small></div><button>Outubro 2026 <Icon name="chevron-down"/></button></header>
        <div className="evo-preview-bars">{bars.map((v,i)=><span key={i}><i style={{height:v+'%'}}/><b>{i+1}</b></span>)}</div>
        <footer><span><i className="income"/>Entradas</span><span><i className="expense"/>Saídas</span><span><i className="result"/>Saldo</span></footer>
      </article>
      <article className="evo-preview-cash-agenda"><header><b>Próximos impactos</b><button>Ver todos</button></header>{payableRows.slice(0,4).map((r,i)=><div key={i}><span><Icon name="calendar"/></span><p><b>{r[1]}</b><small>{r[2]}</small></p><strong>{money(Number(r[3]))}</strong></div>)}</article>
    </section>
  </Shell>;
}

function Analytics(){
  return <Shell screen="analytics" title="Relatórios" subtitle="A leitura analítica do App expandida em blocos comparáveis.">
    <section className="evo-preview-analytics">
      <section className="evo-preview-cash-kpis"><Metric icon="up" label="Receitas" value={money(12540)} tone="income"/><Metric icon="down" label="Despesas" value={money(8790)} tone="expense"/><Metric icon="trend" label="Resultado" value={money(3750)} tone="result"/><Metric icon="receipt" label="Ticket médio" value={money(314.64)}/></section>
      <article className="evo-preview-chart-card"><header><div><b>Evolução mensal</b><small>Últimos 6 meses</small></div><button>6 meses</button></header><div className="evo-preview-linechart"><svg viewBox="0 0 700 220" preserveAspectRatio="none"><polyline points="0,170 120,120 240,145 360,74 480,98 600,48 700,66"/><polyline className="second" points="0,190 120,160 240,152 360,136 480,122 600,103 700,115"/></svg></div></article>
      <article className="evo-preview-category-card"><header><b>Despesas por categoria</b><button>Ver detalhes</button></header>{[['Supermercado',32,'cart'],['Moradia',25,'house'],['Transporte',18,'car'],['Assinaturas',14,'repeat'],['Outros',11,'receipt']].map((r,i)=><div key={i}><span><Icon name={r[2] as IconName}/></span><p><b>{r[0]}</b><i><em style={{width:r[1]+'%'}}/></i></p><strong>{r[1]}%</strong></div>)}</article>
    </section>
  </Shell>;
}

function History(){
  return <Shell screen="history" title="Histórico" subtitle="Consulta cronológica do App com busca e filtros persistentes no desktop.">
    <section className="evo-preview-history">
      <header><label><Icon name="search"/><input placeholder="Buscar no histórico" readOnly/></label><button><Icon name="calendar"/>Período</button><button><Icon name="sliders"/>Filtros</button></header>
      <article className="evo-preview-history-list">
        {['03 OUT','02 OUT','30 SET'].map((d,di)=><section key={d}><header><b>{d}</b><span>{di===0?'3 movimentos':'2 movimentos'}</span></header>{movementRows.slice(di,di+3).map((r,i)=><div key={i}><span><Icon name={Number(r[4])>0?'banknote':i===0?'cart':'receipt'}/></span><p><b>{r[1]}</b><small>{r[2]} · {r[3]}</small></p><strong className={Number(r[4])>0?'positive':'negative'}>{Number(r[4])>0?'+ ':''}{money(Number(r[4]))}</strong><Icon name="chevron-right"/></div>)}</section>)}
      </article>
    </section>
  </Shell>;
}

function Settings(){
  return <Shell screen="settings" title="Configurações" subtitle="Mesmas preferências do App em navegação lateral interna.">
    <section className="evo-preview-settings">
      <aside><button className="active"><Icon name="settings"/>Geral</button><button><Icon name="wallet"/>Contas</button><button><Icon name="card"/>Formas de pagamento</button><button><Icon name="receipt"/>Categorias</button><button><Icon name="bell"/>Notificações</button><button><Icon name="menu"/>Perfil</button></aside>
      <article>
        <header><div><b>Preferências gerais</b><small>Personalize como o MEG apresenta suas informações.</small></div></header>
        <label><span><b>Nome do espaço</b><small>Identificação principal do ambiente financeiro.</small></span><input value="MEG da Família" readOnly/></label>
        <label><span><b>Competência padrão</b><small>Período aberto ao entrar no sistema.</small></span><button>Mês atual <Icon name="chevron-down"/></button></label>
        <label><span><b>Ocultar valores sensíveis</b><small>Protege saldos ao abrir a Home.</small></span><i className="switch on"><em/></i></label>
        <label><span><b>Resumo diário</b><small>Notificações com pendências e saldos.</small></span><i className="switch on"><em/></i></label>
        <footer><button>Cancelar</button><button className="evo-preview-primary">Salvar alterações</button></footer>
      </article>
    </section>
  </Shell>;
}

function Period(){
  return <Shell screen="period" title="Selecionar período" subtitle="Evolução do PeriodSheet do App como popover desktop.">
    <section className="evo-preview-modal-frame">
      <article className="evo-preview-period-panel">
        <header><div><b>Período da visão financeira</b><small>Escolha como o MEG deve montar os dados.</small></div><Icon name="calendar"/></header>
        <div className="evo-preview-period-options"><button className="active"><span><Icon name="calendar"/></span><div><b>Mês</b><small>Uma competência específica.</small></div><Icon name="check-line"/></button><button><span><Icon name="arrows-right-left"/></span><div><b>Intervalo</b><small>Datas inicial e final.</small></div></button><button><span className="infinity">∞</span><div><b>Todos os períodos</b><small>Histórico completo.</small></div></button></div>
        <section><button><Icon name="chevron-left"/></button><strong>Outubro 2026</strong><button><Icon name="chevron-right"/></button></section>
        <footer><button>Cancelar</button><button className="evo-preview-primary">Aplicar período</button></footer>
      </article>
    </section>
  </Shell>;
}

function Menu(){
  return <Shell screen="menu" title="Menu" subtitle="Os destinos do MenuSheet preservados e distribuídos para desktop.">
    <section className="evo-preview-menu-page">
      <article className="evo-preview-profile-card"><span>M</span><div><b>Marcos</b><small>MEG da Família</small></div><button><Icon name="settings"/>Perfil</button></article>
      <section className="evo-preview-menu-grid">{[
        ['card','Cartões','Faturas, limites e compras'],
        ['wallet','Pendentes','Contas e compromissos'],
        ['chart','Fluxo de caixa','Projeções e saldo'],
        ['trend','Relatórios','Análises do período'],
        ['clock','Histórico','Movimentações anteriores'],
        ['food','Benefício','Verocard Alimentação'],
        ['target','Metas','Objetivos financeiros'],
        ['settings','Configurações','Preferências e cadastros'],
      ].map((r,i)=><button key={i}><span><Icon name={r[0] as IconName}/></span><div><b>{r[1]}</b><small>{r[2]}</small></div><Icon name="chevron-right"/></button>)}</section>
      <button className="evo-preview-logout">Sair do MEG</button>
    </section>
  </Shell>;
}

function PreviewScreen({screen}:{screen:PreviewKey}){
  if(screen==='home')return <Home/>;
  if(screen==='movements')return <Movements/>;
  if(screen==='launch')return <Launch/>;
  if(screen==='payables')return <Payables/>;
  if(screen==='settlement')return <Settlement/>;
  if(screen==='cards')return <Cards/>;
  if(screen==='card-center')return <CardCenter/>;
  if(screen==='benefit')return <Benefit/>;
  if(screen==='cashflow')return <Cashflow/>;
  if(screen==='analytics')return <Analytics/>;
  if(screen==='history')return <History/>;
  if(screen==='settings')return <Settings/>;
  if(screen==='period')return <Period/>;
  return <Menu/>;
}

export function EvolutionPreview(){
  return <PreviewScreen screen={requestedPreview()}/>;
}
