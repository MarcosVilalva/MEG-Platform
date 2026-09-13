import { useMemo, useState } from 'react';
import type { PhoenixReadModel } from './contracts';
import './phoenix-overlays.css';

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
  | 'budgets';

type SearchResult = {
  id: string;
  route: PhoenixRoute;
  kind: string;
  title: string;
  detail: string;
};

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
  { id: 'page-reconcile', route: 'reconcile', kind: 'Tela', title: 'Conciliação', detail: 'Contrato ainda em auditoria' },
  { id: 'page-analytics', route: 'analytics', kind: 'Tela', title: 'Análises', detail: 'Tendências históricas' },
  { id: 'page-budgets', route: 'budgets', kind: 'Tela', title: 'Orçamentos e metas', detail: 'Planejamento financeiro' }
];

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function PhoenixCommandPalette({ data, onClose, onNavigate }: { data: PhoenixReadModel | null; onClose: () => void; onNavigate: (route: PhoenixRoute) => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const dynamic: SearchResult[] = data ? [
      ...data.events.items.map((item) => ({ id: `event-${item.id}`, route: 'movements' as const, kind: item.type === 'income' ? 'Receita' : 'Lançamento', title: item.description, detail: [item.category?.name, item.account?.name, item.paymentMethod?.name].filter(Boolean).join(' · ') || 'Evento financeiro' })),
      ...data.cards.map((item) => ({ id: `card-${item.id}`, route: 'cards' as const, kind: 'Cartão', title: item.name, detail: item.brand || 'Cartão cadastrado' })),
      ...data.accounts.map((item) => ({ id: `account-${item.id}`, route: 'catalogs' as const, kind: 'Conta', title: item.name, detail: item.institution || item.type || 'Conta financeira' })),
      ...data.categories.map((item) => ({ id: `category-${item.id}`, route: 'catalogs' as const, kind: 'Classificação', title: item.name, detail: item.group || item.type || 'Cadastro financeiro' })),
      ...data.customers.map((item) => ({ id: `customer-${item.id}`, route: 'receivables' as const, kind: 'Cliente', title: item.name, detail: item.email || item.phone || 'Cliente cadastrado' })),
      ...(data.workspaceUsers.status === 'ready' ? data.workspaceUsers.users.map((item) => ({ id: `user-${item.id}`, route: 'users' as const, kind: 'Usuário', title: item.name, detail: `${item.email} · ${item.role}` })) : [])
    ] : [];
    const all = [...pageResults, ...dynamic];
    const needle = normalize(query.trim());
    if (!needle) return all.slice(0, 12);
    return all.filter((item) => normalize(`${item.kind} ${item.title} ${item.detail}`).includes(needle)).slice(0, 24);
  }, [data, query]);

  function open(result: SearchResult) {
    onNavigate(result.route);
    onClose();
  }

  return <div className="px-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="px-command" role="dialog" aria-modal="true" aria-label="Buscar no MEG">
      <div className="px-command-input"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tela, lançamento, cartão, conta, cliente ou usuário" /><kbd>ESC</kbd></div>
      <div className="px-command-results">
        {results.map((result) => <button key={result.id} type="button" onClick={() => open(result)}><span className="px-command-kind">{result.kind}</span><span className="px-command-copy"><strong>{result.title}</strong><small>{result.detail}</small></span><span className="px-command-arrow">↗</span></button>)}
        {!results.length ? <div className="px-command-empty"><strong>Nenhum resultado</strong><span>Tente outro termo de busca.</span></div> : null}
      </div>
      <footer><span>Enter para abrir</span><span>Esc para fechar</span><strong>Somente leitura</strong></footer>
    </section>
  </div>;
}
