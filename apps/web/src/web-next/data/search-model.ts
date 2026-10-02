import type { PhoenixReadModel } from '../../phoenix/contracts';

export type WebNextSearchRoute =
  | 'home' | 'movements' | 'history' | 'payables' | 'cards' | 'catalogs'
  | 'users' | 'settings' | 'receivables' | 'revenues' | 'cashflow'
  | 'reconcile' | 'analytics' | 'decisions' | 'budgets' | 'reports';

export type WebNextSearchResult = {
  id: string;
  route: WebNextSearchRoute;
  kind: string;
  title: string;
  detail: string;
  targetMonth?: string;
  targetId?: string;
  targetSection?: string;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const pages: WebNextSearchResult[] = [
  { id:'page-home', route:'home', kind:'Tela', title:'Início', detail:'Visão geral da sua vida financeira' },
  { id:'page-movements', route:'movements', kind:'Tela', title:'Lançamentos', detail:'Eventos financeiros' },
  { id:'page-history', route:'history', kind:'Tela', title:'Histórico', detail:'Ações e auditoria' },
  { id:'page-payables', route:'payables', kind:'Tela', title:'Pendentes', detail:'Prioridades e compromissos' },
  { id:'page-cards', route:'cards', kind:'Tela', title:'Cartões', detail:'Limites, faturas e compras' },
  { id:'page-catalogs', route:'catalogs', kind:'Tela', title:'Cadastros', detail:'Contas, categorias e formas de pagamento' },
  { id:'page-receivables', route:'receivables', kind:'Tela', title:'Contas a receber', detail:'Títulos e recebimentos em aberto' },
  { id:'page-revenues', route:'revenues', kind:'Tela', title:'Receitas', detail:'Origem das entradas' },
  { id:'page-cashflow', route:'cashflow', kind:'Tela', title:'Fluxo de caixa', detail:'Realizado e projetado' },
  { id:'page-analytics', route:'analytics', kind:'Tela', title:'Análises', detail:'Tendências financeiras' },
  { id:'page-budgets', route:'budgets', kind:'Tela', title:'Orçamentos e metas', detail:'Planejamento financeiro' },
  { id:'page-reports', route:'reports', kind:'Tela', title:'Relatórios', detail:'Exportações e visão gerencial' },
  { id:'page-settings', route:'settings', kind:'Tela', title:'Configurações', detail:'Preferências, segurança e integrações' },
  { id:'settings-profile', route:'settings', kind:'Configurações', title:'Meu perfil', detail:'Foto, avatar e identidade', targetSection:'profile' },
  { id:'settings-notifications', route:'settings', kind:'Configurações', title:'Notificações', detail:'Alertas, agenda e canais', targetSection:'notifications' },
  { id:'settings-security', route:'settings', kind:'Configurações', title:'Segurança', detail:'Acesso e sessão', targetSection:'security' },
  { id:'settings-system', route:'settings', kind:'Configurações', title:'Sistema', detail:'Integridade, diagnóstico e sessões', targetSection:'system' },
];

export function normalizeWebNextSearch(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function buildWebNextSearchCatalog(
  data: PhoenixReadModel | null,
  allEvents?: PhoenixReadModel['events']['items'],
): WebNextSearchResult[] {
  if (!data) return pages;

  const dynamic: WebNextSearchResult[] = [
    ...(allEvents ?? data.events.items).map((item) => ({
      id:`event-${item.id}`,
      route:'movements' as const,
      kind:item.type === 'income' ? 'Receita' : 'Lançamento',
      title:item.description,
      detail:[item.category?.name,item.account?.name,item.paymentMethod?.name].filter(Boolean).join(' · ') || 'Evento financeiro',
      targetMonth:item.competence || String(item.date).slice(0,7),
      targetId:item.id,
    })),
    ...data.cards.map((item) => ({
      id:`card-${item.id}`, route:'cards' as const, kind:'Cartão', title:item.name,
      detail:item.brand || item.issuer || 'Cartão cadastrado', targetId:item.id,
    })),
    ...data.accounts.map((item) => ({
      id:`account-${item.id}`, route:'catalogs' as const, kind:'Conta', title:item.name,
      detail:item.institution || item.type || 'Conta financeira', targetId:item.id, targetSection:'accounts',
    })),
    ...data.categories.map((item) => ({
      id:`category-${item.id}`, route:'catalogs' as const, kind:'Categoria', title:item.name,
      detail:item.group || item.type || 'Classificação financeira', targetId:item.id, targetSection:'categories',
    })),
    ...data.paymentMethods.map((item) => ({
      id:`payment-${item.id}`, route:'catalogs' as const, kind:'Forma de pagamento', title:item.name,
      detail:item.type || 'Forma cadastrada', targetId:item.id, targetSection:'payments',
    })),
    ...data.customers.map((item) => ({
      id:`customer-${item.id}`, route:'catalogs' as const, kind:'Cliente', title:item.name,
      detail:item.email || item.phone || 'Cliente cadastrado', targetId:item.id, targetSection:'customers',
    })),
    ...data.receivables.map((item) => ({
      id:`receivable-${item.id}`, route:'receivables' as const, kind:'Título a receber', title:item.description,
      detail:[item.customer?.name,`Vence ${String(item.dueDate).slice(0,10).split('-').reverse().join('/')}`,`Em aberto ${money.format(Number(item.openAmount || 0))}`].filter(Boolean).join(' · '),
      targetId:item.id,
    })),
    ...data.payables.map((item) => ({
      id:`payable-${item.id}`, route:'payables' as const, kind:'Conta pendente', title:item.description,
      detail:[item.category?.group || item.category?.name,`Vence ${String(item.dueDate).slice(0,10).split('-').reverse().join('/')}`,`Em aberto ${money.format(Number(item.openAmount || 0))}`].filter(Boolean).join(' · '),
      targetMonth:String(item.dueDate).slice(0,7), targetId:`payable-${item.id}`,
    })),
    ...data.budgets.map((item) => ({
      id:`budget-${item.id}`, route:'budgets' as const, kind:'Meta', title:item.group,
      detail:[item.month,`Disponível ${money.format(Number(item.available || 0))}`,`${Number(item.percent || 0).toFixed(0)}% utilizado`].join(' · '),
      targetMonth:item.month,targetId:item.id,
    })),
  ];

  if (data.workspaceUsers.status === 'ready') {
    dynamic.push(...data.workspaceUsers.users.map((item) => ({
      id:`user-${item.id}`, route:'users' as const, kind:'Usuário', title:item.name,
      detail:`${item.email} · ${item.role}`, targetId:item.id,
    })));
  }

  return [...pages, ...dynamic];
}
