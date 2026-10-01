import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type { PhoenixReadModel } from './contracts';

export type PhoenixRoute =
  | 'home'
  | 'movements'
  | 'history'
  | 'payables'
  | 'cards'
  | 'catalogs'
  | 'users'
  | 'settings'
  | 'receivables'
  | 'revenues'
  | 'cashflow'
  | 'reconcile'
  | 'analytics'
  | 'decisions'
  | 'budgets'
  | 'reports';

type SearchResult = {
  id: string;
  route: PhoenixRoute;
  kind: string;
  title: string;
  detail: string;
  targetMonth?: string;
  targetId?: string;
};

const commandMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const pageResults: SearchResult[] = [
  { id: 'page-home', route: 'home', kind: 'Tela', title: 'Início', detail: 'Visão geral da sua vida financeira' },
  { id: 'page-movements', route: 'movements', kind: 'Tela', title: 'Lançamentos', detail: 'Eventos financeiros' },
  { id: 'page-history', route: 'history', kind: 'Tela', title: 'Histórico', detail: 'Ações do mais novo para o mais antigo' },
  { id: 'page-payables', route: 'payables', kind: 'Tela', title: 'Pendentes', detail: 'Prioridades e compromissos' },
  { id: 'page-cards', route: 'cards', kind: 'Tela', title: 'Cartões', detail: 'Limites, faturas e compras' },
  { id: 'page-catalogs', route: 'catalogs', kind: 'Tela', title: 'Cadastros', detail: 'Base operacional' },
  { id: 'page-users', route: 'users', kind: 'Tela', title: 'Usuários e permissões', detail: 'Pessoas e perfis' },
  { id: 'page-settings', route: 'settings', kind: 'Tela', title: 'Configurações', detail: 'Preferências e integrações' },
  { id: 'page-receivables', route: 'receivables', kind: 'Tela', title: 'Contas a receber', detail: 'Títulos e recebimentos' },
  { id: 'page-revenues', route: 'revenues', kind: 'Tela', title: 'Receitas', detail: 'Origem das entradas' },
  { id: 'page-cashflow', route: 'cashflow', kind: 'Tela', title: 'Fluxo de caixa', detail: 'Realizado e projetado' },
  { id: 'page-reconcile', route: 'reconcile', kind: 'Tela', title: 'Conciliação', detail: 'Comparação de saldo e ajustes auditáveis' },
  { id: 'page-analytics', route: 'analytics', kind: 'Tela', title: 'Análises', detail: 'Tendências históricas' },
  { id: 'page-decisions', route: 'decisions', kind: 'Tela', title: 'Decisões', detail: 'Radar de 12 meses, simulador e assistente de decisão' },
  { id: 'page-budgets', route: 'budgets', kind: 'Tela', title: 'Orçamentos e metas', detail: 'Planejamento financeiro' },
  { id: 'page-reports', route: 'reports', kind: 'Tela', title: 'Relatórios e exportações', detail: 'Excel, PDF e impressão da base financeira' }
];

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function PhoenixCommandPalette({ data, allEvents, onClose, onNavigate }: { data: PhoenixReadModel | null; allEvents?: PhoenixReadModel['events']['items']; onClose: () => void; onNavigate: (route: PhoenixRoute, targetMonth?: string, targetId?: string) => boolean | void | Promise<boolean | void> }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => {
    const dynamic: SearchResult[] = data ? [
      ...(allEvents ?? data.events.items).map((item) => ({ id: `event-${item.id}`, route: 'movements' as const, kind: item.type === 'income' ? 'Receita' : 'Lançamento', title: item.description, detail: [item.category?.name, item.account?.name, item.paymentMethod?.name].filter(Boolean).join(' · ') || 'Evento financeiro', targetMonth: item.competence || String(item.date).slice(0, 7), targetId: item.id })),
      ...data.cards.map((item) => ({ id: `card-${item.id}`, route: 'cards' as const, kind: 'Cartão', title: item.name, detail: item.brand || 'Cartão cadastrado' })),
      ...data.accounts.map((item) => ({ id: `account-${item.id}`, route: 'catalogs' as const, kind: 'Conta', title: item.name, detail: item.institution || item.type || 'Conta financeira' })),
      ...data.categories.map((item) => ({ id: `category-${item.id}`, route: 'catalogs' as const, kind: 'Classificação', title: item.name, detail: item.group || item.type || 'Cadastro financeiro' })),
      ...data.customers.map((item) => ({ id: `customer-${item.id}`, route: 'receivables' as const, kind: 'Cliente', title: item.name, detail: item.email || item.phone || 'Cliente cadastrado' })),
      ...data.receivables.map((item) => ({ id: `receivable-${item.id}`, route: 'receivables' as const, kind: 'Título a receber', title: item.description, detail: [item.customer?.name, `Vence ${String(item.dueDate).slice(0, 10).split('-').reverse().join('/')}`, `Em aberto ${commandMoney.format(Number(item.openAmount || 0))}`].filter(Boolean).join(' · '), targetId: item.id })),
      ...data.payables.map((item) => ({ id: `payable-${item.id}`, route: 'payables' as const, kind: 'Conta pendente', title: item.description, detail: [item.category?.group || item.category?.name, `Vence ${String(item.dueDate).slice(0, 10).split('-').reverse().join('/')}`, `Em aberto ${commandMoney.format(Number(item.openAmount || 0))}`].filter(Boolean).join(' · ') })),
      ...data.budgets.map((item) => ({ id: `budget-${item.id}`, route: 'budgets' as const, kind: 'Orçamento', title: item.group, detail: [item.month, `Disponível ${commandMoney.format(Number(item.available || 0))}`, `${Number(item.percent || 0).toFixed(0)}% utilizado`].join(' · ') })),
      ...(data.workspaceUsers.status === 'ready' ? data.workspaceUsers.users.map((item) => ({ id: `user-${item.id}`, route: 'users' as const, kind: 'Usuário', title: item.name, detail: `${item.email} · ${item.role}` })) : [])
    ] : [];
    const all = [...pageResults, ...dynamic];
    const needle = normalize(query.trim());
    if (!needle) return all.slice(0, 12);
    return all.filter((item) => normalize(`${item.kind} ${item.title} ${item.detail}`).includes(needle)).slice(0, 24);
  }, [allEvents, data, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!results.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => Math.min(current, results.length - 1));
  }, [results.length]);

  async function open(result: SearchResult) {
    const opened = await onNavigate(result.route, result.targetMonth, result.targetId);
    if (opened === false) return;
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => results.length ? (current + 1) % results.length : 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0);
      return;
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      void open(results[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  return <div className="px-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="px-command" role="dialog" aria-modal="true" aria-label="Buscar no MEG">
      <div className="px-command-input"><span>⌕</span><input autoFocus role="combobox" aria-expanded="true" aria-controls="px-command-results" aria-activedescendant={results[activeIndex] ? `px-command-result-${activeIndex}` : undefined} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Buscar tela, lançamento, título, pendência, orçamento, cartão, conta, cliente ou usuário" /><kbd>ESC</kbd></div>
      <div className="px-command-results" id="px-command-results" role="listbox">
        {results.map((result, index) => <button id={`px-command-result-${index}`} key={result.id} type="button" role="option" aria-selected={activeIndex === index} className={activeIndex === index ? 'is-active' : undefined} onMouseEnter={() => setActiveIndex(index)} onClick={() => { void open(result); }}><span className="px-command-kind">{result.kind}</span><span className="px-command-copy"><strong>{result.title}</strong><small>{result.detail}</small></span><span className="px-command-arrow">↗</span></button>)}
        {!results.length ? <div className="px-command-empty"><strong>Nenhum resultado</strong><span>Tente outro termo de busca.</span></div> : null}
      </div>
      <footer><span>↑↓ para selecionar</span><span>Enter para abrir · Esc para fechar</span><strong>Somente leitura</strong></footer>
    </section>
  </div>;
}
