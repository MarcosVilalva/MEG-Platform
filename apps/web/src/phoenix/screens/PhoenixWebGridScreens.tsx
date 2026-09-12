import { useMemo, useState } from 'react';
import { PhoenixGridFilter, type PhoenixGridFilterKind, type PhoenixGridFilterValue, type PhoenixGridOption, type PhoenixGridSortDirection } from '../PhoenixGridFilter';
import type { PhoenixReadModel } from '../contracts';
import '../phoenix-web-screens.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function PageIntro({ kicker, title, text, aside }: { kicker: string; title: string; text: string; aside?: React.ReactNode }) {
  return <header className="px-screen-head"><div><span className="px-kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{aside ? <div className="px-screen-head-aside">{aside}</div> : null}</header>;
}

function normalize(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function parseBrazilianNumber(value: string) {
  const normalized = String(value || '').trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function active(filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return Boolean(filter.value.trim());
  if (filter.kind === 'multi') return filter.values.length > 0;
  if (filter.kind === 'number') return Boolean(filter.min || filter.max);
  return Boolean(filter.from || filter.to);
}

function summary(label: string, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return `${label}: ${filter.value}`;
  if (filter.kind === 'multi') return `${label}: ${filter.values.length} valor(es)`;
  if (filter.kind === 'number') return `${label}: ${filter.min || '−∞'} até ${filter.max || '+∞'}`;
  return `${label}: ${filter.from || 'início'} até ${filter.to || 'fim'}`;
}

function matches(value: string | number, filter: PhoenixGridFilterValue) {
  if (filter.kind === 'text') return !filter.value.trim() || normalize(value).includes(normalize(filter.value));
  if (filter.kind === 'multi') return !filter.values.length || filter.values.includes(normalize(value));
  if (filter.kind === 'date') {
    const current = String(value).slice(0, 10);
    if (filter.from && current < filter.from) return false;
    if (filter.to && current > filter.to) return false;
    return true;
  }
  const current = typeof value === 'number' ? value : Number.NaN;
  const min = parseBrazilianNumber(filter.min);
  const max = parseBrazilianNumber(filter.max);
  if (min !== null && current < min) return false;
  if (max !== null && current > max) return false;
  return true;
}

function compare(left: string | number, right: string | number, direction: PhoenixGridSortDirection) {
  if (typeof left === 'number' && typeof right === 'number') return direction === 'asc' ? left - right : right - left;
  const result = String(left).localeCompare(String(right), 'pt-BR', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function options(values: Array<string | number>, label?: (value: string) => string): PhoenixGridOption[] {
  const map = new Map<string, { label: string; count: number }>();
  values.forEach((raw) => {
    const value = normalize(raw);
    const current = map.get(value);
    map.set(value, { label: label ? label(String(raw)) : String(raw), count: (current?.count || 0) + 1 });
  });
  return [...map.entries()].map(([value, item]) => ({ value, label: item.label, count: item.count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true, sensitivity: 'base' }));
}

function statusText(status: string) {
  return ({ open: 'Em aberto', partial: 'Parcial', paid: 'Recebido', overdue: 'Vencido' } as Record<string, string>)[status] || status;
}

function isoDay(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

type ReceivableKey = 'dueDate' | 'description' | 'customer' | 'installment' | 'totalAmount' | 'openAmount' | 'status' | 'receipts';
type ReceivableRow = Record<ReceivableKey, string | number> & { id: string };
type ReceivableFilters = Record<ReceivableKey, PhoenixGridFilterValue>;

function initialReceivableFilters(): ReceivableFilters {
  return {
    dueDate: { kind: 'date', from: '', to: '' },
    description: { kind: 'text', value: '' },
    customer: { kind: 'multi', values: [] },
    installment: { kind: 'multi', values: [] },
    totalAmount: { kind: 'number', min: '', max: '' },
    openAmount: { kind: 'number', min: '', max: '' },
    status: { kind: 'multi', values: [] },
    receipts: { kind: 'number', min: '', max: '' }
  };
}

const receivableLabels: Record<ReceivableKey, string> = { dueDate: 'Vencimento', description: 'Descrição', customer: 'Cliente', installment: 'Parcela', totalAmount: 'Total', openAmount: 'Em aberto', status: 'Status', receipts: 'Recebimentos' };

export function PhoenixReceivablesGrid({ data }: { data: PhoenixReadModel }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ReceivableFilters>(initialReceivableFilters);
  const [sort, setSort] = useState<{ key: ReceivableKey; direction: PhoenixGridSortDirection } | null>(null);
  const today = todaySaoPaulo();
  const open = data.receivables.filter((item) => item.status !== 'paid' && Number(item.openAmount) > 0);
  const overdue = open.filter((item) => isoDay(item.dueDate) < today);
  const totalOpen = open.reduce((sum, item) => sum + Number(item.openAmount || 0), 0);
  const totalReceived = data.receivables.reduce((sum, item) => sum + item.receipts.reduce((receiptSum, receipt) => receiptSum + Number(receipt.amount || 0), 0), 0);
  const rows = useMemo<ReceivableRow[]>(() => data.receivables.map((item) => ({ id: item.id, dueDate: isoDay(item.dueDate), description: item.description, customer: item.customer?.name || 'Não informado', installment: item.installmentQty > 1 ? `${item.installmentNo}/${item.installmentQty}` : 'Única', totalAmount: Number(item.totalAmount || 0), openAmount: Number(item.openAmount || 0), status: statusText(item.status), receipts: item.receipts.length })), [data.receivables]);
  const keys = Object.keys(receivableLabels) as ReceivableKey[];
  const activeKeys = keys.filter((key) => active(filters[key]));
  const gridOptions = useMemo(() => ({ customer: options(rows.map((row) => row.customer)), installment: options(rows.map((row) => row.installment)), status: options(rows.map((row) => row.status)) }), [rows]);
  const visible = useMemo(() => {
    const needle = normalize(search);
    const filtered = rows.filter((row) => (!needle || normalize(keys.map((key) => row[key]).join(' ')).includes(needle)) && keys.every((key) => matches(row[key], filters[key])));
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => compare(a[sort.key], b[sort.key], sort.direction));
  }, [rows, search, filters, sort]);
  function header(label: string, key: ReceivableKey, kind: PhoenixGridFilterKind, list?: PhoenixGridOption[]) { return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key === key ? sort.direction : null} onSort={(direction) => setSort({ key, direction })} onChange={(value) => setFilters((current) => ({ ...current, [key]: value }))} /></div>; }
  function clearAll() { setSearch(''); setFilters(initialReceivableFilters()); setSort(null); }
  return <section className="px-screen">
    <PageIntro kicker="Contas a receber" title="Títulos e recebimentos em aberto" text="Leitura do domínio oficial de contas a receber, sem registrar recebimentos nesta fase." aside={<span className="px-total-pill">{money.format(totalOpen)} em aberto</span>} />
    <section className="px-screen-kpis"><article><span>Em aberto</span><strong>{money.format(totalOpen)}</strong><small>{open.length} título(s)</small></article><article className="danger"><span>Vencidos</span><strong>{overdue.length}</strong><small>{money.format(overdue.reduce((sum, item) => sum + Number(item.openAmount || 0), 0))}</small></article><article><span>Recebido</span><strong>{money.format(totalReceived)}</strong><small>Recebimentos registrados</small></article><article><span>Clientes</span><strong>{data.customers.filter((item) => item.isActive).length}</strong><small>Cadastros ativos</small></article></section>
    <section className="px-card px-table-card"><div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar em todas as colunas" /></label><span className="px-toolbar-note">{visible.length} de {rows.length} exibido(s)</span></div>
      {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da grade</span>{search ? <span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={() => setSearch('')}>×</button></span> : null}{activeKeys.map((key) => <span className="px-grid-filter-chip" key={key}>{summary(receivableLabels[key], filters[key])}<button type="button" onClick={() => { const fresh = initialReceivableFilters(); setFilters((current) => ({ ...current, [key]: fresh[key] })); }}>×</button></span>)}{sort ? <span className="px-grid-filter-chip">Ordenação: {receivableLabels[sort.key]} {sort.direction === 'asc' ? '↑' : '↓'}<button type="button" onClick={() => setSort(null)}>×</button></span> : null}<button className="px-grid-clear-all" type="button" onClick={clearAll}>Limpar grade</button></div> : null}
      <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Vencimento','dueDate','date')}</th><th>{header('Descrição','description','text')}</th><th>{header('Cliente','customer','multi',gridOptions.customer)}</th><th>{header('Parcela','installment','multi',gridOptions.installment)}</th><th>{header('Total','totalAmount','number')}</th><th>{header('Em aberto','openAmount','number')}</th><th>{header('Status','status','multi',gridOptions.status)}</th><th>{header('Recebimentos','receipts','number')}</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td>{date.format(new Date(`${row.dueDate}T12:00:00Z`))}</td><td><strong>{row.description}</strong></td><td>{row.customer}</td><td>{row.installment}</td><td className="px-money">{money.format(Number(row.totalAmount))}</td><td className="px-money">{money.format(Number(row.openAmount))}</td><td><span className={`px-status ${normalize(row.status).replace(/\s+/g,'-')}`}>{row.status}</span></td><td>{row.receipts}</td></tr>)}</tbody></table>{!visible.length ? <p className="px-empty">Nenhum título corresponde aos filtros aplicados.</p> : null}</div>
    </section>
  </section>;
}

type RevenueKey = 'eventDate' | 'description' | 'category' | 'account' | 'payment' | 'status' | 'amount';
type RevenueRow = Record<RevenueKey, string | number> & { id: string };
type RevenueFilters = Record<RevenueKey, PhoenixGridFilterValue>;
function initialRevenueFilters(): RevenueFilters { return { eventDate:{kind:'date',from:'',to:''}, description:{kind:'text',value:''}, category:{kind:'multi',values:[]}, account:{kind:'multi',values:[]}, payment:{kind:'multi',values:[]}, status:{kind:'multi',values:[]}, amount:{kind:'number',min:'',max:''} }; }
const revenueLabels: Record<RevenueKey,string> = { eventDate:'Data', description:'Descrição', category:'Classificação', account:'Conta', payment:'Forma', status:'Situação', amount:'Valor' };

export function PhoenixRevenuesGrid({ data }: { data: PhoenixReadModel }) {
  const [search,setSearch] = useState(''); const [filters,setFilters] = useState<RevenueFilters>(initialRevenueFilters); const [sort,setSort] = useState<{key:RevenueKey;direction:PhoenixGridSortDirection}|null>(null);
  const revenues = useMemo(() => data.events.items.filter((event) => event.competence === data.month && event.type === 'income'), [data]);
  const total = revenues.reduce((sum,item) => sum + Math.abs(Number(item.amount || 0)),0); const realized = revenues.filter((item) => ['confirmed','paid','reconciled'].includes(item.status)).reduce((sum,item) => sum + Math.abs(Number(item.amount || 0)),0);
  const rows = useMemo<RevenueRow[]>(() => revenues.map((event) => ({ id:event.id, eventDate:event.date.slice(0,10), description:event.description, category:event.category?.name || 'Sem classificação', account:event.account?.name || 'Não informada', payment:event.paymentMethod?.name || 'Não informada', status:event.status, amount:Math.abs(Number(event.amount || 0)) })), [revenues]);
  const keys = Object.keys(revenueLabels) as RevenueKey[]; const activeKeys = keys.filter((key) => active(filters[key])); const gridOptions = useMemo(() => ({ category:options(rows.map((row)=>row.category)), account:options(rows.map((row)=>row.account)), payment:options(rows.map((row)=>row.payment)), status:options(rows.map((row)=>row.status)) }), [rows]);
  const visible = useMemo(() => { const needle=normalize(search); const filtered=rows.filter((row)=>(!needle || normalize(keys.map((key)=>row[key]).join(' ')).includes(needle)) && keys.every((key)=>matches(row[key],filters[key]))); if(!sort)return filtered; return [...filtered].sort((a,b)=>compare(a[sort.key],b[sort.key],sort.direction)); }, [rows,search,filters,sort]);
  function header(label:string,key:RevenueKey,kind:PhoenixGridFilterKind,list?:PhoenixGridOption[]){return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} options={list} sort={sort?.key===key?sort.direction:null} onSort={(direction)=>setSort({key,direction})} onChange={(value)=>setFilters((current)=>({...current,[key]:value}))}/></div>;}
  return <section className="px-screen"><PageIntro kicker="Receitas" title="Origem e evolução das entradas" text="Entradas financeiras do período carregadas do domínio oficial de eventos." />
    <section className="px-screen-kpis"><article><span>Receitas do período</span><strong>{money.format(total)}</strong><small>{revenues.length} evento(s)</small></article><article><span>Realizadas</span><strong>{money.format(realized)}</strong><small>Confirmadas, pagas ou conciliadas</small></article><article><span>Resultado realizado</span><strong>{money.format(data.summary.realizedResult)}</strong><small>Receitas menos despesas realizadas</small></article><article><span>Ticket médio</span><strong>{money.format(revenues.length ? total / revenues.length : 0)}</strong><small>Média das entradas</small></article></section>
    <section className="px-card px-table-card"><div className="px-toolbar"><label className="px-search-field"><span>⌕</span><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar em todas as colunas"/></label><span className="px-toolbar-note">{visible.length} de {rows.length} exibido(s)</span></div>
      {activeKeys.length || sort || search ? <div className="px-grid-active-filters"><span>Filtros da grade</span>{search?<span className="px-grid-filter-chip">Busca: {search}<button type="button" onClick={()=>setSearch('')}>×</button></span>:null}{activeKeys.map((key)=><span className="px-grid-filter-chip" key={key}>{summary(revenueLabels[key],filters[key])}<button type="button" onClick={()=>{const fresh=initialRevenueFilters();setFilters((current)=>({...current,[key]:fresh[key]}));}}>×</button></span>)}{sort?<span className="px-grid-filter-chip">Ordenação: {revenueLabels[sort.key]} {sort.direction==='asc'?'↑':'↓'}<button type="button" onClick={()=>setSort(null)}>×</button></span>:null}<button className="px-grid-clear-all" type="button" onClick={()=>{setSearch('');setFilters(initialRevenueFilters());setSort(null);}}>Limpar grade</button></div>:null}
      <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Data','eventDate','date')}</th><th>{header('Descrição','description','text')}</th><th>{header('Classificação','category','multi',gridOptions.category)}</th><th>{header('Conta','account','multi',gridOptions.account)}</th><th>{header('Forma','payment','multi',gridOptions.payment)}</th><th>{header('Situação','status','multi',gridOptions.status)}</th><th>{header('Valor','amount','number')}</th></tr></thead><tbody>{visible.map((row)=><tr key={row.id}><td>{date.format(new Date(`${row.eventDate}T12:00:00Z`))}</td><td><strong>{row.description}</strong></td><td>{row.category}</td><td>{row.account}</td><td>{row.payment}</td><td><span className={`px-status ${row.status}`}>{row.status}</span></td><td className="px-money positive">{money.format(Number(row.amount))}</td></tr>)}</tbody></table>{!visible.length?<p className="px-empty">Nenhuma receita corresponde aos filtros aplicados.</p>:null}</div>
    </section></section>;
}

type CashflowKey = 'day' | 'income' | 'expense' | 'net' | 'realizedBalance' | 'projectedBalance' | 'eventCount';
type CashflowRow = Record<CashflowKey,string|number>;
type CashflowFilters = Record<CashflowKey,PhoenixGridFilterValue>;
function initialCashflowFilters():CashflowFilters{return{day:{kind:'date',from:'',to:''},income:{kind:'number',min:'',max:''},expense:{kind:'number',min:'',max:''},net:{kind:'number',min:'',max:''},realizedBalance:{kind:'number',min:'',max:''},projectedBalance:{kind:'number',min:'',max:''},eventCount:{kind:'number',min:'',max:''}};}
const cashflowLabels:Record<CashflowKey,string>={day:'Data',income:'Entradas',expense:'Saídas',net:'Líquido',realizedBalance:'Saldo realizado',projectedBalance:'Saldo projetado',eventCount:'Eventos'};

export function PhoenixCashflowGrid({data}:{data:PhoenixReadModel}){
  const cashflow=data.cashflow; const [filters,setFilters]=useState<CashflowFilters>(initialCashflowFilters); const [sort,setSort]=useState<{key:CashflowKey;direction:PhoenixGridSortDirection}|null>(null);
  const rows=useMemo<CashflowRow[]>(()=>cashflow.days.map((day)=>({day:day.date,income:day.income,expense:day.expense,net:day.net,realizedBalance:day.realizedBalance,projectedBalance:day.projectedBalance,eventCount:day.eventCount})),[cashflow.days]);
  const keys=Object.keys(cashflowLabels) as CashflowKey[]; const activeKeys=keys.filter((key)=>active(filters[key])); const visible=useMemo(()=>{const filtered=rows.filter((row)=>keys.every((key)=>matches(row[key],filters[key])));if(!sort)return filtered;return[...filtered].sort((a,b)=>compare(a[sort.key],b[sort.key],sort.direction));},[rows,filters,sort]);
  function header(label:string,key:CashflowKey,kind:PhoenixGridFilterKind){return <div className="px-grid-th"><span>{label}</span><PhoenixGridFilter label={label} kind={kind} value={filters[key]} sort={sort?.key===key?sort.direction:null} onSort={(direction)=>setSort({key,direction})} onChange={(value)=>setFilters((current)=>({...current,[key]:value}))}/></div>;}
  return <section className="px-screen"><PageIntro kicker="Fluxo de caixa" title="Fechamento realizado e projetado" text="Saldos e movimentos diários fornecidos pelo serviço oficial de fluxo de caixa." />
    <section className="px-screen-kpis"><article><span>Saldo inicial</span><strong>{money.format(cashflow.openingBalance)}</strong><small>Antes do período</small></article><article><span>Entradas</span><strong>{money.format(cashflow.totalIncome)}</strong><small>Total do período</small></article><article className="danger"><span>Saídas</span><strong>{money.format(cashflow.totalExpense)}</strong><small>Total do período</small></article><article><span>Fechamento projetado</span><strong>{money.format(cashflow.projectedClosing)}</strong><small>Realizado: {money.format(cashflow.realizedClosing)}</small></article></section>
    <section className="px-card px-table-card"><div className="px-panel-head"><div><span>Movimentação diária</span><h2>Realizado x projetado</h2></div><strong>{visible.length} de {rows.length} dia(s)</strong></div>
      {activeKeys.length||sort?<div className="px-grid-active-filters"><span>Filtros da grade</span>{activeKeys.map((key)=><span className="px-grid-filter-chip" key={key}>{summary(cashflowLabels[key],filters[key])}<button type="button" onClick={()=>{const fresh=initialCashflowFilters();setFilters((current)=>({...current,[key]:fresh[key]}));}}>×</button></span>)}{sort?<span className="px-grid-filter-chip">Ordenação: {cashflowLabels[sort.key]} {sort.direction==='asc'?'↑':'↓'}<button type="button" onClick={()=>setSort(null)}>×</button></span>:null}<button className="px-grid-clear-all" type="button" onClick={()=>{setFilters(initialCashflowFilters());setSort(null);}}>Limpar grade</button></div>:null}
      <div className="px-table-scroll"><table className="px-data-table"><thead><tr><th>{header('Data','day','date')}</th><th>{header('Entradas','income','number')}</th><th>{header('Saídas','expense','number')}</th><th>{header('Líquido','net','number')}</th><th>{header('Saldo realizado','realizedBalance','number')}</th><th>{header('Saldo projetado','projectedBalance','number')}</th><th>{header('Eventos','eventCount','number')}</th></tr></thead><tbody>{visible.map((row)=><tr key={String(row.day)}><td>{date.format(new Date(`${row.day}T12:00:00Z`))}</td><td className="px-money positive">{money.format(Number(row.income))}</td><td className="px-money negative">{money.format(Number(row.expense))}</td><td className="px-money">{money.format(Number(row.net))}</td><td className="px-money">{money.format(Number(row.realizedBalance))}</td><td className="px-money">{money.format(Number(row.projectedBalance))}</td><td>{row.eventCount}</td></tr>)}</tbody></table>{!visible.length?<p className="px-empty">Nenhuma movimentação corresponde aos filtros aplicados.</p>:null}</div>
    </section></section>;
}
