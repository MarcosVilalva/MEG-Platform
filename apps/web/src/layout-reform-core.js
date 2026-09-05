export const VIEW_COPY = Object.freeze({
  dashboard: ['VISÃO GERAL', 'Seu dinheiro, com clareza', 'Resumo financeiro, compromissos e decisões em uma única tela.'],
  cashflow: ['FLUXO FINANCEIRO', 'Entradas e saídas no tempo', 'Acompanhe saldo, projeções e movimentações por período.'],
  analytics: ['INTELIGÊNCIA FINANCEIRA', 'Análises que viram decisões', 'Tendências, categorias e alertas explicados sem ruído.'],
  'income-analysis': ['ORIGEM DAS RECEITAS', 'Entenda de onde vem sua renda', 'Compare fontes, recorrência e evolução das entradas.'],
  transactions: ['LANÇAMENTOS', 'Controle de despesas', 'Edite um item ou vários em uma única operação segura.'],
  'credit-cards': ['CARTÕES E FATURAS', 'Cartões sob controle', 'Limites, faturas e compras organizados por cartão.'],
  budgets: ['PLANEJAMENTO', 'Limites que protegem seus planos', 'Defina orçamentos e acompanhe o uso antes de ultrapassar.'],
  pending: ['PENDÊNCIAS', 'O que precisa da sua atenção', 'Concilie, confirme ou corrija itens sem perder o contexto.'],
  catalogs: ['ORGANIZAÇÃO', 'Cadastros e classificações', 'Gerencie grupos, formas de pagamento, contas e regras.'],
  users: ['ACESSOS', 'Usuários e permissões', 'Controle quem acessa cada parte do sistema.'],
  'platform-admin': ['ADMINISTRAÇÃO', 'Gestão comercial da plataforma', 'Planos, contas e uso do serviço em uma visão administrativa.'],
  settings: ['PREFERÊNCIAS', 'Ajustes do sistema', 'Personalize segurança, notificações, dados e aplicativo.'],
});

const capitalize = (value) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

export function formatPeriodSummary({ mode = 'month', month = '', year = '', start = '', end = '' } = {}) {
  if (mode === 'all') return 'Tudo';
  if (mode === 'year') return year || String(new Date().getFullYear());
  if (mode === 'range') {
    const formatDate = (value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
      return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
    };
    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);
    if (formattedStart && formattedEnd) return `${formattedStart} a ${formattedEnd}`;
    return 'Intervalo';
  }

  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  const reference = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
    : new Date();
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(reference).replace('.', '').replace(/\s+de\s+/i, '/');
  return capitalize(label);
}
