import { calculateFinancialSummary } from "./legacy-finance.js";
import { installmentDueDate, splitInstallmentAmounts } from "./legacy-installments.js";

const STORAGE_KEY = "meg-financas-state-v4-paid-fixes";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const todayIso = today.toISOString().slice(0, 10);

const demoState = {
  transactions: [
    { id: crypto.randomUUID(), date: `${currentMonth}-02`, description: "Salario", category: "Receitas", account: "Banco", type: "income", amount: 8500, status: "paid", notes: "" },
    { id: crypto.randomUUID(), date: `${currentMonth}-04`, description: "Aluguel", category: "Moradia", account: "Conta corrente", type: "expense", amount: 2450, status: "paid", notes: "" },
    { id: crypto.randomUUID(), date: `${currentMonth}-06`, description: "Supermercado", category: "Alimentacao", account: "Cartao", type: "expense", amount: 780.45, status: "paid", notes: "" },
    { id: crypto.randomUUID(), date: `${currentMonth}-08`, description: "Internet e celular", category: "Servicos", account: "Conta corrente", type: "expense", amount: 219.9, status: "paid", notes: "" },
    { id: crypto.randomUUID(), date: `${currentMonth}-11`, description: "Combustivel", category: "Transporte", account: "Cartao", type: "expense", amount: 310, status: "paid", notes: "" },
    { id: crypto.randomUUID(), date: `${currentMonth}-15`, description: "Consulta medica", category: "Saude", account: "Pix", type: "expense", amount: 280, status: "pending", notes: "" },
    { id: crypto.randomUUID(), date: `${currentMonth}-18`, description: "Assinaturas", category: "Lazer", account: "Cartao", type: "expense", amount: 92.8, status: "pending", notes: "" },
  ],
  budgets: {
    Alimentacao: 1200,
    Moradia: 2600,
    Transporte: 650,
    Saude: 600,
    Servicos: 450,
    Lazer: 400,
    Educacao: 500,
  },
};

const defaultState = window.MEG_REAL_STATE || demoState;

const PAYMENT_MODALITIES = {
  BOLETO: "À VISTA",
  "CARTÃO AZUL": "CREDITO",
  "CARTÃO BB": "CREDITO",
  "CARTÃO BV": "CREDITO",
  "CARTÃO DÉBITO": "À VISTA",
  "CARTÃO ITAÚ": "CREDITO",
  "CARTÃO KABUM": "CREDITO",
  "CARTÃO MAGALU": "CREDITO",
  "CARTÃO ML": "CREDITO",
  "CARTÃO NUBANK": "CREDITO",
  "CARTÃO RIACHUELO": "CREDITO",
  "DÉBITO AUTOMÁTICO": "À VISTA",
  DINHEIRO: "À VISTA",
  "PASSALLET CARTÃO": "CREDIÁRIO",
  PIX: "À VISTA",
  RIACHUELO: "CREDIÁRIO",
  VEROCARD: "ALIMENTAÇÃO",
};

const DEFAULT_GROUPS = [
  "AUTOMÓVEL",
  "BEBIDAS E SIMILARES",
  "COMUNICAÇÃO",
  "CURSOS",
  "DOAÇÃO",
  "ELETRO/ELETRONICOS/ UTILIDADES",
  "FAST FOOD",
  "HIGIENE PESSOAL",
  "IMÓVEL",
  "LAZER",
  "MAT. ESCOLAR",
  "MOTO",
  "PET",
  "PGTO DE DIVIDAS",
  "PRESENTES",
  "SAÚDE",
  "SUPERMERCADO",
  "TITULOS/PREVIDÊNCIA",
  "TRANSPORTE",
  "VESTUÁRIO",
];

const DEFAULT_CATALOGS = {
  groups: [...DEFAULT_GROUPS],
  expenseClasses: ["CONTAS GERAIS", "RES. PAG. DÍVIDA"],
  paymentMethods: Object.entries(PAYMENT_MODALITIES).map(([description, modality]) => ({ description, modality })),
};

const ESSENTIAL_GROUPS = new Set(["COMUNICAÇÃO", "HIGIENE PESSOAL", "IMÓVEL", "MAT. ESCOLAR", "PGTO DE DIVIDAS", "SAÚDE", "SUPERMERCADO", "TITULOS/PREVIDÊNCIA", "TRANSPORTE"] .map((item) => normalizeText(item)));

let state = loadState();
let originalTransactionsById = new Map((defaultState.transactions || []).map((item) => [item.id, normalizeTransaction(item)]));
let selectedPeriod = {
  mode: "month",
  month: currentMonth,
  year: String(today.getFullYear()),
  start: "",
  end: "",
};
let selectedView = "dashboard";
let selectedPendingMonth = currentMonth;
let analyticsFilters = {
  groups: [],
  payments: [],
};
const transactionColumnFilters = {};

const els = {
  periodMode: document.querySelector("#periodMode"),
  monthFilter: document.querySelector("#monthFilter"),
  yearFilter: document.querySelector("#yearFilter"),
  startDateFilter: document.querySelector("#startDateFilter"),
  endDateFilter: document.querySelector("#endDateFilter"),
  periodFields: document.querySelectorAll("[data-period-field]"),
  navItems: document.querySelectorAll(".nav-item"),
  views: document.querySelectorAll(".view"),
  quickAddBtn: document.querySelector("#quickAddBtn"),
  resetDemoBtn: document.querySelector("#resetDemoBtn"),
  monetaryPanel: document.querySelector("#monetaryPanel"),
  ticketPanel: document.querySelector("#ticketPanel"),
  consolidatedPanel: document.querySelector("#consolidatedPanel"),
  monetaryRevenueMetric: document.querySelector("#monetaryRevenueMetric"),
  monetaryExpenseMetric: document.querySelector("#monetaryExpenseMetric"),
  monetarySituationMetric: document.querySelector("#monetarySituationMetric"),
  monetaryRevenueNote: document.querySelector("#monetaryRevenueNote"),
  monetaryExpenseNote: document.querySelector("#monetaryExpenseNote"),
  monetarySituationNote: document.querySelector("#monetarySituationNote"),
  ticketRevenueMetric: document.querySelector("#ticketRevenueMetric"),
  ticketExpenseMetric: document.querySelector("#ticketExpenseMetric"),
  ticketSituationMetric: document.querySelector("#ticketSituationMetric"),
  ticketRevenueNote: document.querySelector("#ticketRevenueNote"),
  ticketExpenseNote: document.querySelector("#ticketExpenseNote"),
  ticketSituationNote: document.querySelector("#ticketSituationNote"),
  consolidatedRevenueMetric: document.querySelector("#consolidatedRevenueMetric"),
  consolidatedExpenseMetric: document.querySelector("#consolidatedExpenseMetric"),
  consolidatedSituationMetric: document.querySelector("#consolidatedSituationMetric"),
  consolidatedSituationNote: document.querySelector("#consolidatedSituationNote"),
  dashboardTitle: document.querySelector("#dashboardTitle"),
  categoryChartNote: document.querySelector("#categoryChartNote"),
  currentMonthLabel: document.querySelector("#currentMonthLabel"),
  previousCloseLabel: document.querySelector("#previousCloseLabel"),
  previousCloseTrend: document.querySelector("#previousCloseTrend"),
  availableBalanceMetric: document.querySelector("#availableBalanceMetric"),
  currentIncomeMetric: document.querySelector("#currentIncomeMetric"),
  currentExpenseMetric: document.querySelector("#currentExpenseMetric"),
  pendingLaunchedLabel: document.querySelector("#pendingLaunchedLabel"),
  pendingLaunchedMetric: document.querySelector("#pendingLaunchedMetric"),
  pendingLaunchedTrend: document.querySelector("#pendingLaunchedTrend"),
  monthCloseCard: document.querySelector("#monthCloseCard"),
  monthCloseMood: document.querySelector("#monthCloseMood"),
  monthCloseLabel: document.querySelector("#monthCloseLabel"),
  monthDecisionStatus: document.querySelector("#monthDecisionStatus"),
  missingToCloseMetric: document.querySelector("#missingToCloseMetric"),
  currentIncomeTrend: document.querySelector("#currentIncomeTrend"),
  currentExpenseTrend: document.querySelector("#currentExpenseTrend"),
  pendingBillsTrend: document.querySelector("#pendingBillsTrend"),
  dashboardPayables: document.querySelector("#dashboardPayables"),
  dashboardPayableSummary: document.querySelector("#dashboardPayableSummary"),
  paymentConfirmDialog: document.querySelector("#paymentConfirmDialog"),
  paymentConfirmForm: document.querySelector("#paymentConfirmForm"),
  paymentConfirmBody: document.querySelector("#paymentConfirmBody"),
  closePaymentConfirmBtn: document.querySelector("#closePaymentConfirmBtn"),
  cancelPaymentConfirmBtn: document.querySelector("#cancelPaymentConfirmBtn"),
  cardLaunchDialog: document.querySelector("#cardLaunchDialog"),
  cardLaunchDialogTitle: document.querySelector("#cardLaunchDialogTitle"),
  cardLaunchDialogSummary: document.querySelector("#cardLaunchDialogSummary"),
  cardLaunchList: document.querySelector("#cardLaunchList"),
  closeCardLaunchDialogBtn: document.querySelector("#closeCardLaunchDialogBtn"),
  cancelCardLaunchDialogBtn: document.querySelector("#cancelCardLaunchDialogBtn"),
  cashflowPeriodLabel: document.querySelector("#cashflowPeriodLabel"),
  cashflowStartMetric: document.querySelector("#cashflowStartMetric"),
  cashflowIncomeMetric: document.querySelector("#cashflowIncomeMetric"),
  cashflowIncomeTrend: document.querySelector("#cashflowIncomeTrend"),
  cashflowExpenseMetric: document.querySelector("#cashflowExpenseMetric"),
  cashflowExpenseTrend: document.querySelector("#cashflowExpenseTrend"),
  cashflowLowMetric: document.querySelector("#cashflowLowMetric"),
  cashflowLowTrend: document.querySelector("#cashflowLowTrend"),
  cashflowDecisionHero: document.querySelector("#cashflowDecisionHero"),
  cashflowHealthTitle: document.querySelector("#cashflowHealthTitle"),
  cashflowHealthMessage: document.querySelector("#cashflowHealthMessage"),
  cashflowClosingMetric: document.querySelector("#cashflowClosingMetric"),
  cashflowCoverageTrend: document.querySelector("#cashflowCoverageTrend"),
  cashflowChartSummary: document.querySelector("#cashflowChartSummary"),
  cashflowChartLegend: document.querySelector("#cashflowChartLegend"),
  cashflowChart: document.querySelector("#cashflowChart"),
  cashflowTooltip: document.querySelector("#cashflowTooltip"),
  cashflowList: document.querySelector("#cashflowList"),
  pendingMonthLabel: document.querySelector("#pendingMonthLabel"),
  pendingMonthFilter: document.querySelector("#pendingMonthFilter"),
  pendingStatusFilter: document.querySelector("#pendingStatusFilter"),
  pendingPaymentFilter: document.querySelector("#pendingPaymentFilter"),
  markAllPendingPaidBtn: document.querySelector("#markAllPendingPaidBtn"),
  pendingTotalMetric: document.querySelector("#pendingTotalMetric"),
  pendingCountMetric: document.querySelector("#pendingCountMetric"),
  paidMonthMetric: document.querySelector("#paidMonthMetric"),
  verocardCreditMetric: document.querySelector("#verocardCreditMetric"),
  verocardBalanceMetric: document.querySelector("#verocardBalanceMetric"),
  verocardSpentMetric: document.querySelector("#verocardSpentMetric"),
  pendingCommandCenter: document.querySelector("#pendingCommandCenter"),
  pendingHealthTitle: document.querySelector("#pendingHealthTitle"),
  pendingHealthMessage: document.querySelector("#pendingHealthMessage"),
  pendingCoverageMetric: document.querySelector("#pendingCoverageMetric"),
  pendingCoverageTrend: document.querySelector("#pendingCoverageTrend"),
  pendingProgressBar: document.querySelector("#pendingProgressBar"),
  overduePendingMetric: document.querySelector("#overduePendingMetric"),
  todayPendingMetric: document.querySelector("#todayPendingMetric"),
  nextSevenPendingMetric: document.querySelector("#nextSevenPendingMetric"),
  pendingBillsList: document.querySelector("#pendingBillsList"),
  verocardLedger: document.querySelector("#verocardLedger"),
  analyticsPeriodLabel: document.querySelector("#analyticsPeriodLabel"),
  analyticsGroupFilter: document.querySelector("#analyticsGroupFilter"),
  analyticsPaymentFilter: document.querySelector("#analyticsPaymentFilter"),
  avgExpenseMetric: document.querySelector("#avgExpenseMetric"),
  avgExpenseTrend: document.querySelector("#avgExpenseTrend"),
  topGroupMetric: document.querySelector("#topGroupMetric"),
  topGroupTrend: document.querySelector("#topGroupTrend"),
  variationMetric: document.querySelector("#variationMetric"),
  variationTrend: document.querySelector("#variationTrend"),
  concentrationMetric: document.querySelector("#concentrationMetric"),
  analyticsDecisionHero: document.querySelector("#analyticsDecisionHero"),
  analyticsHealthTitle: document.querySelector("#analyticsHealthTitle"),
  analyticsHealthMessage: document.querySelector("#analyticsHealthMessage"),
  analyticsSavingsMetric: document.querySelector("#analyticsSavingsMetric"),
  analyticsSavingsTrend: document.querySelector("#analyticsSavingsTrend"),
  monthlyTrendChart: document.querySelector("#monthlyTrendChart"),
  groupCompareChart: document.querySelector("#groupCompareChart"),
  balanceClosingChart: document.querySelector("#balanceClosingChart"),
  balanceTooltip: document.querySelector("#balanceTooltip"),
  expenseRankingList: document.querySelector("#expenseRankingList"),
  decisionInsightsList: document.querySelector("#decisionInsightsList"),
  categoryChart: document.querySelector("#categoryChart"),
  monthProgressMessage: document.querySelector("#monthProgressMessage"),
  monthProgressFill: document.querySelector("#monthProgressFill"),
  incomeExpenseRingIncome: document.querySelector("#incomeExpenseRingIncome"),
  incomeExpenseRingExpense: document.querySelector("#incomeExpenseRingExpense"),
  incomeExpenseRatioMetric: document.querySelector("#incomeExpenseRatioMetric"),
  ringIncomeLabel: document.querySelector("#ringIncomeLabel"),
  ringExpenseLabel: document.querySelector("#ringExpenseLabel"),
  monthPaidCount: document.querySelector("#monthPaidCount"),
  monthPaidValue: document.querySelector("#monthPaidValue"),
  monthPendingCount: document.querySelector("#monthPendingCount"),
  monthPendingValue: document.querySelector("#monthPendingValue"),
  monthNextDue: document.querySelector("#monthNextDue"),
  monthNextDueDescription: document.querySelector("#monthNextDueDescription"),
  transactionRows: document.querySelector("#transactionRows"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  transactionSortFilter: document.querySelector("#transactionSortFilter"),
  transactionColumnFilters: document.querySelectorAll("[data-column-filter]"),
  clearColumnFiltersBtn: document.querySelector("#clearColumnFiltersBtn"),
  budgetEditorGrid: document.querySelector("#budgetEditorGrid"),
  applySuggestedBudgetsBtn: document.querySelector("#applySuggestedBudgetsBtn"),
  budgetHistoryLabel: document.querySelector("#budgetHistoryLabel"),
  budgetHealthTitle: document.querySelector("#budgetHealthTitle"),
  budgetHealthMessage: document.querySelector("#budgetHealthMessage"),
  budgetHealthScore: document.querySelector("#budgetHealthScore"),
  savingsGoalMetric: document.querySelector("#savingsGoalMetric"),
  emergencyGoalMetric: document.querySelector("#emergencyGoalMetric"),
  essentialGoalMetric: document.querySelector("#essentialGoalMetric"),
  flexibleGoalMetric: document.querySelector("#flexibleGoalMetric"),
  budgetSuggestionSummary: document.querySelector("#budgetSuggestionSummary"),
  categoryTags: document.querySelector("#categoryTags"),
  realDataSummary: document.querySelector("#realDataSummary"),
  csvImport: document.querySelector("#csvImport"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  catalogModalityOptions: document.querySelector("#catalogModalityOptions"),
  dialog: document.querySelector("#transactionDialog"),
  form: document.querySelector("#transactionForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  transactionId: document.querySelector("#transactionId"),
  dateInput: document.querySelector("#dateInput"),
  weekdayInput: document.querySelector("#weekdayInput"),
  transactionType: document.querySelector("#transactionType"),
  descriptionInput: document.querySelector("#descriptionInput"),
  descriptionOptions: document.querySelector("#descriptionOptions"),
  incomeAmountInput: document.querySelector("#incomeAmountInput"),
  expenseAmountInput: document.querySelector("#expenseAmountInput"),
  expenseClassInput: document.querySelector("#expenseClassInput"),
  groupInput: document.querySelector("#groupInput"),
  paymentMethodInput: document.querySelector("#paymentMethodInput"),
  modalityInput: document.querySelector("#modalityInput"),
  installmentFields: document.querySelector("#installmentFields"),
  purchaseTotalInput: document.querySelector("#purchaseTotalInput"),
  installmentCountInput: document.querySelector("#installmentCountInput"),
  installmentPreview: document.querySelector("#installmentPreview"),
  statusInput: document.querySelector("#statusInput"),
  notesInput: document.querySelector("#notesInput"),
  deleteTransactionBtn: document.querySelector("#deleteTransactionBtn"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  cancelDialogBtn: document.querySelector("#cancelDialogBtn"),
  appToast: document.querySelector("#appToast"),
  groupCatalogForm: document.querySelector("#groupCatalogForm"),
  newGroupInput: document.querySelector("#newGroupInput"),
  groupCatalogList: document.querySelector("#groupCatalogList"),
  groupCatalogCount: document.querySelector("#groupCatalogCount"),
  expenseClassCatalogForm: document.querySelector("#expenseClassCatalogForm"),
  newExpenseClassInput: document.querySelector("#newExpenseClassInput"),
  expenseClassCatalogList: document.querySelector("#expenseClassCatalogList"),
  expenseClassCatalogCount: document.querySelector("#expenseClassCatalogCount"),
  paymentCatalogForm: document.querySelector("#paymentCatalogForm"),
  newPaymentInput: document.querySelector("#newPaymentInput"),
  newPaymentModalityInput: document.querySelector("#newPaymentModalityInput"),
  adminUsersNav: document.querySelector("#adminUsersNav"),
  reloadUsersBtn: document.querySelector("#reloadUsersBtn"),
  registeredUsersMetric: document.querySelector("#registeredUsersMetric"),
  pendingUsersMetric: document.querySelector("#pendingUsersMetric"),
  activeUsersMetric: document.querySelector("#activeUsersMetric"),
  adminUsersFeedback: document.querySelector("#adminUsersFeedback"),
  adminUsersList: document.querySelector("#adminUsersList"),
  paymentCatalogList: document.querySelector("#paymentCatalogList"),
  paymentCatalogCount: document.querySelector("#paymentCatalogCount"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.transactions && saved?.budgets) return normalizeState(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return normalizeState(structuredClone(defaultState));
}

function saveState({ cloud = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (cloud) window.MEG_CLOUD?.saveState(state);
}

function replaceImportedState(transactions, options = {}) {
  state = normalizeState({
    transactions,
    budgets: state.budgets || {},
    catalogs: state.catalogs || DEFAULT_CATALOGS,
  });
  originalTransactionsById = new Map(state.transactions.map((item) => [item.id, item]));
  saveState(options);
  render();
  return state.transactions.length;
}

function normalizeTransaction(item) {
  const type = item.type || (normalizeText(item.launchType) === "RECEITA" ? "income" : "expense");
  const incomeAmount = Number(item.incomeAmount ?? (type === "income" ? item.amount : 0)) || 0;
  const expenseAmount = Number(item.expenseAmount ?? (type === "expense" ? item.amount : 0)) || 0;
  const group = item.group || (type === "income" ? "" : item.category || "");
  const paymentMethod = item.paymentMethod || item.account || "Nao informado";
  const situation = item.situation || (item.status === "paid" ? "PAGO" : "PENDENTE");

  return {
    ...item,
    type,
    launchType: type === "income" ? "RECEITA" : "DESPESA",
    weekday: item.weekday || weekdayShort(item.date),
    incomeAmount,
    expenseAmount,
    amount: type === "income" ? incomeAmount : expenseAmount,
    expenseClass: item.expenseClass || "",
    group,
    category: type === "income" ? "Receitas" : group || item.category || "Sem categoria",
    paymentMethod,
    account: paymentMethod,
    status: item.status || (normalizeText(situation) === "PAGO" ? "paid" : "pending"),
    situation,
    modality: item.modality || PAYMENT_MODALITIES[paymentMethod] || "",
    notes: item.notes || "",
  };
}

function normalizeState(nextState) {
  const incomingCatalogs = nextState.catalogs || {};
  const transactions = (nextState.transactions || []).map(normalizeTransaction);
  const groups = [...new Set([...DEFAULT_GROUPS, ...(incomingCatalogs.groups || []), ...transactions.map((item) => item.group)].map((item) => String(item || "").trim()).filter(Boolean))];
  const expenseClasses = [...new Set([...DEFAULT_CATALOGS.expenseClasses, ...(incomingCatalogs.expenseClasses || []), ...transactions.map((item) => item.expenseClass)].map((item) => String(item || "").trim()).filter(Boolean))];
  const paymentMap = new Map(DEFAULT_CATALOGS.paymentMethods.map((item) => [normalizeText(item.description), { ...item }]));
  (incomingCatalogs.paymentMethods || []).forEach((item) => {
    const description = String(item?.description || "").trim();
    if (description) paymentMap.set(normalizeText(description), { description, modality: String(item?.modality || "").trim() });
  });
  return {
    ...nextState,
    transactions,
    budgets: nextState.budgets || {},
    catalogs: { groups, expenseClasses, paymentMethods: [...paymentMap.values()] },
  };
}

function monthOf(date) {
  return String(date).slice(0, 7);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function weekdayShort(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  const labels = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return Number.isNaN(date.getTime()) ? "" : labels[date.getDay()];
}

function availableYears() {
  return [...new Set(state.transactions.map((item) => String(item.date).slice(0, 4)))].sort((a, b) => b.localeCompare(a));
}

function availableDateBounds() {
  const dates = state.transactions.map((item) => item.date).sort();
  return {
    min: dates[0] || `${currentMonth}-01`,
    max: dates[dates.length - 1] || `${currentMonth}-28`,
  };
}

function selectedTransactions() {
  if (selectedPeriod.mode === "all") return [...state.transactions];
  if (selectedPeriod.mode === "year") {
    return state.transactions.filter((item) => String(item.date).startsWith(selectedPeriod.year));
  }
  if (selectedPeriod.mode === "range") {
    const bounds = availableDateBounds();
    const start = selectedPeriod.start || bounds.min;
    const end = selectedPeriod.end || bounds.max;
    return state.transactions.filter((item) => item.date >= start && item.date <= end);
  }
  return state.transactions.filter((item) => monthOf(item.date) === selectedPeriod.month);
}

function expensesForMonth() {
  return selectedTransactions().filter((item) => item.type === "expense");
}

function totalsFor(items) {
  return items.reduce(
    (acc, item) => {
      if (item.type === "income") acc.income += Number(item.amount) || 0;
      if (item.type === "expense") acc.expense += Number(item.amount) || 0;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

function openingBalanceBefore(dateValue) {
  if (!dateValue) return 0;
  const totals = totalsFor(state.transactions.filter((item) => item.date < dateValue));
  return totals.income - totals.expense;
}

function financialSummaryForPeriod(items = selectedTransactions()) {
  const { start, end } = dateRangeForSelectedPeriod();
  return calculateFinancialSummary(state.transactions, start, end);
}

function currentMonthTransactions() {
  return state.transactions.filter((item) => monthOf(item.date) === currentMonth);
}

function previousMonthValue(monthValue = currentMonth) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 2, 1).toISOString().slice(0, 7);
}

function isVerocardTransaction(item) {
  const payment = normalizeText(item.paymentMethod || item.account);
  const description = normalizeText(item.description);
  if (item.type === "income") return description.includes("VEROCARD");
  if (item.type === "expense") return payment === "VEROCARD";
  return false;
}

function paidTransactionsUntilToday() {
  return state.transactions.filter((item) => item.date <= todayIso && !isVerocardTransaction(item));
}

function transactionsUntil(dateValue) {
  return state.transactions.filter((item) => item.date <= dateValue);
}

function accountBalanceUntil(dateValue) {
  const totals = totalsFor(transactionsUntil(dateValue));
  return totals.income - totals.expense;
}

function paymentImpactSinceBase(excludeId = "") {
  return state.transactions.reduce((sum, item) => {
    if (item.id === excludeId || item.type !== "expense" || item.status !== "paid" || isVerocardTransaction(item)) return sum;
    const original = originalTransactionsById.get(item.id);
    const becamePaid = original ? original.status !== "paid" : true;
    return becamePaid ? sum + Number(item.expenseAmount || item.amount || 0) : sum;
  }, 0);
}

function availableBankBalanceForPayment(excludeId = "") {
  const paidTotals = totalsFor(paidTransactionsUntilToday());
  const calculatedBalance = paidTotals.income - paidTotals.expense;
  const baseBalance = Number.isFinite(window.MEG_REAL_SUMMARY?.bankBalance) ? window.MEG_REAL_SUMMARY.bankBalance : calculatedBalance;
  return baseBalance - paymentImpactSinceBase(excludeId);
}

function canPayWithBankBalance(item, options = {}) {
  if (!item || item.type !== "expense" || isVerocardTransaction(item)) return { ok: true, available: availableBankBalanceForPayment(options.excludeId), amount: 0 };
  const amount = Number(item.expenseAmount || item.amount || 0);
  const available = availableBankBalanceForPayment(options.excludeId || item.id);
  return {
    ok: amount <= Math.max(available, 0),
    available,
    amount,
  };
}

function alertInsufficientBankBalance({ amount, available }) {
  showToast("Saldo bancario insuficiente", `Pagamento: ${money.format(amount)} · Disponivel: ${money.format(Math.max(available, 0))}`, "danger");
}

let toastTimer;
let payableGroupCache = new Map();
let paymentConfirmationIds = [];
let suggestedBudgetsByCategory = new Map();

function showToast(title, message, tone = "") {
  if (!els.appToast) return;
  clearTimeout(toastTimer);
  els.appToast.className = `app-toast visible ${tone}`;
  els.appToast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  toastTimer = setTimeout(() => {
    els.appToast.classList.remove("visible");
  }, 5200);
}

function currentSituation() {
  const monthStart = `${currentMonth}-01`;
  const monthEnd = lastDayOfMonth(currentMonth);
  const summary = calculateFinancialSummary(state.transactions, monthStart, monthEnd);
  const currentItems = currentMonthTransactions().filter((item) => !isVerocardTransaction(item));
  const currentTotals = { income: summary.income, expense: summary.paidExpense };
  const calculatedBalance = summary.closingBalance;
  const availableBalance = summary.closingBalance;
  const previousMonth = previousMonthValue();
  const previousMonthEnd = lastDayOfMonth(previousMonth);
  const previousCloseBalance = summary.openingBalance;
  const allPendingItems = currentItems
    .filter((item) => item.type === "expense" && item.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR"));
  const allPendingExpenses = allPendingItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingExpenses = summary.pendingExpense;
  const pendingItems = allPendingItems;
  const missingToClose = Math.max(-summary.projectedBalance, 0);
  const surplusAfterPending = Math.max(summary.projectedBalance, 0);

  return {
    currentItems,
    currentTotals,
    previousMonth,
    previousMonthEnd,
    previousCloseBalance,
    availableBalance,
    calculatedBalance,
    allPendingExpenses,
    allPendingItems,
    pendingExpenses,
    pendingItems,
    missingToClose,
    surplusAfterPending,
  };
}

function categoryTotals() {
  return expensesForMonth().reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
    return acc;
  }, {});
}

function sortedCategories() {
  return [...new Set(state.catalogs?.groups || DEFAULT_GROUPS)].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function sortedAccounts() {
  return [...new Set((state.catalogs?.paymentMethods || DEFAULT_CATALOGS.paymentMethods).map((item) => item.description))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function sortedExpenseClasses() {
  return [...new Set(state.catalogs?.expenseClasses || DEFAULT_CATALOGS.expenseClasses)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function sortedModalities() {
  return [...new Set([...(state.catalogs?.paymentMethods || DEFAULT_CATALOGS.paymentMethods).map((item) => item.modality), ...Object.values(PAYMENT_MODALITIES)])].filter(Boolean).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

function periodLabel() {
  if (selectedPeriod.mode === "all") return "Todos os dados";
  if (selectedPeriod.mode === "year") return `Ano ${selectedPeriod.year}`;
  if (selectedPeriod.mode === "range") {
    const bounds = availableDateBounds();
    return `${formatDate(selectedPeriod.start || bounds.min)} a ${formatDate(selectedPeriod.end || bounds.max)}`;
  }
  return formatMonth(selectedPeriod.month);
}

function selectedPeriodMonthCount(items) {
  if (selectedPeriod.mode === "month") return 1;
  const months = new Set(items.map((item) => monthOf(item.date)));
  return Math.max(months.size, 1);
}

function dateRangeForSelectedPeriod() {
  const bounds = availableDateBounds();
  if (selectedPeriod.mode === "all") return { start: bounds.min, end: bounds.max };
  if (selectedPeriod.mode === "year") return { start: `${selectedPeriod.year}-01-01`, end: `${selectedPeriod.year}-12-31` };
  if (selectedPeriod.mode === "range") return { start: selectedPeriod.start || bounds.min, end: selectedPeriod.end || bounds.max };
  return { start: `${selectedPeriod.month}-01`, end: lastDayOfMonth(selectedPeriod.month) };
}

function lastDayOfMonth(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  return Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
}

function previousPeriodTransactions() {
  const { start, end } = dateRangeForSelectedPeriod();
  const length = daysBetween(start, end);
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(length - 1));
  return state.transactions.filter((item) => item.date >= previousStart && item.date <= previousEnd);
}

function monthlyBuckets(items) {
  const buckets = new Map();
  items.forEach((item) => {
    const key = monthOf(item.date);
    if (!buckets.has(key)) buckets.set(key, { month: key, income: 0, expense: 0 });
    const bucket = buckets.get(key);
    if (item.type === "income") bucket.income += Number(item.incomeAmount || item.amount || 0);
    if (item.type === "expense") bucket.expense += Number(item.expenseAmount || item.amount || 0);
  });
  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function groupExpenseRows(items) {
  const totals = new Map();
  items
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      const group = item.group || item.category || "Sem grupo";
      totals.set(group, (totals.get(group) || 0) + Number(item.expenseAmount || item.amount || 0));
    });
  return [...totals.entries()]
    .map(([group, value]) => ({ group, value }))
    .sort((a, b) => b.value - a.value);
}

function modalityExpenseRows(items) {
  const totals = new Map();
  items
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      const modality = item.modality || PAYMENT_MODALITIES[item.paymentMethod || item.account] || "Sem modalidade";
      totals.set(modality, (totals.get(modality) || 0) + Number(item.expenseAmount || item.amount || 0));
    });
  return [...totals.entries()]
    .map(([modality, value]) => ({ modality, value }))
    .sort((a, b) => b.value - a.value);
}

function modalityEvolutionRows(items) {
  const buckets = new Map();
  items
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      const key = monthOf(item.date);
      buckets.set(key, (buckets.get(key) || 0) + Number(item.expenseAmount || item.amount || 0));
    });
  return [...buckets.entries()]
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function selectedMonthsInPeriod() {
  const { start, end } = dateRangeForSelectedPeriod();
  const months = [];
  let cursor = monthOf(start);
  const endMonth = monthOf(end);
  while (cursor <= endMonth) {
    months.push(cursor);
    const [year, month] = cursor.split("-").map(Number);
    cursor = new Date(year, month, 1).toISOString().slice(0, 7);
  }
  return months;
}

function monthlyClosingBalanceRows() {
  return selectedMonthsInPeriod().map((month) => ({
    month,
    value: accountBalanceUntil(lastDayOfMonth(month)),
  }));
}

function selectedOptions(select) {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function setMultiOptions(select, values, selectedValues) {
  const selected = new Set(selectedValues);
  select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}" ${selected.has(value) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function renderAnalyticsFilters(items = selectedTransactions()) {
  const payments = [...new Set(items.map((item) => item.modality || PAYMENT_MODALITIES[item.paymentMethod || item.account]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  analyticsFilters.groups = [];
  analyticsFilters.payments = analyticsFilters.payments.filter((item) => payments.includes(item));
  if (els.analyticsGroupFilter) setMultiOptions(els.analyticsGroupFilter, [], analyticsFilters.groups);
  setMultiOptions(els.analyticsPaymentFilter, payments, analyticsFilters.payments);
}

function groupAnalyticsTransactions(items = selectedTransactions()) {
  return filterAnalyticsGroups(items);
}

function paymentAnalyticsTransactions(items = selectedTransactions()) {
  return filterAnalyticsPayments(items);
}

function filterAnalyticsGroups(items) {
  return items.filter((item) => {
    const group = item.group || item.category || "";
    const groupOk = !analyticsFilters.groups.length || analyticsFilters.groups.includes(group);
    return groupOk;
  });
}

function filterAnalyticsPayments(items) {
  return items.filter((item) => {
    const payment = item.modality || PAYMENT_MODALITIES[item.paymentMethod || item.account] || "";
    return !analyticsFilters.payments.length || analyticsFilters.payments.includes(payment);
  });
}

function render() {
  renderPeriodControls();
  renderDatalists();
  renderAnalyticsFilters();
  renderDashboard();
  renderCashflow();
  renderAnalytics();
  renderTransactions();
  renderBudgets();
  renderPending();
  renderCatalogs();
  renderSettings();
}

function renderDashboard() {
  const items = selectedTransactions();
  const totals = financialSummaryForPeriod(items);
  const balance = totals.consolidatedBalance;
  const monthCount = selectedPeriodMonthCount(items);
  const totalBudget = Object.values(state.budgets).reduce((sum, value) => sum + Number(value || 0), 0) * monthCount;
  const usedBudget = totalBudget ? Math.round((totals.expense / totalBudget) * 100) : 0;

  els.dashboardTitle.textContent = `Resumo - ${periodLabel()}`;
  if (els.categoryChartNote) els.categoryChartNote.textContent = `${formatCompactMoney(totals.expense)} no periodo`;
  els.monetaryRevenueMetric.textContent = money.format(totals.availableIncome);
  els.monetaryExpenseMetric.textContent = money.format(totals.paidExpense);
  els.monetarySituationMetric.textContent = money.format(totals.closingBalance);
  els.monetaryRevenueNote.textContent = selectedPeriod.mode !== "month"
    ? `${money.format(totals.income)} no período + ${money.format(totals.openingBalance)} anteriores`
    : `${money.format(totals.income)} em ${formatMonthCode(selectedPeriod.month)} + ${money.format(totals.openingBalance)} até ${formatMonthCode(previousMonthValue(selectedPeriod.month))}`;
  els.monetaryExpenseNote.textContent = `${money.format(totals.pendingExpense)} ainda pendentes`;
  els.monetarySituationNote.textContent = totals.closingBalance >= 0 ? "✅ Saldo monetário positivo" : "🚨 Saldo monetário negativo";
  els.ticketRevenueMetric.textContent = money.format(totals.ticketIncome);
  els.ticketExpenseMetric.textContent = money.format(totals.ticketExpense);
  els.ticketSituationMetric.textContent = money.format(totals.ticketBalance);
  els.ticketRevenueNote.textContent = `Créditos no período selecionado`;
  els.ticketExpenseNote.textContent = `Utilizações no período selecionado`;
  els.ticketSituationNote.textContent = totals.ticketBalance >= 0 ? "✅ Ticket disponível" : "🚨 Ticket negativo";
  els.consolidatedRevenueMetric.textContent = money.format(totals.consolidatedIncome);
  els.consolidatedExpenseMetric.textContent = money.format(totals.consolidatedExpense);
  els.consolidatedSituationMetric.textContent = money.format(totals.consolidatedBalance);
  els.consolidatedSituationNote.textContent = totals.consolidatedBalance >= 0 ? "🟢 Situação geral positiva" : "🔴 Situação geral negativa";
  const setCardTone = (card, positive) => {
    card?.classList.toggle("kpi-positive", positive);
    card?.classList.toggle("kpi-negative", !positive);
  };
  setCardTone(els.monetaryPanel, totals.closingBalance >= 0);
  setCardTone(els.ticketPanel, totals.ticketBalance >= 0);
  setCardTone(els.consolidatedPanel, totals.consolidatedBalance >= 0);

  renderCurrentSituation();
  renderDashboardPayables();
  renderCategoryChart();
  renderMonthProgress();
}

function modalityForPayment(method) {
  const catalogItem = (state.catalogs?.paymentMethods || []).find((item) => normalizeText(item.description) === normalizeText(method));
  return catalogItem?.modality || PAYMENT_MODALITIES[method] || "";
}

function refreshPaymentMethodOptions(preferred = "") {
  const modality = normalizeText(els.modalityInput.value);
  const allowed = (state.catalogs?.paymentMethods || DEFAULT_CATALOGS.paymentMethods)
    .filter((item) => !modality || normalizeText(item.modality) === modality)
    .map((item) => item.description)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  els.paymentMethodInput.innerHTML = allowed.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join("");
  if (allowed.includes(preferred)) els.paymentMethodInput.value = preferred;
}

function renderCurrentSituation() {
  const situation = currentSituation();
  const currentIncomeCount = situation.currentItems.filter((item) => item.type === "income").length;
  const currentExpenseCount = situation.currentItems.filter((item) => item.type === "expense" && item.status === "paid").length;

  els.currentMonthLabel.textContent = `${formatMonth(currentMonth)} - hoje ${formatDate(todayIso)}`;
  els.previousCloseLabel.textContent = `Saldo fechamento ${formatMonthCode(situation.previousMonth)}`;
  els.availableBalanceMetric.textContent = money.format(situation.previousCloseBalance);
  els.previousCloseTrend.textContent = `Base trazida para ${formatMonthCode(currentMonth)}`;
  els.currentIncomeMetric.textContent = money.format(situation.currentTotals.income);
  els.currentExpenseMetric.textContent = money.format(situation.currentTotals.expense);
  els.pendingLaunchedLabel.textContent = "Contas monetárias a pagar";
  els.pendingLaunchedMetric.textContent = money.format(situation.allPendingExpenses);
  els.pendingLaunchedTrend.textContent = situation.allPendingItems.length
    ? `${situation.allPendingItems.length} conta(s) · próxima: ${formatDate(situation.allPendingItems[0].date)}`
    : "✅ Nenhuma conta pendente no mês";
  els.monthCloseCard.classList.toggle("danger", situation.missingToClose > 0);
  els.monthCloseCard.classList.toggle("positive-card", situation.missingToClose <= 0);
  els.monthCloseMood.textContent = situation.missingToClose > 0 ? "🚨" : "✅";
  els.monthCloseLabel.textContent = situation.missingToClose > 0 ? `Falta dinheiro para fechar ${formatMonthCode(currentMonth)}` : `Dinheiro suficiente para fechar ${formatMonthCode(currentMonth)}`;
  els.missingToCloseMetric.textContent = situation.missingToClose > 0 ? money.format(situation.missingToClose) : money.format(Math.max(situation.surplusAfterPending, 0));
  els.monthDecisionStatus.textContent = situation.missingToClose > 0 ? "ATENÇÃO" : "SAUDÁVEL";
  els.currentIncomeTrend.textContent = `${currentIncomeCount} lancamentos`;
  els.currentExpenseTrend.textContent = `${currentExpenseCount} lancamentos`;
  els.pendingBillsTrend.textContent =
    situation.missingToClose > 0
      ? `As receitas disponíveis não cobrem todas as despesas monetárias previstas do mês.`
      : `Sobra prevista após pagar todas as despesas monetárias do mês.`;
}

function isCreditCardExpense(item) {
  const method = normalizeText(item.paymentMethod || item.account);
  const modality = normalizeText(item.modality);
  return item.type === "expense" && (modality.includes("CREDITO") || method.includes("CARTAO") || method.includes("CREDITO"));
}

function renderDashboardPayables() {
  const pending = selectedTransactions()
    .filter((item) => item.type === "expense" && item.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR"));
  const grouped = new Map();

  pending.forEach((item) => {
    const payment = item.paymentMethod || item.account || "Não informado";
    const key = isCreditCardExpense(item) ? `card:${item.date}:${normalizeText(payment)}` : `item:${item.id}`;
    if (!grouped.has(key)) grouped.set(key, { date: item.date, payment, isCard: isCreditCardExpense(item), items: [] });
    grouped.get(key).items.push(item);
  });

  const groups = [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date) || a.payment.localeCompare(b.payment, "pt-BR"));
  payableGroupCache = new Map(groups.map((group, index) => [`payable-${index}`, group]));
  const total = pending.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  els.dashboardPayableSummary.textContent = `${pending.length} lançamento(s) · ${money.format(total)} em aberto`;
  els.dashboardPayables.innerHTML = groups.length
    ? groups.map((group, index) => {
        const totalGroup = group.items.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
        const overdue = group.date < todayIso;
        const title = group.isCard ? `Fatura ${group.payment}` : group.items[0].description;
        const groupKey = `payable-${index}`;
        const cardItems = group.items.length > 5
          ? `<button type="button" class="card-launch-button" data-card-group="${groupKey}">Editar ${group.items.length} lançamentos do cartão <span>→</span></button>`
          : `<div class="payable-card-items">${group.items.map((item) => `<button type="button" class="payable-item-link" data-edit="${escapeHtml(item.id)}"><span>${escapeHtml(item.description)}</span><strong>${money.format(item.expenseAmount || item.amount || 0)}</strong></button>`).join("")}</div>`;
        const info = group.isCard
          ? `<div class="payable-info"><span class="payable-kind">💳 CARTÃO DE CRÉDITO</span><strong>${escapeHtml(title)}</strong>${cardItems}</div>`
          : `<button type="button" class="payable-info payable-edit-single" data-edit="${escapeHtml(group.items[0].id)}"><span class="payable-kind">🧾 CONTA · CLIQUE PARA EDITAR</span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(group.payment)} · ${escapeHtml(group.items[0].group || group.items[0].category || "Sem categoria")}</small></button>`;
        return `<article class="payable-row ${overdue ? "overdue" : ""}">
          <div class="payable-date"><strong>${formatDate(group.date)}</strong><small>${overdue ? "VENCIDA" : "VENCIMENTO"}</small></div>
          ${info}
          <strong class="payable-amount">${money.format(totalGroup)}</strong>
          <button class="button pay-now-button" type="button" data-payable-group="payable-${index}">Pagar</button>
        </article>`;
      }).join("")
    : `<div class="empty payable-empty">✅ Nenhuma conta pendente no período selecionado.</div>`;
}

function openCardLaunchDialog(groupKey) {
  const group = payableGroupCache.get(groupKey);
  if (!group?.isCard) return;
  const total = group.items.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  els.cardLaunchDialogTitle.textContent = `Fatura ${group.payment}`;
  els.cardLaunchDialogSummary.textContent = `${formatDate(group.date)} · ${group.items.length} lançamento(s) · ${money.format(total)}`;
  els.cardLaunchList.innerHTML = group.items.map((item) => `
    <button type="button" class="card-launch-row" data-edit="${escapeHtml(item.id)}">
      <span><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.group || item.category || "Sem categoria")} · ${escapeHtml(item.status === "paid" ? "PAGO" : "PENDENTE")}</small></span>
      <strong>${money.format(item.expenseAmount || item.amount || 0)}</strong>
    </button>`).join("");
  els.cardLaunchDialog.showModal();
}

function openPaymentConfirmation(groupKey) {
  const group = payableGroupCache.get(groupKey);
  if (!group) return;
  paymentConfirmationIds = group.items.map((item) => item.id);
  const total = group.items.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  els.paymentConfirmBody.innerHTML = `
    <div class="payment-confirm-summary"><span>${group.isCard ? "💳 Fatura agrupada" : "🧾 Conta a pagar"}</span><strong>${money.format(total)}</strong><small>Vencimento em ${formatDate(group.date)}</small></div>
    <div class="payment-confirm-list">${group.items.map((item) => `<div><span>${escapeHtml(item.description)}</span><strong>${money.format(item.expenseAmount || item.amount || 0)}</strong></div>`).join("")}</div>
    <p>Ao confirmar, ${group.items.length === 1 ? "este lançamento será marcado" : "estes lançamentos serão marcados"} como <strong>PAGO</strong>.</p>`;
  els.paymentConfirmDialog.showModal();
}

function confirmDashboardPayment(event) {
  event.preventDefault();
  const items = paymentConfirmationIds.map((id) => state.transactions.find((item) => item.id === id)).filter(Boolean);
  if (!items.length) return els.paymentConfirmDialog.close();
  const monetaryTotal = items.filter((item) => !isVerocardTransaction(item)).reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const available = availableBankBalanceForPayment();
  if (monetaryTotal > Math.max(available, 0)) {
    els.paymentConfirmDialog.close();
    alertInsufficientBankBalance({ amount: monetaryTotal, available });
    return;
  }
  items.forEach((item) => { item.status = "paid"; item.situation = "PAGO"; });
  saveState();
  els.paymentConfirmDialog.close();
  showToast("Pagamento confirmado", `${items.length} lançamento(s) marcado(s) como PAGO`, "success");
  paymentConfirmationIds = [];
  render();
}

function renderQuickSignals() {
  const monthItems = currentMonthTransactions();
  const monthExpenses = monthItems.filter((item) => item.type === "expense");
  const groups = groupExpenseRows(monthItems);
  const topGroup = groups[0];
  const pendingSoon = monthExpenses
    .filter((item) => item.status === "pending" && item.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const situation = currentSituation();
  const verocard = verocardSummary(currentMonth);
  const signals = [
    {
      tone: situation.missingToClose > 0 ? "risk" : "positive",
      title: situation.missingToClose > 0 ? "Falta para fechar" : "Sobra prevista",
      value: money.format(situation.missingToClose > 0 ? situation.missingToClose : Math.max(situation.surplusAfterPending, 0)),
      text: "Apos pendencias do mes",
    },
    {
      tone: topGroup ? "attention" : "",
      title: "Maior gasto",
      value: topGroup ? topGroup.group : "-",
      text: topGroup ? money.format(topGroup.value) : "Sem despesas no mes",
    },
    {
      tone: pendingSoon ? "risk" : "",
      title: "Proxima pendencia",
      value: pendingSoon ? formatDate(pendingSoon.date) : "Sem alerta",
      text: pendingSoon ? `${pendingSoon.description} · ${money.format(pendingSoon.amount)}` : "Nada futuro pendente",
    },
    {
      tone: verocard.balance < 0 ? "risk" : "positive",
      title: "VEROCARD",
      value: money.format(verocard.balance),
      text: `${money.format(verocard.spent)} em gastos`,
    },
  ];
  els.quickSignals.innerHTML = signals
    .map(
      (item) => `
        <article class="signal-card ${item.tone}">
          <span>${escapeHtml(item.title)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.text)}</small>
        </article>
      `,
    )
    .join("");
}

function cashflowData() {
  const { start, end } = dateRangeForSelectedPeriod();
  const openingBalance = accountBalanceUntil(addDays(start, -1));
  const movements = state.transactions
    .filter((item) => item.date >= start && item.date <= end && !isVerocardTransaction(item))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "income" ? -1 : 1) || a.description.localeCompare(b.description, "pt-BR"));
  const daily = new Map();
  movements.forEach((item) => {
    if (!daily.has(item.date)) daily.set(item.date, { date: item.date, income: 0, expense: 0, items: [] });
    const bucket = daily.get(item.date);
    const value = Number(item.amount || 0);
    if (item.type === "income") bucket.income += value;
    if (item.type === "expense") bucket.expense += value;
    bucket.items.push(item);
  });
  let running = openingBalance;
  const points = [...daily.values()].map((bucket) => {
    running += bucket.income - bucket.expense;
    return { ...bucket, value: running, net: bucket.income - bucket.expense };
  });
  const totals = totalsFor(movements);
  const lowPoint = points.reduce((lowest, point) => (!lowest || point.value < lowest.value ? point : lowest), null);
  return { openingBalance, movements, points, totals, lowPoint, start, end };
}

let cashflowChartPoints = [];

function renderCashflow() {
  if (!els.cashflowChart) return;
  const data = cashflowData();
  els.cashflowPeriodLabel.textContent = `${formatDate(data.start)} a ${formatDate(data.end)} · sem VEROCARD`;
  els.cashflowStartMetric.textContent = money.format(data.openingBalance);
  els.cashflowIncomeMetric.textContent = money.format(data.totals.income);
  els.cashflowExpenseMetric.textContent = money.format(data.totals.expense);
  els.cashflowIncomeTrend.textContent = `${data.movements.filter((item) => item.type === "income").length} receitas`;
  els.cashflowExpenseTrend.textContent = `${data.movements.filter((item) => item.type === "expense").length} despesas`;
  els.cashflowLowMetric.textContent = money.format(data.lowPoint ? data.lowPoint.value : data.openingBalance);
  els.cashflowLowTrend.textContent = data.lowPoint ? `Em ${formatDate(data.lowPoint.date)}` : "Sem movimentos";
  const closingBalance = data.points.at(-1)?.value ?? data.openingBalance;
  const availableResources = data.openingBalance + data.totals.income;
  const coverage = data.totals.expense ? (availableResources / data.totals.expense) * 100 : 100;
  const negativePoints = data.points.filter((point) => point.value < 0);
  const tone = closingBalance < 0 || negativePoints.length ? "risk" : coverage < 110 ? "attention" : "healthy";
  els.cashflowDecisionHero.classList.remove("risk", "attention", "healthy");
  els.cashflowDecisionHero.classList.add(tone);
  els.cashflowClosingMetric.textContent = money.format(closingBalance);
  els.cashflowCoverageTrend.textContent = `${coverage.toFixed(0)}% das saídas cobertas pelos recursos do período`;
  if (negativePoints.length) {
    els.cashflowHealthTitle.textContent = `O caixa fica negativo em ${negativePoints.length} data(s)`;
    els.cashflowHealthMessage.textContent = `O primeiro alerta ocorre em ${formatDate(negativePoints[0].date)}. Antecipe receitas ou reprograme pagamentos antes dessa data.`;
  } else if (closingBalance >= 0 && coverage >= 110) {
    els.cashflowHealthTitle.textContent = "Caixa seguro no período selecionado";
    els.cashflowHealthMessage.textContent = `O menor saldo previsto é ${money.format(data.lowPoint?.value ?? data.openingBalance)} e não há ruptura de caixa.`;
  } else {
    els.cashflowHealthTitle.textContent = "Caixa fecha, mas com pouca margem";
    els.cashflowHealthMessage.textContent = "As obrigações estão cobertas, porém qualquer gasto inesperado pode comprometer o fechamento.";
  }
  els.cashflowChartSummary.textContent = `${data.points.length} dia(s) com movimentação · fechamento ${money.format(closingBalance)}`;
  els.cashflowChartLegend.innerHTML = `
    <span><i class="legend-dot opening"></i>Inicial <strong>${money.format(data.openingBalance)}</strong></span>
    <span><i class="legend-dot low"></i>Menor saldo <strong>${money.format(data.lowPoint?.value ?? data.openingBalance)}</strong></span>
    <span><i class="legend-dot closing"></i>Fechamento <strong>${money.format(closingBalance)}</strong></span>`;
  renderCashflowChart(data.points, data.openingBalance, data.start);
  renderCashflowList(data.movements);
}

function renderCashflowList(items) {
  els.cashflowList.innerHTML = items.length
    ? items.slice(0, 16)
        .map(
          (item) => `
            <div class="cashflow-item">
              <span>
                <strong>${escapeHtml(item.description)}</strong>
                <small>${formatDate(item.date)} · ${escapeHtml(item.paymentMethod || item.account || "")} · ${escapeHtml(item.group || item.category || "")}</small>
              </span>
              <strong class="amount ${item.type === "income" ? "positive" : "negative"}">${item.type === "income" ? "+" : "-"}${money.format(item.amount)}</strong>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">Sem movimentos bancarios no periodo.</div>`;
}

function renderCashflowChart(points, openingBalance, startDate) {
  const canvas = els.cashflowChart;
  const ctx = setupCanvas(canvas, 1120, 320);
  const width = canvas.clientWidth || Number(canvas.getAttribute("width")) || 1120;
  const height = canvas.clientHeight || Number(canvas.getAttribute("height")) || 320;
  ctx.clearRect(0, 0, width, height);
  cashflowChartPoints = [];
  const data = [{ date: startDate, value: openingBalance, income: 0, expense: 0, net: 0, opening: true }, ...points];
  const values = data.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = Math.max(max - min, 1);
  const pad = { left: 62, right: 28, top: 34, bottom: 28 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const xStep = plotWidth / Math.max(data.length - 1, 1);
  drawGrid(ctx, width, height, pad);

  const zeroY = pad.top + plotHeight - ((0 - min) / range) * plotHeight;
  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "rgba(188, 66, 54, 0.45)";
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(width - pad.right, zeroY);
  ctx.stroke();
  ctx.restore();

  const chartPoints = data.map((item, index) => {
    const x = pad.left + index * xStep;
    const y = pad.top + plotHeight - ((item.value - min) / range) * plotHeight;
    return { ...item, x, y };
  });

  const closingPositive = data.at(-1).value >= 0;
  ctx.strokeStyle = closingPositive ? "#176b5d" : "#bc4236";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawSmoothPath(ctx, chartPoints);
  ctx.stroke();

  const fill = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotHeight);
  fill.addColorStop(0, closingPositive ? "rgba(31, 191, 155, 0.22)" : "rgba(188, 66, 54, 0.2)");
  fill.addColorStop(1, "rgba(255, 255, 255, 0.02)");
  ctx.fillStyle = fill;
  ctx.lineTo(chartPoints[chartPoints.length - 1].x, pad.top + plotHeight);
  ctx.lineTo(chartPoints[0].x, pad.top + plotHeight);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = "center";
  const importantIndexes = new Set([0, chartPoints.length - 1]);
  const lowIndex = chartPoints.reduce((best, point, index) => point.value < chartPoints[best].value ? index : best, 0);
  importantIndexes.add(lowIndex);
  const step = Math.max(1, Math.ceil(chartPoints.length / 10));
  chartPoints.forEach((point, index) => {
    if (!importantIndexes.has(index) && index % step !== 0) return;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = point.value < 0 ? "#bc4236" : "#176b5d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (importantIndexes.has(index)) {
      ctx.fillStyle = "#18201d";
      ctx.font = "800 12px Inter, system-ui, sans-serif";
      ctx.fillText(formatCompactNumber(point.value), point.x, Math.max(16, point.y - 13));
    }
  });
  cashflowChartPoints = chartPoints;
  ctx.textAlign = "left";
}

function renderAnalytics() {
  const periodItems = selectedTransactions();
  const paymentItems = paymentAnalyticsTransactions(periodItems);
  const expenses = paymentItems.filter((item) => item.type === "expense");
  const totals = totalsFor(paymentItems);
  const monthCount = selectedPeriodMonthCount(periodItems);
  const groups = groupExpenseRows(paymentItems);
  const evolution = modalityEvolutionRows(paymentItems);
  const closingBalances = monthlyClosingBalanceRows();
  const topGroup = groups[0];
  const previousTotals = totalsFor(filterAnalyticsPayments(previousPeriodTransactions()));
  const previousExpense = previousTotals.expense || 0;
  const variation = previousExpense ? ((totals.expense - previousExpense) / previousExpense) * 100 : 0;
  const top3 = groups.slice(0, 3).reduce((sum, item) => sum + item.value, 0);
  const concentration = totals.expense ? (top3 / totals.expense) * 100 : 0;
  const result = totals.income - totals.expense;
  const savingsRate = totals.income ? (result / totals.income) * 100 : 0;

  const paymentLabel = analyticsFilters.payments.length ? `${analyticsFilters.payments.length} modalidade(s)` : "todas as modalidades";
  els.analyticsPeriodLabel.textContent = `${periodLabel()} · modalidades: ${paymentLabel}`;
  els.avgExpenseMetric.textContent = money.format(totals.expense / monthCount);
  els.avgExpenseTrend.textContent = `${monthCount} mes(es) no periodo`;
  els.topGroupMetric.textContent = topGroup ? topGroup.group : "-";
  els.topGroupTrend.textContent = topGroup ? money.format(topGroup.value) : money.format(0);
  els.variationMetric.textContent = previousExpense ? `${variation > 0 ? "+" : ""}${variation.toFixed(1)}%` : "Sem base";
  els.variationTrend.textContent = previousExpense ? `Periodo anterior: ${money.format(previousExpense)}` : "Sem periodo anterior comparavel";
  els.concentrationMetric.textContent = `${concentration.toFixed(0)}%`;

  const analyticsTone = result < 0 ? "risk" : savingsRate >= 20 ? "healthy" : "attention";
  els.analyticsDecisionHero.classList.remove("risk", "attention", "healthy");
  els.analyticsDecisionHero.classList.add(analyticsTone);
  els.analyticsSavingsMetric.textContent = money.format(result);
  els.analyticsSavingsTrend.textContent = totals.income ? `Taxa de economia: ${savingsRate.toFixed(1)}%` : "Sem receitas no período";
  if (result < 0) {
    els.analyticsHealthTitle.textContent = "Despesas acima das receitas";
    els.analyticsHealthMessage.textContent = `O período apresenta déficit de ${money.format(Math.abs(result))}. ${topGroup ? `${topGroup.group} é o primeiro grupo a revisar.` : "Revise os maiores gastos."}`;
  } else if (savingsRate >= 20) {
    els.analyticsHealthTitle.textContent = "Período financeiramente saudável";
    els.analyticsHealthMessage.textContent = `Você preservou ${savingsRate.toFixed(1)}% das receitas. A referência saudável de 20% foi alcançada.`;
  } else {
    els.analyticsHealthTitle.textContent = "Resultado positivo, com espaço para evoluir";
    els.analyticsHealthMessage.textContent = `O período fecha positivo em ${money.format(result)}, mas a taxa de economia está abaixo da referência de 20%.`;
  }

  renderModalityEvolutionChart(evolution);
  renderBalanceClosingChart(closingBalances);
  renderGroupBarChart(groups.slice(0, 10));
  renderExpenseRanking(groups, totals.expense);
  renderDecisionInsights({ groups, totals, variation, previousExpense, concentration, expenses });
}

let balanceChartPoints = [];

function renderModalityEvolutionChart(data) {
  const canvas = els.monthlyTrendChart;
  const ctx = setupCanvas(canvas, 760, 320);
  const width = canvas.clientWidth || Number(canvas.getAttribute("width")) || 760;
  const height = canvas.clientHeight || Number(canvas.getAttribute("height")) || 320;
  ctx.clearRect(0, 0, width, height);
  if (!data.length) return drawEmptyChart(ctx, width, height);

  const max = Math.max(...data.map((item) => item.value), 1);
  const pad = { left: 48, right: 22, top: 36, bottom: 70 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const gap = data.length > 10 ? 8 : 14;
  const barWidth = Math.max(24, (plotWidth - gap * (data.length - 1)) / data.length);
  drawGrid(ctx, width, height, pad);
  ctx.textAlign = "center";
  data.forEach((item, index) => {
    const x = pad.left + index * (barWidth + gap);
    const h = (plotHeight * item.value) / max;
    const y = pad.top + plotHeight - h;
    ctx.fillStyle = "#176b5d";
    roundRect(ctx, x, y, barWidth, h, 7);
    ctx.fill();
    ctx.fillStyle = "#18201d";
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    ctx.fillText(formatCompactNumber(item.value), x + barWidth / 2, Math.max(14, y - 8));
    ctx.save();
    ctx.translate(x + barWidth / 2, height - 36);
    ctx.rotate(data.length > 8 ? -Math.PI / 5 : 0);
    ctx.fillStyle = "#64706b";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(formatMonthShort(item.period), 0, 0);
    ctx.restore();
  });
  ctx.textAlign = "left";
}

function renderBalanceClosingChart(data) {
  const canvas = els.balanceClosingChart;
  const ctx = setupCanvas(canvas, 1120, 320);
  const width = canvas.clientWidth || Number(canvas.getAttribute("width")) || 1120;
  const height = canvas.clientHeight || Number(canvas.getAttribute("height")) || 320;
  ctx.clearRect(0, 0, width, height);
  balanceChartPoints = [];
  if (!data.length) return drawEmptyChart(ctx, width, height);

  const values = data.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = Math.max(max - min, 1);
  const pad = { left: 62, right: 28, top: 34, bottom: 28 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const xStep = plotWidth / Math.max(data.length - 1, 1);
  drawGrid(ctx, width, height, pad);

  const zeroY = pad.top + plotHeight - ((0 - min) / range) * plotHeight;
  ctx.strokeStyle = "rgba(24, 32, 29, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(width - pad.right, zeroY);
  ctx.stroke();

  const points = data.map((item, index) => {
    const x = pad.left + index * xStep;
    const y = pad.top + plotHeight - ((item.value - min) / range) * plotHeight;
    return { ...item, x, y };
  });

  const closingPositive = points.at(-1).value >= 0;
  ctx.strokeStyle = closingPositive ? "#176b5d" : "#bc4236";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawSmoothPath(ctx, points);
  ctx.stroke();

  const fill = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotHeight);
  fill.addColorStop(0, closingPositive ? "rgba(31, 191, 155, 0.2)" : "rgba(188, 66, 54, 0.18)");
  fill.addColorStop(1, "rgba(255, 255, 255, 0.02)");
  ctx.fillStyle = fill;
  ctx.lineTo(points[points.length - 1].x, pad.top + plotHeight);
  ctx.lineTo(points[0].x, pad.top + plotHeight);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = "center";
  const importantIndexes = new Set([0, points.length - 1]);
  const lowIndex = points.reduce((best, point, index) => point.value < points[best].value ? index : best, 0);
  const highIndex = points.reduce((best, point, index) => point.value > points[best].value ? index : best, 0);
  importantIndexes.add(lowIndex);
  importantIndexes.add(highIndex);
  const step = Math.max(1, Math.ceil(points.length / 10));
  points.forEach((point, index) => {
    if (!importantIndexes.has(index) && index % step !== 0) return;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = point.value < 0 ? "#bc4236" : "#176b5d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (importantIndexes.has(index)) {
      ctx.fillStyle = "#18201d";
      ctx.font = "800 12px Inter, system-ui, sans-serif";
      ctx.fillText(formatCompactNumber(point.value), point.x, Math.max(14, point.y - 12));
    }
  });
  balanceChartPoints = points;
  ctx.textAlign = "left";
}

function drawSmoothPath(ctx, points) {
  ctx.beginPath();
  if (!points.length) return;
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function renderGroupBarChart(data) {
  const canvas = els.groupCompareChart;
  const ctx = setupCanvas(canvas, 760, 320);
  const width = canvas.clientWidth || Number(canvas.getAttribute("width")) || 760;
  const height = canvas.clientHeight || Number(canvas.getAttribute("height")) || 320;
  ctx.clearRect(0, 0, width, height);
  if (!data.length) return drawEmptyChart(ctx, width, height);

  const max = Math.max(...data.map((item) => item.value), 1);
  const pad = { left: 136, right: 68, top: 20, bottom: 24 };
  const plotWidth = width - pad.left - pad.right;
  const barHeight = Math.min(28, (height - pad.top - pad.bottom) / data.length - 10);
  drawGrid(ctx, width, height, pad);
  ctx.textBaseline = "middle";
  data.forEach((item, index) => {
    const y = pad.top + index * (barHeight + 10);
    const barWidth = (plotWidth * item.value) / max;
    ctx.fillStyle = "#64706b";
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(trimLabel(item.group, 17), 8, y + barHeight / 2);
    ctx.fillStyle = "#e9efec";
    roundRect(ctx, pad.left, y, plotWidth, barHeight, 7);
    ctx.fill();
    ctx.fillStyle = index < 3 ? "#bc4236" : "#315f99";
    roundRect(ctx, pad.left, y, Math.max(barWidth, 8), barHeight, 7);
    ctx.fill();
    ctx.fillStyle = "#18201d";
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(formatCompactNumber(item.value), Math.min(pad.left + barWidth + 8, width - pad.right + 4), y + barHeight / 2);
  });
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function setupCanvas(canvas, fallbackWidth, fallbackHeight) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || Number(canvas.getAttribute("width")) || fallbackWidth;
  const height = canvas.clientHeight || Number(canvas.getAttribute("height")) || fallbackHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return ctx;
}

function drawGrid(ctx, width, height, pad) {
  ctx.strokeStyle = "#e2e8e4";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }
}

function drawLine(ctx, data, key, color, pad, xStep, max, height) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((item, index) => {
    const x = pad.left + index * xStep;
    const y = height - pad.bottom - ((height - pad.top - pad.bottom) * item[key]) / max;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  data.forEach((item, index) => {
    const x = pad.left + index * xStep;
    const y = height - pad.bottom - ((height - pad.top - pad.bottom) * item[key]) / max;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawChartLegend(ctx, items, x, y) {
  ctx.font = "12px Inter, system-ui, sans-serif";
  items.forEach(([label, color], index) => {
    const offset = index * 104;
    ctx.fillStyle = color;
    roundRect(ctx, x + offset, y, 14, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#64706b";
    ctx.fillText(label, x + offset + 20, y + 8);
  });
}

function renderExpenseRanking(groups, totalExpense) {
  els.expenseRankingList.innerHTML = groups.length
    ? groups
        .slice(0, 10)
        .map((item, index) => {
          const pct = totalExpense ? (item.value / totalExpense) * 100 : 0;
          return `
            <div class="decision-item ${index < 3 ? "attention" : ""}">
              <strong>${index + 1}. ${escapeHtml(item.group)}</strong>
              <small>${money.format(item.value)} · ${pct.toFixed(1)}% das despesas do periodo</small>
            </div>
          `;
        })
        .join("")
    : `<div class="empty">Sem despesas no periodo selecionado.</div>`;
}

function renderDecisionInsights({ groups, totals, variation, previousExpense, concentration, expenses }) {
  const insights = [];
  const top = groups[0];
  if (top && totals.expense) {
    insights.push({
      tone: "attention",
      title: `${top.group} lidera os gastos`,
      text: `${money.format(top.value)} no periodo. Se precisar cortar, comece avaliando este grupo.`,
    });
  }
  if (previousExpense && variation > 10) {
    insights.push({
      tone: "risk",
      title: "Despesas subiram no comparativo",
      text: `Alta de ${variation.toFixed(1)}% contra o periodo anterior.`,
    });
  } else if (previousExpense && variation < -10) {
    insights.push({
      tone: "",
      title: "Despesas cairam no comparativo",
      text: `Queda de ${Math.abs(variation).toFixed(1)}% contra o periodo anterior.`,
    });
  }
  if (concentration >= 60) {
    insights.push({
      tone: "attention",
      title: "Gastos concentrados",
      text: `Os 3 maiores grupos representam ${concentration.toFixed(0)}% das despesas.`,
    });
  }
  const pending = expenses.filter((item) => item.status === "pending").reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  if (pending > 0) {
    insights.push({
      tone: "risk",
      title: "Ainda ha despesas pendentes",
      text: `${money.format(pending)} em despesas do periodo ainda marcadas como pendentes.`,
    });
  }
  els.decisionInsightsList.innerHTML = insights.length
    ? insights
        .map(
          (item) => `
          <div class="decision-item ${item.tone}">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.text)}</small>
          </div>
        `,
        )
        .join("")
    : `<div class="empty">Periodo equilibrado, sem alerta relevante.</div>`;
}

function renderCategoryChart() {
  const canvas = els.categoryChart;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const data = Object.entries(categoryTotals()).sort((a, b) => b[1] - a[1]).slice(0, 16);
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 720;
  const height = canvas.clientHeight || 390;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  if (!data.length) {
    drawEmptyChart(ctx, width, height);
    return;
  }

  const max = Math.max(...data.map(([, value]) => value));
  const left = 150;
  const right = 74;
  const top = 12;
  const gap = 8;
  const barHeight = Math.min(18, (height - top * 2 - gap * (data.length - 1)) / data.length);
  ctx.font = "700 11px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  data.forEach(([category, value], index) => {
    const y = top + index * (barHeight + gap);
    const barWidth = ((width - left - right) * value) / max;
    ctx.fillStyle = "#64706b";
    ctx.textAlign = "right";
    ctx.fillText(trimLabel(category, 24), left - 10, y + barHeight / 2);
    ctx.fillStyle = "#e7efe8";
    roundRect(ctx, left, y, width - left - right, barHeight, 4);
    ctx.fill();
    ctx.fillStyle = index < 3 ? "#83c51f" : "#9bd443";
    roundRect(ctx, left, y, Math.max(barWidth, 8), barHeight, 4);
    ctx.fill();
    ctx.fillStyle = "#18201d";
    ctx.font = "800 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(formatCompactNumber(value), Math.min(left + barWidth + 8, width - right + 8), y + barHeight / 2);
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
  });
  ctx.textAlign = "left";
}

function handleBalanceTooltip(event) {
  if (!els.balanceTooltip || !els.balanceClosingChart || !balanceChartPoints.length) return;
  const rect = els.balanceClosingChart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const nearest = balanceChartPoints.reduce(
    (best, point) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      return distance < best.distance ? { point, distance } : best;
    },
    { point: null, distance: Infinity },
  );
  if (!nearest.point || nearest.distance > 34) {
    els.balanceTooltip.classList.remove("visible");
    return;
  }
  els.balanceTooltip.innerHTML = `<strong>Saldo bancario · ${formatMonth(nearest.point.month)}</strong><span>${money.format(nearest.point.value)}</span>`;
  els.balanceTooltip.style.left = `${nearest.point.x}px`;
  els.balanceTooltip.style.top = `${nearest.point.y}px`;
  els.balanceTooltip.classList.add("visible");
}

function hideBalanceTooltip() {
  els.balanceTooltip?.classList.remove("visible");
}

function handleCashflowTooltip(event) {
  if (!els.cashflowTooltip || !els.cashflowChart || !cashflowChartPoints.length) return;
  const rect = els.cashflowChart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const nearest = cashflowChartPoints.reduce(
    (best, point) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      return distance < best.distance ? { point, distance } : best;
    },
    { point: null, distance: Infinity },
  );
  if (!nearest.point || nearest.distance > 34) {
    els.cashflowTooltip.classList.remove("visible");
    return;
  }
  els.cashflowTooltip.innerHTML = `<strong>${formatDate(nearest.point.date)}</strong><span>${money.format(nearest.point.value)}</span><small>Saldo previsto</small>`;
  els.cashflowTooltip.style.left = `${nearest.point.x}px`;
  els.cashflowTooltip.style.top = `${nearest.point.y}px`;
  els.cashflowTooltip.classList.add("visible");
}

function hideCashflowTooltip() {
  els.cashflowTooltip?.classList.remove("visible");
}

function formatCompactMoney(value) {
  const abs = Math.abs(Number(value) || 0);
  const prefix = value < 0 ? "-R$ " : "R$ ";
  if (abs >= 1000000) return `${prefix}${(abs / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} M`;
  if (abs >= 1000) return `${prefix}${(abs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} K`;
  return money.format(value);
}

function drawEmptyChart(ctx, width, height) {
  ctx.fillStyle = "#eef4f2";
  roundRect(ctx, 0, 0, width, height, 8);
  ctx.fill();
  ctx.fillStyle = "#64706b";
  ctx.font = "15px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Nenhuma despesa no periodo selecionado", width / 2, height / 2);
  ctx.textAlign = "left";
}

function trimLabel(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function renderMonthProgress() {
  const expenses = selectedTransactions().filter((item) => item.type === "expense" && !isVerocardTransaction(item));
  const paid = expenses.filter((item) => item.status === "paid");
  const pending = expenses.filter((item) => item.status === "pending").sort((a, b) => a.date.localeCompare(b.date));
  const paidValue = paid.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const pendingValue = pending.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const total = paidValue + pendingValue;
  const progress = total ? Math.min((paidValue / total) * 100, 100) : 0;
  const summary = financialSummaryForPeriod();
  const comparisonBase = Math.max(summary.availableIncome, 0) + Math.max(summary.expense, 0);
  const incomeShare = comparisonBase ? (Math.max(summary.availableIncome, 0) / comparisonBase) * 100 : 0;
  const expenseShare = comparisonBase ? (Math.max(summary.expense, 0) / comparisonBase) * 100 : 0;
  const next = pending[0];
  els.monthProgressFill.style.width = `${progress}%`;
  const circumference = 2 * Math.PI * 48;
  const incomeLength = circumference * (incomeShare / 100);
  const expenseLength = circumference * (expenseShare / 100);
  els.incomeExpenseRingIncome.style.strokeDasharray = `${incomeLength} ${circumference - incomeLength}`;
  els.incomeExpenseRingIncome.style.strokeDashoffset = "0";
  els.incomeExpenseRingExpense.style.strokeDasharray = `${expenseLength} ${circumference - expenseLength}`;
  els.incomeExpenseRingExpense.style.strokeDashoffset = `${-incomeLength}`;
  els.incomeExpenseRatioMetric.textContent = `${incomeShare.toFixed(0)}%`;
  els.ringIncomeLabel.textContent = `${incomeShare.toFixed(0)}%`;
  els.ringExpenseLabel.textContent = `${expenseShare.toFixed(0)}%`;
  els.monthProgressMessage.textContent = progress >= 100
    ? "✅ Todas as obrigações monetárias do período estão quitadas."
    : progress >= 70
      ? "Bom andamento. Restam poucas obrigações para concluir o período."
      : "Acompanhe as próximas contas e priorize os vencimentos mais próximos.";
  els.monthPaidCount.textContent = String(paid.length);
  els.monthPaidValue.textContent = money.format(paidValue);
  els.monthPendingCount.textContent = String(pending.length);
  els.monthPendingValue.textContent = money.format(pendingValue);
  els.monthNextDue.textContent = next ? formatDate(next.date) : "—";
  els.monthNextDueDescription.textContent = next ? `${next.description} · ${money.format(next.expenseAmount || next.amount || 0)}` : "Nenhuma conta pendente";
}

function sortTransactions(items, sortMode) {
  const expenseValue = (item) => (item.type === "expense" ? Number(item.expenseAmount || item.amount || 0) : 0);
  const dateCompare = (a, b) => b.date.localeCompare(a.date) || b.description.localeCompare(a.description, "pt-BR");
  return items.sort((a, b) => {
    if (sortMode === "expense_desc") return expenseValue(b) - expenseValue(a) || dateCompare(a, b);
    if (sortMode === "expense_asc") return expenseValue(a) - expenseValue(b) || dateCompare(a, b);
    if (sortMode === "date_asc") return a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR");
    return dateCompare(a, b);
  });
}

function renderPeriodControls() {
  const years = availableYears();
  if (!years.includes(selectedPeriod.year)) selectedPeriod.year = years[0] || String(today.getFullYear());
  els.yearFilter.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  els.periodMode.value = selectedPeriod.mode;
  els.monthFilter.value = selectedPeriod.month;
  els.yearFilter.value = selectedPeriod.year;
  els.startDateFilter.value = selectedPeriod.start;
  els.endDateFilter.value = selectedPeriod.end;
  els.periodFields.forEach((field) => {
    field.classList.toggle("hidden", field.dataset.periodField !== selectedPeriod.mode);
  });
}

function fillColumnFilterOptions(key, values) {
  const select = document.querySelector(`[data-column-filter="${key}"]`);
  if (!select || select.tagName !== "SELECT") return;
  const current = transactionColumnFilters[key] || "";
  const firstLabel = key === "type" ? "Todos" : key === "situation" ? "Todas" : key === "expenseClass" ? "Todas" : "Todos";
  const fixedTypeOptions = key === "type"
    ? '<option value="">Todos</option><option value="income">Receita</option><option value="expense">Despesa</option>'
    : "";
  select.innerHTML = fixedTypeOptions || `<option value="">${firstLabel}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  select.value = current;
}

function renderColumnFilterOptions() {
  const valuesFor = (key, fallback = "") => [...new Set(state.transactions.map((item) => String(item[key] || fallback).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  fillColumnFilterOptions("type", []);
  fillColumnFilterOptions("expenseClass", valuesFor("expenseClass"));
  fillColumnFilterOptions("group", valuesFor("group"));
  fillColumnFilterOptions("paymentMethod", valuesFor("paymentMethod"));
  fillColumnFilterOptions("situation", valuesFor("situation"));
  fillColumnFilterOptions("modality", sortedModalities());
}

function matchesColumnFilters(item) {
  const textMatches = (key, value) => !transactionColumnFilters[key] || normalizeText(value).includes(normalizeText(transactionColumnFilters[key]));
  const exactMatches = (key, value) => !transactionColumnFilters[key] || normalizeText(value) === normalizeText(transactionColumnFilters[key]);
  if (transactionColumnFilters.date && item.date !== transactionColumnFilters.date) return false;
  if (transactionColumnFilters.type && item.type !== transactionColumnFilters.type) return false;
  if (!textMatches("description", item.description)) return false;
  if (!textMatches("notes", item.notes)) return false;
  if (!exactMatches("expenseClass", item.expenseClass)) return false;
  if (!exactMatches("group", item.group || item.category)) return false;
  if (!exactMatches("paymentMethod", item.paymentMethod || item.account)) return false;
  if (!exactMatches("situation", item.situation)) return false;
  if (!exactMatches("modality", item.modality || PAYMENT_MODALITIES[item.paymentMethod || item.account])) return false;
  if (transactionColumnFilters.income && Number(item.incomeAmount || 0) < Number(transactionColumnFilters.income)) return false;
  if (transactionColumnFilters.expense && Number(item.expenseAmount || 0) < Number(transactionColumnFilters.expense)) return false;
  return true;
}

function renderTransactions() {
  renderColumnFilterOptions();
  const query = els.searchInput.value.trim().toLowerCase();
  const type = els.typeFilter.value;
  const rows = selectedTransactions()
    .filter((item) => (type === "all" ? true : item.type === type))
    .filter((item) => `${item.description} ${item.category} ${item.account}`.toLowerCase().includes(query))
    .filter(matchesColumnFilters);
  sortTransactions(rows, els.transactionSortFilter?.value || "date_desc");

  els.transactionRows.innerHTML = rows.length
    ? rows
        .map(
          (item) => `
        <tr>
          <td>${formatDate(item.date)}</td>
          <td>${escapeHtml(item.weekday || weekdayShort(item.date))}</td>
          <td><span class="pill ${item.type === "expense" ? "expense" : ""}">${escapeHtml(item.launchType || (item.type === "expense" ? "DESPESA" : "RECEITA"))}</span></td>
          <td>
            <strong>${escapeHtml(item.description)}</strong>
            ${item.status === "pending" ? "<br><small>Pendente</small>" : ""}
          </td>
          <td class="amount-col amount positive">${item.incomeAmount ? money.format(item.incomeAmount) : ""}</td>
          <td>${escapeHtml(item.expenseClass || "")}</td>
          <td>${escapeHtml(item.group || item.category || "")}</td>
          <td class="amount-col amount negative">${item.expenseAmount ? money.format(item.expenseAmount) : ""}</td>
          <td>${escapeHtml(item.paymentMethod || item.account || "")}</td>
          <td>${escapeHtml(item.situation || (item.status === "paid" ? "PAGO" : "PENDENTE"))}</td>
          <td>${escapeHtml(item.modality || "")}</td>
          <td>${escapeHtml(item.notes || "")}</td>
          <td class="actions-col">
            <span class="row-actions">
              <button class="icon-button" type="button" data-edit="${item.id}" aria-label="Editar">
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 17.2 9.8-9.8 2.8 2.8L6.8 20H4v-2.8ZM18.8 8 16 5.2l1.4-1.4a2 2 0 0 1 2.8 2.8L18.8 8Z"/></svg>
              </button>
            </span>
          </td>
        </tr>
      `,
        )
        .join("")
    : `<tr><td colspan="13" class="empty">Nenhum lancamento encontrado.</td></tr>`;
}

function budgetPlanningData() {
  const monetary = state.transactions.filter((item) => !isVerocardTransaction(item));
  const months = [...new Set(monetary.map((item) => monthOf(item.date)).filter(Boolean))].sort();
  const monthCount = Math.max(months.length, 1);
  const incomes = monetary.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.incomeAmount || item.amount || 0), 0);
  const expenses = monetary.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const averageIncome = incomes / monthCount;
  const averageExpense = expenses / monthCount;
  const categoryTotalsMap = new Map();
  monetary.filter((item) => item.type === "expense").forEach((item) => {
    const category = item.group || item.category || "Sem categoria";
    categoryTotalsMap.set(category, (categoryTotalsMap.get(category) || 0) + Number(item.expenseAmount || item.amount || 0));
  });
  const categories = sortedCategories();
  const averages = new Map(categories.map((category) => [category, (categoryTotalsMap.get(category) || 0) / monthCount]));
  const essentialAverage = categories.filter((category) => ESSENTIAL_GROUPS.has(normalizeText(category))).reduce((sum, category) => sum + averages.get(category), 0);
  const flexibleAverage = categories.filter((category) => !ESSENTIAL_GROUPS.has(normalizeText(category))).reduce((sum, category) => sum + averages.get(category), 0);
  const essentialLimit = averageIncome * 0.5;
  const flexibleLimit = averageIncome * 0.3;
  const savingsGoal = averageIncome * 0.2;
  const emergencyGoal = essentialAverage * 6;
  const savingsRate = averageIncome ? (averageIncome - averageExpense) / averageIncome : 0;
  const savingsScore = Math.max(0, Math.min(40, (savingsRate / 0.2) * 40));
  const essentialRatio = averageIncome ? essentialAverage / averageIncome : 1;
  const essentialScore = essentialRatio <= 0.5 ? 30 : Math.max(0, 30 - (essentialRatio - 0.5) * 100);
  const balanceScore = averageIncome ? Math.max(0, Math.min(30, ((averageIncome - averageExpense) / averageIncome + 0.1) * 150)) : 0;
  const score = Math.round(Math.max(0, Math.min(100, savingsScore + essentialScore + balanceScore)));
  const suggestions = new Map(categories.map((category) => {
    const average = averages.get(category) || 0;
    const essential = ESSENTIAL_GROUPS.has(normalizeText(category));
    const poolAverage = essential ? essentialAverage : flexibleAverage;
    const poolLimit = essential ? essentialLimit : flexibleLimit;
    const proportionalLimit = poolAverage ? poolLimit * (average / poolAverage) : 0;
    const reductionTarget = average * (essential ? 0.95 : 0.85);
    const suggested = average ? Math.max(10, Math.round(Math.min(reductionTarget, proportionalLimit || reductionTarget) / 10) * 10) : 0;
    return [category, suggested];
  }));
  return { months, monthCount, averageIncome, averageExpense, essentialAverage, essentialLimit, flexibleLimit, savingsGoal, emergencyGoal, savingsRate, score, averages, suggestions };
}

function renderBudgets() {
  const plan = budgetPlanningData();
  suggestedBudgetsByCategory = plan.suggestions;
  const selectedExpenses = selectedTransactions().filter((item) => item.type === "expense" && !isVerocardTransaction(item));
  const spent = new Map();
  selectedExpenses.forEach((item) => {
    const category = item.group || item.category || "Sem categoria";
    spent.set(category, (spent.get(category) || 0) + Number(item.expenseAmount || item.amount || 0));
  });
  const healthTone = plan.score >= 80 ? "Saudável" : plan.score >= 60 ? "Em atenção" : "Precisa de reequilíbrio";
  els.budgetHistoryLabel.textContent = plan.months.length ? `Metas calculadas com ${plan.monthCount} mês(es) de histórico, de ${formatMonthCode(plan.months[0])} a ${formatMonthCode(plan.months.at(-1))}.` : "Importe seus lançamentos para gerar metas personalizadas.";
  els.budgetHealthScore.textContent = String(plan.score);
  els.budgetHealthTitle.textContent = healthTone;
  els.budgetHealthMessage.textContent = plan.savingsRate >= 0.2
    ? `Sua capacidade histórica de poupança é ${(plan.savingsRate * 100).toFixed(0)}%. Continue protegendo esse resultado.`
    : `A meta é reservar 20% da renda média. Hoje sua capacidade histórica está em ${(plan.savingsRate * 100).toFixed(0)}%.`;
  els.savingsGoalMetric.textContent = money.format(plan.savingsGoal);
  els.emergencyGoalMetric.textContent = money.format(plan.emergencyGoal);
  els.essentialGoalMetric.textContent = money.format(plan.essentialLimit);
  els.flexibleGoalMetric.textContent = money.format(plan.flexibleLimit);
  const activeSuggestions = [...plan.suggestions.values()].filter((value) => value > 0).length;
  els.budgetSuggestionSummary.textContent = `${activeSuggestions} meta(s) sugerida(s)`;
  els.budgetEditorGrid.innerHTML = sortedCategories().map((category) => {
    const average = plan.averages.get(category) || 0;
    const suggested = plan.suggestions.get(category) || 0;
    const custom = Number(state.budgets[category] || 0);
    const target = custom || suggested;
    const current = spent.get(category) || 0;
    const pct = target ? (current / target) * 100 : 0;
    const tone = pct > 100 ? "over" : pct >= 80 ? "attention" : "healthy";
    const status = pct > 100 ? "Limite excedido" : pct >= 80 ? "Próximo do limite" : target ? "Dentro da meta" : "Sem histórico";
    return `<article class="budget-card smart-budget-card ${tone}">
      <div class="smart-budget-header"><div><span class="budget-type">${ESSENTIAL_GROUPS.has(normalizeText(category)) ? "ESSENCIAL" : "FLEXÍVEL"}</span><h3>${escapeHtml(category)}</h3></div><span class="budget-status">${status}</span></div>
      <div class="budget-comparison"><div><span>Média histórica</span><strong>${money.format(average)}</strong></div><div><span>Gasto no período</span><strong>${money.format(current)}</strong></div></div>
      <div class="budget-progress"><span style="width:${Math.min(pct, 100)}%"></span></div>
      <small>${target ? `${pct.toFixed(0)}% da meta utilizada` : "Aguardando dados para sugerir uma meta"}</small>
      <div class="budget-target-editor"><label>Meta mensal<input type="number" min="0" step="10" value="${target.toFixed(0)}" data-budget="${escapeHtml(category)}" aria-label="Meta de ${escapeHtml(category)}" /></label><button class="button" type="button" data-save-budget="${escapeHtml(category)}">Salvar meta</button></div>
      ${!custom && suggested ? `<div class="suggested-budget">✨ Sugestão MEG baseada no histórico: ${money.format(suggested)}</div>` : ""}
    </article>`;
  }).join("");
}

function expensesForPendingMonth(monthValue = selectedPendingMonth) {
  return state.transactions
    .filter((item) => monthOf(item.date) === monthValue)
    .filter((item) => item.type === "expense")
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR"));
}

function verocardItems(monthValue = selectedPendingMonth) {
  return state.transactions
    .filter((item) => monthOf(item.date) === monthValue)
    .filter(isVerocardTransaction)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "income" ? -1 : 1));
}

function verocardSummary(monthValue = selectedPendingMonth) {
  const items = verocardItems(monthValue);
  const credit = items.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const spent = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return { items, credit, spent, balance: credit - spent };
}

function renderPending() {
  if (els.pendingMonthFilter.value !== selectedPendingMonth) els.pendingMonthFilter.value = selectedPendingMonth;
  const expenses = expensesForPendingMonth(selectedPendingMonth);
  const selectedStatus = els.pendingStatusFilter.value || "pending";
  const statusItems = expenses.filter((item) => selectedStatus === "all" || item.status === selectedStatus);
  const paymentOptions = [...new Set(statusItems.map((item) => item.paymentMethod || item.account).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (!paymentOptions.includes(els.pendingPaymentFilter.value)) els.pendingPaymentFilter.value = "all";
  els.pendingPaymentFilter.innerHTML =
    `<option value="all">Todas as formas</option>` +
    paymentOptions.map((item) => `<option value="${escapeHtml(item)}" ${els.pendingPaymentFilter.value === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");
  const selectedPayment = els.pendingPaymentFilter.value || "all";
  const visibleItems = statusItems.filter((item) => selectedPayment === "all" || (item.paymentMethod || item.account) === selectedPayment);
  const pendingVisible = visibleItems.filter((item) => item.status === "pending");
  const paidVisible = visibleItems.filter((item) => item.status === "paid");
  const pendingTotal = pendingVisible.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidTotal = paidVisible.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const card = verocardSummary(selectedPendingMonth);
  const allPending = expenses.filter((item) => item.status === "pending" && !isVerocardTransaction(item));
  const allPaid = expenses.filter((item) => item.status === "paid" && !isVerocardTransaction(item));
  const allPendingTotal = allPending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const allPaidTotal = allPaid.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const available = Math.max(availableBankBalanceForPayment(), 0);
  const coverage = allPendingTotal ? Math.min((available / allPendingTotal) * 100, 999) : 100;
  const paidProgress = allPaidTotal + allPendingTotal ? (allPaidTotal / (allPaidTotal + allPendingTotal)) * 100 : 100;
  const sevenDaysAhead = addDays(todayIso, 7);
  const overdue = allPending.filter((item) => item.date < todayIso);
  const dueToday = allPending.filter((item) => item.date === todayIso);
  const nextSeven = allPending.filter((item) => item.date > todayIso && item.date <= sevenDaysAhead);

  els.pendingMonthLabel.textContent = `${formatMonth(selectedPendingMonth)} - filtro da aba Pendentes`;
  els.pendingTotalMetric.textContent = money.format(pendingTotal);
  els.pendingCountMetric.textContent = `${pendingVisible.length} contas pendentes no filtro`;
  els.paidMonthMetric.textContent = money.format(paidTotal);
  els.verocardCreditMetric.textContent = money.format(card.credit);
  els.verocardBalanceMetric.textContent = money.format(card.balance);
  els.verocardSpentMetric.textContent = `${money.format(card.spent)} gastos abatidos`;

  const pendingTone = overdue.length || coverage < 100 ? "risk" : allPending.length ? "attention" : "healthy";
  els.pendingCommandCenter.classList.remove("risk", "attention", "healthy");
  els.pendingCommandCenter.classList.add(pendingTone);
  els.pendingCoverageMetric.textContent = allPendingTotal ? `${coverage.toFixed(0)}%` : "100%";
  els.pendingCoverageTrend.textContent = allPendingTotal
    ? `${money.format(available)} disponíveis para ${money.format(allPendingTotal)} em aberto`
    : "Nenhuma obrigação monetária em aberto";
  els.pendingProgressBar.style.width = `${Math.min(Math.max(paidProgress, 0), 100)}%`;
  els.overduePendingMetric.textContent = `${overdue.length} · ${money.format(overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`;
  els.todayPendingMetric.textContent = `${dueToday.length} · ${money.format(dueToday.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`;
  els.nextSevenPendingMetric.textContent = `${nextSeven.length} · ${money.format(nextSeven.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`;
  if (overdue.length) {
    els.pendingHealthTitle.textContent = `${overdue.length} conta(s) vencida(s) exigem ação`;
    els.pendingHealthMessage.textContent = `Regularize primeiro ${overdue[0].description}, vencida em ${formatDate(overdue[0].date)}. ${coverage < 100 ? "O saldo disponível ainda não cobre todas as obrigações." : "Há saldo para cobrir as contas em aberto."}`;
  } else if (coverage < 100) {
    els.pendingHealthTitle.textContent = `Faltam ${money.format(Math.max(allPendingTotal - available, 0))} para cobrir o mês`;
    els.pendingHealthMessage.textContent = "Não há contas vencidas, mas o caixa disponível não cobre todas as pendências monetárias.";
  } else if (allPending.length) {
    els.pendingHealthTitle.textContent = "Contas em dia e com cobertura financeira";
    els.pendingHealthMessage.textContent = `${allPending.length} obrigação(ões) ainda aguardam pagamento, todas cobertas pelo saldo disponível.`;
  } else {
    els.pendingHealthTitle.textContent = "Mês concluído sem pendências";
    els.pendingHealthMessage.textContent = "Todas as obrigações monetárias deste mês estão marcadas como pagas.";
  }

  els.pendingBillsList.innerHTML = visibleItems.length
    ? visibleItems
        .sort((a, b) => (a.status === b.status ? a.date.localeCompare(b.date) : a.status === "pending" ? -1 : 1))
        .map(
          (item) => {
            const priority = item.status === "paid" ? "paid" : item.date < todayIso ? "overdue" : item.date === todayIso ? "today" : item.date <= sevenDaysAhead ? "soon" : "future";
            const priorityLabel = { paid: "PAGA", overdue: "VENCIDA", today: "VENCE HOJE", soon: "PRÓXIMOS 7 DIAS", future: "PROGRAMADA" }[priority];
            return `
          <article class="bill-item ${item.status === "paid" ? "done" : ""} priority-${priority}">
            <input type="checkbox" data-toggle-paid="${item.id}" ${item.status === "paid" ? "checked" : ""} />
            <button type="button" class="bill-meta bill-edit-button" data-edit="${escapeHtml(item.id)}">
              <strong>${escapeHtml(item.description)}</strong>
              <small>${formatDate(item.date)} · ${escapeHtml(item.paymentMethod || item.account || "Não informado")} · ${escapeHtml(item.group || item.category || "Sem categoria")}</small>
            </button>
            <span class="bill-priority">${priorityLabel}</span>
            <strong class="amount negative">${money.format(item.amount)}</strong>
          </article>
        `; },
        )
        .join("")
    : `<div class="empty">Nenhuma conta para este filtro no mes atual.</div>`;

  renderVerocardLedger(card);
}

function renderVerocardLedger(card = verocardSummary()) {
  let running = 0;
  els.verocardLedger.innerHTML = card.items.length
    ? card.items
        .map((item) => {
          const value = Number(item.amount || 0);
          running += item.type === "income" ? value : -value;
          return `
            <div class="ledger-item">
              <span class="ledger-meta">
                <strong>${escapeHtml(item.description)}</strong>
                <small>${formatDate(item.date)} · ${item.type === "income" ? "Credito" : "Gasto"} · ${escapeHtml(item.account)}</small>
              </span>
              <strong class="ledger-running ${running < 0 ? "amount negative" : "amount positive"}">
                ${money.format(running)}
                <small>${item.type === "income" ? "+" : "-"}${money.format(value)}</small>
              </strong>
            </div>
          `;
        })
        .join("")
    : `<div class="empty">Sem movimentos VEROCARD no mes atual.</div>`;
}

function renderSettings() {
  els.categoryTags.innerHTML = sortedCategories().map((category) => `<span>${escapeHtml(category)}</span>`).join("");
  const dates = state.transactions.map((item) => item.date).filter(Boolean).sort();
  els.realDataSummary.textContent = state.transactions.length
    ? `${state.transactions.length} lançamentos sincronizados na nuvem, de ${formatDate(dates[0])} a ${formatDate(dates[dates.length - 1])}. Uma cópia local mantém o sistema rápido.`
    : "Nenhum lançamento salvo. Importe sua base MEG para iniciar.";
}

function renderDatalists() {
  const currentGroup = els.groupInput.value;
  const groups = sortedCategories();
  els.groupInput.innerHTML = groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("");
  if (groups.includes(currentGroup)) els.groupInput.value = currentGroup;
  const currentExpenseClass = els.expenseClassInput.value;
  const expenseClasses = sortedExpenseClasses();
  els.expenseClassInput.innerHTML = expenseClasses.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  if (expenseClasses.includes(currentExpenseClass)) els.expenseClassInput.value = currentExpenseClass;
  const currentPayment = els.paymentMethodInput.value;
  const currentModality = els.modalityInput.value;
  const modalities = sortedModalities();
  els.modalityInput.innerHTML = modalities.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  if (modalities.includes(currentModality)) els.modalityInput.value = currentModality;
  refreshPaymentMethodOptions(currentPayment);
  els.catalogModalityOptions.innerHTML = modalities.map((item) => `<option value="${escapeHtml(item)}"></option>`).join("");
  const descriptions = [...new Set(state.transactions.map((item) => String(item.description || "").replace(/\s+\d+\/\d+$/u, "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  els.descriptionOptions.innerHTML = descriptions.map((item) => `<option value="${escapeHtml(item)}"></option>`).join("");
}

function renderCatalogs() {
  const groups = state.catalogs?.groups || [];
  const expenseClasses = state.catalogs?.expenseClasses || [];
  const payments = state.catalogs?.paymentMethods || [];
  const defaultGroupKeys = new Set(DEFAULT_GROUPS.map(normalizeText));
  const defaultExpenseClassKeys = new Set(DEFAULT_CATALOGS.expenseClasses.map(normalizeText));
  const defaultPaymentKeys = new Set(DEFAULT_CATALOGS.paymentMethods.map((item) => normalizeText(item.description)));
  els.groupCatalogCount.textContent = `${groups.length} cadastrados`;
  els.paymentCatalogCount.textContent = `${payments.length} cadastradas`;
  els.expenseClassCatalogCount.textContent = `${expenseClasses.length} cadastradas`;
  els.groupCatalogList.innerHTML = groups.map((group) => `<div class="catalog-row"><strong>${escapeHtml(group)}</strong>${defaultGroupKeys.has(normalizeText(group)) ? `<span class="catalog-badge">PADRÃO</span>` : `<button type="button" class="catalog-remove" data-remove-group="${escapeHtml(group)}">Remover</button>`}</div>`).join("");
  els.expenseClassCatalogList.innerHTML = expenseClasses.map((item) => `<div class="catalog-row"><strong>${escapeHtml(item)}</strong>${defaultExpenseClassKeys.has(normalizeText(item)) ? `<span class="catalog-badge">PADRÃO</span>` : `<button type="button" class="catalog-remove" data-remove-expense-class="${escapeHtml(item)}">Remover</button>`}</div>`).join("");
  els.paymentCatalogList.innerHTML = payments.map((item) => `<div class="catalog-row"><span><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.modality)}</small></span>${defaultPaymentKeys.has(normalizeText(item.description)) ? `<span class="catalog-badge">PADRÃO</span>` : `<button type="button" class="catalog-remove" data-remove-payment="${escapeHtml(item.description)}">Remover</button>`}</div>`).join("");
}

function addGroupCatalog(event) {
  event.preventDefault();
  const value = els.newGroupInput.value.trim().toUpperCase();
  if (!value || state.catalogs.groups.some((item) => normalizeText(item) === normalizeText(value))) return;
  state.catalogs.groups.push(value);
  els.newGroupInput.value = "";
  saveState();
  render();
}

function addPaymentCatalog(event) {
  event.preventDefault();
  const description = els.newPaymentInput.value.trim().toUpperCase();
  const modality = els.newPaymentModalityInput.value.trim().toUpperCase();
  if (!description || !modality || state.catalogs.paymentMethods.some((item) => normalizeText(item.description) === normalizeText(description))) return;
  state.catalogs.paymentMethods.push({ description, modality });
  els.newPaymentInput.value = "";
  els.newPaymentModalityInput.value = "";
  saveState();
  render();
}

function addExpenseClassCatalog(event) {
  event.preventDefault();
  const value = els.newExpenseClassInput.value.trim().toUpperCase();
  if (!value || state.catalogs.expenseClasses.some((item) => normalizeText(item) === normalizeText(value))) return;
  state.catalogs.expenseClasses.push(value);
  els.newExpenseClassInput.value = "";
  saveState();
  render();
}

function removeCatalogItem(type, value) {
  if (type === "group") state.catalogs.groups = state.catalogs.groups.filter((item) => normalizeText(item) !== normalizeText(value));
  if (type === "expenseClass") state.catalogs.expenseClasses = state.catalogs.expenseClasses.filter((item) => normalizeText(item) !== normalizeText(value));
  if (type === "payment") state.catalogs.paymentMethods = state.catalogs.paymentMethods.filter((item) => normalizeText(item.description) !== normalizeText(value));
  saveState();
  render();
}

function setView(view) {
  selectedView = view;
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  els.views.forEach((item) => item.classList.toggle("active", item.id === view));
  if (view === "cashflow") requestAnimationFrame(renderCashflow);
  if (view === "analytics") requestAnimationFrame(renderAnalytics);
  if (view === "dashboard") requestAnimationFrame(renderCategoryChart);
}

function syncAmountFields() {
  const isIncome = els.transactionType.value === "income";
  els.incomeAmountInput.disabled = !isIncome;
  els.expenseAmountInput.disabled = isIncome;
  els.expenseClassInput.disabled = isIncome;
  els.groupInput.disabled = isIncome;
  if (isIncome) {
    els.expenseAmountInput.value = "";
    els.expenseClassInput.value = "";
    els.groupInput.value = "";
  } else {
    els.incomeAmountInput.value = "";
  }
  syncInstallmentFields();
}

function isInstallmentModality() {
  const modality = normalizeText(els.modalityInput.value);
  return modality === "CREDITO" || modality === "CREDIARIO";
}

function syncInstallmentFields() {
  const show = !els.transactionId.value && els.transactionType.value === "expense" && isInstallmentModality();
  els.installmentFields.classList.toggle("hidden", !show);
  els.expenseAmountInput.disabled = show || els.transactionType.value === "income";
  if (!show) return;
  const total = Number(els.purchaseTotalInput.value || 0);
  const count = Math.max(Number.parseInt(els.installmentCountInput.value || "1", 10), 1);
  const installment = total / count;
  els.expenseAmountInput.value = total ? installment.toFixed(2) : "";
  els.installmentPreview.textContent = total
    ? `${count} parcela(s) de aproximadamente ${money.format(installment)}. Vencimentos em fim de semana passam para segunda-feira.`
    : "Informe o valor total e a quantidade de parcelas.";
}

function createInstallmentTransactions(payload) {
  const count = Math.max(Number.parseInt(els.installmentCountInput.value || "1", 10), 1);
  const total = Number(els.purchaseTotalInput.value || 0);
  const amounts = splitInstallmentAmounts(total, count);
  const seriesId = crypto.randomUUID();
  return Array.from({ length: count }, (_, index) => {
    const date = installmentDueDate(payload.date, index);
    const amount = amounts[index];
    return {
      ...payload,
      id: crypto.randomUUID(),
      date,
      weekday: weekdayShort(date),
      description: `${payload.description} ${index + 1}/${count}`,
      expenseAmount: amount,
      amount,
      status: "pending",
      situation: "PENDENTE",
      installmentSeriesId: seriesId,
      installmentNumber: index + 1,
      installmentCount: count,
      purchaseTotal: total,
    };
  });
}

function syncPaymentModality() {
  const method = els.paymentMethodInput.value.trim();
  const modality = modalityForPayment(method);
  if (modality) els.modalityInput.value = modality;
  syncInstallmentFields();
}

function syncModalityPaymentOptions() {
  refreshPaymentMethodOptions();
  syncInstallmentFields();
}

function openTransactionDialog(item = null) {
  const defaultDate = selectedPeriod.mode === "month" ? `${selectedPeriod.month}-${String(today.getDate()).padStart(2, "0")}` : new Date().toISOString().slice(0, 10);
  els.dialogTitle.textContent = item ? "Editar lancamento" : "Novo lancamento";
  els.transactionId.value = item?.id || "";
  els.dateInput.value = item?.date || defaultDate;
  els.weekdayInput.value = item?.weekday || weekdayShort(els.dateInput.value);
  els.transactionType.value = item?.type || "expense";
  els.descriptionInput.value = item?.description || "";
  els.incomeAmountInput.value = item?.incomeAmount || "";
  els.expenseAmountInput.value = item?.expenseAmount || "";
  els.expenseClassInput.value = item?.expenseClass || "";
  els.groupInput.value = item?.group || (item?.type === "expense" ? item?.category || "" : "");
  const desiredPayment = item?.paymentMethod || item?.account || "PIX";
  els.statusInput.value = item?.status || "paid";
  els.modalityInput.value = item?.modality || modalityForPayment(desiredPayment) || sortedModalities()[0] || "";
  refreshPaymentMethodOptions(desiredPayment);
  els.notesInput.value = item?.notes || "";
  els.purchaseTotalInput.value = "";
  els.installmentCountInput.value = "1";
  els.deleteTransactionBtn.style.visibility = item ? "visible" : "hidden";
  syncAmountFields();
  syncInstallmentFields();
  els.dialog.showModal();
  els.descriptionInput.focus();
}

function saveTransaction(event) {
  event.preventDefault();
  const id = els.transactionId.value || crypto.randomUUID();
  const type = els.transactionType.value;
  const incomeAmount = type === "income" ? Number(els.incomeAmountInput.value || 0) : 0;
  const expenseAmount = type === "expense" ? Number(els.expenseAmountInput.value || 0) : 0;
  const paymentMethod = els.paymentMethodInput.value.trim();
  const group = els.groupInput.value.trim();
  const situation = els.statusInput.value === "paid" ? "PAGO" : "PENDENTE";
  const payload = {
    id,
    date: els.dateInput.value,
    weekday: weekdayShort(els.dateInput.value),
    description: els.descriptionInput.value.trim(),
    type,
    launchType: type === "income" ? "RECEITA" : "DESPESA",
    incomeAmount,
    expenseAmount,
    amount: type === "income" ? incomeAmount : expenseAmount,
    expenseClass: els.expenseClassInput.value.trim(),
    group,
    category: type === "income" ? "Receitas" : group || "Sem categoria",
    paymentMethod,
    account: paymentMethod,
    status: els.statusInput.value,
    situation,
    modality: els.modalityInput.value.trim(),
    notes: els.notesInput.value.trim(),
  };

  const index = state.transactions.findIndex((item) => item.id === id);
  const previous = index >= 0 ? state.transactions[index] : null;
  if (!previous && payload.type === "expense" && isInstallmentModality()) {
    try {
      const installments = createInstallmentTransactions(payload);
      state.transactions.push(...installments);
      if (!state.budgets[payload.category]) state.budgets[payload.category] = 0;
      selectedPeriod.mode = "month";
      selectedPeriod.month = monthOf(installments[0].date);
      saveState();
      els.dialog.close();
      showToast("Parcelamento criado", `${installments.length} parcela(s) geradas até ${formatDate(installments.at(-1).date)}`, "success");
      render();
      return;
    } catch (error) {
      showToast("Revise o parcelamento", error.message, "danger");
      return;
    }
  }
  const isChangingToPaidExpense = payload.type === "expense" && payload.status === "paid" && previous?.status !== "paid";
  if (isChangingToPaidExpense) {
    const paymentCheck = canPayWithBankBalance(payload, { excludeId: id });
    if (!paymentCheck.ok) {
      alertInsufficientBankBalance(paymentCheck);
      return;
    }
  }

  if (index >= 0) state.transactions[index] = payload;
  else state.transactions.push(payload);
  if (!state.budgets[payload.category] && payload.type === "expense") state.budgets[payload.category] = 0;
  selectedPeriod.mode = "month";
  selectedPeriod.month = monthOf(payload.date);
  saveState();
  els.dialog.close();
  render();
}

function deleteTransaction() {
  const id = els.transactionId.value;
  if (!id) return;
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveState();
  els.dialog.close();
  render();
}

function togglePaid(id, paid) {
  const item = state.transactions.find((transaction) => transaction.id === id);
  if (!item) return;
  if (paid) {
    const paymentCheck = canPayWithBankBalance(item);
    if (!paymentCheck.ok) {
      alertInsufficientBankBalance(paymentCheck);
      render();
      return;
    }
  }
  item.status = paid ? "paid" : "pending";
  item.situation = paid ? "PAGO" : "PENDENTE";
  saveState();
  if (paid) showToast("Conta paga", `${item.description} · ${money.format(item.amount)}`, "success");
  render();
}

function markAllCurrentPendingPaid() {
  const selectedPayment = els.pendingPaymentFilter.value || "all";
  const itemsToPay = expensesForPendingMonth(selectedPendingMonth).filter(
    (item) => item.status === "pending" && !isVerocardTransaction(item) && (selectedPayment === "all" || (item.paymentMethod || item.account) === selectedPayment),
  );
  const totalToPay = itemsToPay.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const available = availableBankBalanceForPayment();
  if (totalToPay > Math.max(available, 0)) {
    alertInsufficientBankBalance({ amount: totalToPay, available });
    return;
  }

  let changed = false;
  expensesForPendingMonth(selectedPendingMonth).forEach((item) => {
    if (itemsToPay.some((pendingItem) => pendingItem.id === item.id)) {
      item.status = "paid";
      item.situation = "PAGO";
      changed = true;
    }
  });
  if (changed) {
    saveState();
    showToast("Contas pagas", `${itemsToPay.length} conta(s) marcadas como pagas`, "success");
    render();
  }
}

function applySuggestedBudgets() {
  suggestedBudgetsByCategory.forEach((value, category) => {
    if (value > 0) state.budgets[category] = value;
  });
  saveState();
  showToast("Metas aplicadas", "As recomendações do histórico foram salvas como metas mensais.", "success");
  render();
}

function handleBudgetClick(event) {
  const saveButton = event.target.closest("[data-save-budget]");
  if (saveButton) {
    const category = saveButton.dataset.saveBudget;
    const input = els.budgetEditorGrid.querySelector(`[data-budget="${cssEscape(category)}"]`);
    state.budgets[category] = Number(input.value) || 0;
    saveState();
    render();
  }
}

function handleCsvImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imported = parseCsv(String(reader.result || ""));
    if (!imported.length) {
      alert("Nao encontrei lancamentos validos no CSV.");
      return;
    }
    state.transactions.push(...imported);
    imported.forEach((item) => {
      if (item.type === "expense" && !state.budgets[item.category]) state.budgets[item.category] = 0;
    });
    saveState();
    render();
    alert(`${imported.length} lancamentos importados.`);
  };
  reader.readAsText(file, "utf-8");
  event.target.value = "";
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((cell) => normalizeHeader(cell));
  return lines
    .slice(1)
    .map((line) => splitCsvLine(line, separator))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])))
    .map((row) => {
      const typeText = String(row["tp lancamento"] || row.tipo || row.type || "").toLowerCase();
      const incomeAmount = Number(String(row["receita($)"] || row.receita || "0").replace(/\./g, "").replace(",", "."));
      const expenseAmount = Number(String(row["despesa (r$)"] || row.despesa || row.valor || row.amount || "0").replace(/\./g, "").replace(",", "."));
      const isIncome = typeText.includes("receita") || typeText.includes("income");
      const paymentMethod = row["forma de pagamento"] || row.conta || row.account || "Importado";
      const situationText = normalizeText(row.situacao || row.status || "PAGO");
      const date = normalizeDate(row.data || row.date);
      return {
        id: crypto.randomUUID(),
        date,
        weekday: row.diasemana || weekdayShort(date),
        description: row.descricao || row.description || "Lancamento importado",
        type: isIncome ? "income" : "expense",
        launchType: isIncome ? "RECEITA" : "DESPESA",
        incomeAmount: isIncome ? Math.abs(incomeAmount || expenseAmount) : 0,
        expenseAmount: isIncome ? 0 : Math.abs(expenseAmount),
        amount: isIncome ? Math.abs(incomeAmount || expenseAmount) : Math.abs(expenseAmount),
        expenseClass: row["classificacao da despesa"] || row.classificacao || "",
        group: row.grupo || row.categoria || row.category || "",
        category: isIncome ? "Receitas" : row.grupo || row.categoria || row.category || "Importado",
        paymentMethod,
        account: paymentMethod,
        status: situationText === "PAGO" ? "paid" : "pending",
        situation: situationText === "PAGO" ? "PAGO" : "PENDENTE",
        modality: row.modalidade || PAYMENT_MODALITIES[paymentMethod] || "",
        notes: row.observacoes || row.notes || "",
      };
    })
    .filter((item) => item.date && item.amount > 0);
}

function splitCsvLine(line, separator) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"'));
}

function normalizeHeader(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return "";
}

function exportCsv() {
  const headers = ["DATA", "DiaSemana", "TP LANÇAMENTO", "DESCRIÇÃO", "RECEITA($)", "CLASSIFICAÇÃO DA DESPESA", "GRUPO", "DESPESA (R$)", "FORMA DE PAGAMENTO", "SITUAÇÃO", "MODALIDADE", "OBSERVAÇÕES"];
  const rows = state.transactions
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => [
      item.date,
      item.weekday || weekdayShort(item.date),
      item.launchType || (item.type === "income" ? "RECEITA" : "DESPESA"),
      item.description,
      item.incomeAmount || "",
      item.expenseClass || "",
      item.group || "",
      item.expenseAmount || "",
      item.paymentMethod || item.account || "",
      item.situation || (item.status === "paid" ? "PAGO" : "PENDENTE"),
      item.modality || "",
      item.notes,
    ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `despesas-meg-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function formatMonthShort(value) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function formatMonthCode(value) {
  const [year, month] = value.split("-");
  const label = new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  return `${label}/${year}`;
}

function formatCompactNumber(value) {
  const abs = Math.abs(Number(value) || 0);
  if (abs >= 1000000) return `${(value / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1000) return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} K`;
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cssEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const USER_ROLE_LABELS = { ADMIN: "Administrador", MANAGER: "Gerente", OPERATOR: "Operador", VIEWER: "Leitor" };
const USER_STATUS_LABELS = { ACTIVE: "Ativo", PENDING: "Aguardando aprovação", BLOCKED: "Bloqueado", REJECTED: "Rejeitado" };

function userDate(value) {
  return value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "Ainda não acessou";
}

function setUsersFeedback(message, tone = "") {
  if (!els.adminUsersFeedback) return;
  els.adminUsersFeedback.textContent = message;
  els.adminUsersFeedback.className = `admin-feedback ${tone}`.trim();
}

function renderManagedUsers(users) {
  els.registeredUsersMetric.textContent = String(users.length);
  els.pendingUsersMetric.textContent = String(users.filter((user) => user.status === "PENDING").length);
  els.activeUsersMetric.textContent = String(users.filter((user) => user.status === "ACTIVE" && user.isActive).length);
  if (!users.length) {
    els.adminUsersList.innerHTML = '<div class="empty">Nenhum usuário cadastrado.</div>';
    return;
  }
  els.adminUsersList.innerHTML = users.map((user) => {
    const primaryAdmin = user.email.toLowerCase() === "m_vilalva@hotmail.com";
    const roleOptions = Object.entries(USER_ROLE_LABELS).map(([value, label]) =>
      `<option value="${value}" ${user.role === value ? "selected" : ""}>${label}</option>`
    ).join("");
    const pendingActions = user.status === "PENDING"
      ? `<button class="button primary" type="button" data-user-action="APPROVE" data-user-id="${escapeHtml(user.id)}">Aprovar acesso</button><button class="button danger-soft" type="button" data-user-action="REJECT" data-user-id="${escapeHtml(user.id)}">Rejeitar</button>`
      : "";
    const activeActions = user.status === "ACTIVE" && !primaryAdmin
      ? `<button class="button danger-soft" type="button" data-user-action="BLOCK" data-user-id="${escapeHtml(user.id)}">Bloquear</button>`
      : "";
    const inactiveActions = user.status === "BLOCKED" || user.status === "REJECTED"
      ? `<button class="button primary" type="button" data-user-action="ACTIVATE" data-user-id="${escapeHtml(user.id)}">Reativar</button>`
      : "";
    const resetAction = user.status === "ACTIVE"
      ? `<button class="button ghost" type="button" data-reset-user-password="${escapeHtml(user.id)}">Enviar nova senha</button>`
      : "";
    return `<article class="admin-user-card" data-managed-user="${escapeHtml(user.id)}">
      <div class="admin-user-head">
        <div class="user-avatar">${escapeHtml(user.name.slice(0, 1).toUpperCase())}</div>
        <div class="admin-user-identity"><span class="user-status-pill ${user.status.toLowerCase()}">${escapeHtml(USER_STATUS_LABELS[user.status] || user.status)}</span><h3>${escapeHtml(user.name)}</h3><a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></div>
        ${primaryAdmin ? '<span class="primary-admin-badge">Administrador principal</span>' : ""}
      </div>
      <div class="admin-user-details"><span><small>Cadastrado em</small><strong>${userDate(user.createdAt)}</strong></span><span><small>Último acesso</small><strong>${userDate(user.lastLoginAt)}</strong></span></div>
      <div class="admin-user-permissions"><label>Perfil de acesso<select class="user-role-select" data-user-role="${escapeHtml(user.id)}" ${primaryAdmin ? "disabled" : ""}>${roleOptions}</select></label><p>${primaryAdmin ? "A conta principal mantém acesso total e não pode ser bloqueada." : "A alteração de perfil é registrada na auditoria do sistema."}</p></div>
      <div class="admin-user-actions">${!primaryAdmin && user.status === "ACTIVE" ? `<button class="button" type="button" data-save-user-role="${escapeHtml(user.id)}">Salvar permissão</button>` : ""}${pendingActions}${activeActions}${inactiveActions}${resetAction}</div>
    </article>`;
  }).join("");
}

async function loadManagedUsers({ keepFeedback = false } = {}) {
  if (!els.adminUsersList || typeof window.MEG_CLOUD?.listManagedUsers !== "function") return;
  els.adminUsersList.innerHTML = '<div class="empty">Carregando usuários cadastrados...</div>';
  if (!keepFeedback) setUsersFeedback("");
  try {
    const result = await window.MEG_CLOUD.listManagedUsers();
    renderManagedUsers(result.users || result);
  } catch (cause) {
    els.adminUsersList.innerHTML = '<div class="empty">Não foi possível carregar os usuários.</div>';
    setUsersFeedback(cause instanceof Error ? cause.message : "Falha ao carregar usuários.", "error");
  }
}

async function updateManagedUser(userId, action) {
  const card = document.querySelector(`[data-managed-user="${cssEscape(userId)}"]`);
  const role = card?.querySelector("[data-user-role]")?.value || "VIEWER";
  let note;
  if (action === "REJECT") {
    note = window.prompt("Informe o motivo da rejeição (opcional):", "") ?? undefined;
  }
  if ((action === "BLOCK" || action === "REJECT") && !window.confirm(`Confirma ${action === "BLOCK" ? "o bloqueio" : "a rejeição"} deste usuário?`)) return;
  setUsersFeedback("Atualizando acesso...", "loading");
  try {
    await window.MEG_CLOUD.changeUserAccess(userId, { action, role, note });
    const successMessage = action === "APPROVE" ? "Usuário aprovado e avisado por e-mail." : action === "BLOCK" ? "Usuário bloqueado e sessões encerradas." : action === "REJECT" ? "Solicitação rejeitada." : "Acesso e permissão atualizados.";
    await loadManagedUsers({ keepFeedback: true });
    setUsersFeedback(successMessage, "success");
  } catch (cause) {
    setUsersFeedback(cause instanceof Error ? cause.message : "Falha ao atualizar acesso.", "error");
  }
}

async function resetManagedUserPassword(userId) {
  const card = document.querySelector(`[data-managed-user="${cssEscape(userId)}"]`);
  const email = card?.querySelector(".admin-user-identity a")?.textContent || "o e-mail cadastrado";
  if (!window.confirm(`Enviar uma nova senha temporária para ${email}? Todas as sessões atuais serão encerradas.`)) return;
  setUsersFeedback("Gerando a senha e confirmando o envio do e-mail...", "loading");
  try {
    const result = await window.MEG_CLOUD.resetUserPassword(userId);
    setUsersFeedback(`Nova senha enviada com segurança para ${result.deliveredTo}.`, "success");
  } catch (cause) {
    setUsersFeedback(cause instanceof Error ? cause.message : "Falha ao redefinir a senha.", "error");
  }
}

document.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const viewLink = event.target.closest("[data-view-link]");
  const payableButton = event.target.closest("[data-payable-group]");
  const cardGroupButton = event.target.closest("[data-card-group]");
  const removeGroupButton = event.target.closest("[data-remove-group]");
  const removePaymentButton = event.target.closest("[data-remove-payment]");
  const removeExpenseClassButton = event.target.closest("[data-remove-expense-class]");
  const userActionButton = event.target.closest("[data-user-action]");
  const saveUserRoleButton = event.target.closest("[data-save-user-role]");
  const resetUserPasswordButton = event.target.closest("[data-reset-user-password]");
  if (editButton) {
    const item = state.transactions.find((transaction) => transaction.id === editButton.dataset.edit);
    if (item) {
      if (els.cardLaunchDialog.open) els.cardLaunchDialog.close();
      openTransactionDialog(item);
    }
  }
  if (viewLink) setView(viewLink.dataset.viewLink);
  if (payableButton) openPaymentConfirmation(payableButton.dataset.payableGroup);
  if (cardGroupButton) openCardLaunchDialog(cardGroupButton.dataset.cardGroup);
  if (removeGroupButton) removeCatalogItem("group", removeGroupButton.dataset.removeGroup);
  if (removePaymentButton) removeCatalogItem("payment", removePaymentButton.dataset.removePayment);
  if (removeExpenseClassButton) removeCatalogItem("expenseClass", removeExpenseClassButton.dataset.removeExpenseClass);
  if (userActionButton) updateManagedUser(userActionButton.dataset.userId, userActionButton.dataset.userAction);
  if (saveUserRoleButton) updateManagedUser(saveUserRoleButton.dataset.saveUserRole, "ACTIVATE");
  if (resetUserPasswordButton) resetManagedUserPassword(resetUserPasswordButton.dataset.resetUserPassword);
});

document.addEventListener("change", (event) => {
  const paidToggle = event.target.closest("[data-toggle-paid]");
  if (paidToggle) togglePaid(paidToggle.dataset.togglePaid, paidToggle.checked);
});

els.navItems.forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
const canManageUsers = window.MEG_CLOUD?.user?.role === "ADMIN" && typeof window.MEG_CLOUD?.listManagedUsers === "function";
els.adminUsersNav?.classList.toggle("hidden", !canManageUsers);
els.adminUsersNav?.addEventListener("click", loadManagedUsers);
els.reloadUsersBtn?.addEventListener("click", loadManagedUsers);
els.periodMode.value = selectedPeriod.mode;
els.monthFilter.value = selectedPeriod.month;
els.yearFilter.value = selectedPeriod.year;
els.periodMode.addEventListener("change", () => {
  selectedPeriod.mode = els.periodMode.value;
  render();
});
els.monthFilter.addEventListener("change", () => {
  selectedPeriod.month = els.monthFilter.value || currentMonth;
  selectedPeriod.mode = "month";
  render();
});
els.yearFilter.addEventListener("change", () => {
  selectedPeriod.year = els.yearFilter.value || String(today.getFullYear());
  selectedPeriod.mode = "year";
  render();
});
els.startDateFilter.addEventListener("change", () => {
  selectedPeriod.start = els.startDateFilter.value;
  selectedPeriod.mode = "range";
  render();
});
els.endDateFilter.addEventListener("change", () => {
  selectedPeriod.end = els.endDateFilter.value;
  selectedPeriod.mode = "range";
  render();
});
els.quickAddBtn.addEventListener("click", () => openTransactionDialog());
els.resetDemoBtn.addEventListener("click", () => {
  window.MEG_CLOUD?.reload();
});
els.searchInput.addEventListener("input", renderTransactions);
els.typeFilter.addEventListener("change", renderTransactions);
els.transactionSortFilter.addEventListener("change", renderTransactions);
els.transactionColumnFilters.forEach((control) => {
  control.addEventListener(control.tagName === "SELECT" ? "change" : "input", () => {
    transactionColumnFilters[control.dataset.columnFilter] = control.value;
    renderTransactions();
  });
});
els.clearColumnFiltersBtn?.addEventListener("click", () => {
  Object.keys(transactionColumnFilters).forEach((key) => delete transactionColumnFilters[key]);
  els.transactionColumnFilters.forEach((control) => { control.value = ""; });
  renderTransactions();
});
els.pendingStatusFilter.addEventListener("change", renderPending);
els.pendingPaymentFilter.addEventListener("change", renderPending);
els.pendingMonthFilter.addEventListener("change", () => {
  selectedPendingMonth = els.pendingMonthFilter.value || currentMonth;
  renderPending();
});
els.markAllPendingPaidBtn.addEventListener("click", markAllCurrentPendingPaid);
if (els.analyticsGroupFilter) {
  els.analyticsGroupFilter.addEventListener("change", () => {
    analyticsFilters.groups = selectedOptions(els.analyticsGroupFilter);
    renderAnalytics();
  });
}
els.analyticsPaymentFilter.addEventListener("change", () => {
  analyticsFilters.payments = selectedOptions(els.analyticsPaymentFilter);
  renderAnalytics();
});
els.balanceClosingChart?.addEventListener("mousemove", handleBalanceTooltip);
els.balanceClosingChart?.addEventListener("mouseleave", hideBalanceTooltip);
els.cashflowChart?.addEventListener("mousemove", handleCashflowTooltip);
els.cashflowChart?.addEventListener("mouseleave", hideCashflowTooltip);
els.dateInput.addEventListener("change", () => {
  els.weekdayInput.value = weekdayShort(els.dateInput.value);
});
els.transactionType.addEventListener("change", syncAmountFields);
els.paymentMethodInput.addEventListener("change", syncPaymentModality);
els.modalityInput.addEventListener("change", syncModalityPaymentOptions);
els.purchaseTotalInput.addEventListener("input", syncInstallmentFields);
els.installmentCountInput.addEventListener("input", syncInstallmentFields);
els.form.addEventListener("submit", saveTransaction);
els.deleteTransactionBtn.addEventListener("click", deleteTransaction);
els.closeDialogBtn.addEventListener("click", () => els.dialog.close());
els.cancelDialogBtn.addEventListener("click", () => els.dialog.close());
els.paymentConfirmForm.addEventListener("submit", confirmDashboardPayment);
els.closePaymentConfirmBtn.addEventListener("click", () => els.paymentConfirmDialog.close());
els.cancelPaymentConfirmBtn.addEventListener("click", () => els.paymentConfirmDialog.close());
els.closeCardLaunchDialogBtn.addEventListener("click", () => els.cardLaunchDialog.close());
els.cancelCardLaunchDialogBtn.addEventListener("click", () => els.cardLaunchDialog.close());
els.applySuggestedBudgetsBtn.addEventListener("click", applySuggestedBudgets);
els.budgetEditorGrid.addEventListener("click", handleBudgetClick);
els.csvImport.addEventListener("change", handleCsvImport);
els.exportCsvBtn.addEventListener("click", exportCsv);
els.groupCatalogForm.addEventListener("submit", addGroupCatalog);
els.expenseClassCatalogForm.addEventListener("submit", addExpenseClassCatalog);
els.paymentCatalogForm.addEventListener("submit", addPaymentCatalog);
window.addEventListener("resize", () => {
  renderCategoryChart();
  renderAnalytics();
});

setView(selectedView);
render();

window.MEG_APP = {
  replaceImportedState,
  getState: () => structuredClone(state),
  render
};
