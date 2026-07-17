import { availableMonetaryBalance, calculateBalanceReconciliation, calculateCreditCardPortfolio, calculateCurrentMonthHealth, calculateFinancialSummary, calculateHistoricalProjection, calculateMonetaryDashboard, groupPayableItems, isCreditCardExpense, payableGroupLabel, payableGroupTotal, summarizeDueDate } from "./legacy-finance.js";
import { cardStatementDueDate, installmentDueDate, splitInstallmentAmounts } from "./legacy-installments.js";
import { addCalendarDays, calendarDaysBetween, dateInTimeZone, lastCalendarDayOfMonth } from "./calendar-date.js";

const STORAGE_KEY = "meg-financas-state-v4-paid-fixes";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const today = new Date();
const todayIso = dateInTimeZone(today);
const currentMonth = todayIso.slice(0, 7);

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
  cards: [],
};

const ESSENTIAL_GROUPS = new Set(["COMUNICAÇÃO", "HIGIENE PESSOAL", "IMÓVEL", "MAT. ESCOLAR", "PGTO DE DIVIDAS", "SAÚDE", "SUPERMERCADO", "TITULOS/PREVIDÊNCIA", "TRANSPORTE"] .map((item) => normalizeText(item)));

let state = loadState();
let originalTransactionsById = new Map((defaultState.transactions || []).map((item) => [item.id, normalizeTransaction(item)]));
let selectedPeriod = {
  mode: "month",
  month: currentMonth,
  year: todayIso.slice(0, 4),
  start: "",
  end: "",
};
let selectedView = "dashboard";
let analyticsDefaultPeriodApplied = false;
let selectedPendingMonth = currentMonth;
let analyticsFilters = {
  groups: [],
  payments: [],
};
let incomeSourceFilter = "all";
let incomeSourceSearch = "";
let creditCardFilter = "all";
let creditCardStatusFilter = "all";
let creditCardSearch = "";
const transactionColumnFilters = {};
let descriptionSuggestionItems = [];
let activeDescriptionSuggestion = -1;
let editingGroup = "";
let editingExpenseClass = "";
let editingPaymentMethod = "";
let editingCardPaymentMethod = "";

const els = {
  appShell: document.querySelector(".app-shell"),
  sidebar: document.querySelector("#primarySidebar"),
  desktopSidebarToggle: document.querySelector("#desktopSidebarToggle"),
  sidebarDateTime: document.querySelector("#sidebarDateTime"),
  sidebarVersion: document.querySelector("#sidebarVersion"),
  mobileMenuBtn: document.querySelector("#mobileMenuBtn"),
  sidebarCloseBtn: document.querySelector("#sidebarCloseBtn"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
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
  openReconciliationBtn: document.querySelector("#openReconciliationBtn"),
  reconciliationDialog: document.querySelector("#reconciliationDialog"),
  reconciliationForm: document.querySelector("#reconciliationForm"),
  closeReconciliationBtn: document.querySelector("#closeReconciliationBtn"),
  cancelReconciliationBtn: document.querySelector("#cancelReconciliationBtn"),
  reconciliationLedgerMetric: document.querySelector("#reconciliationLedgerMetric"),
  reconciliationActualMetric: document.querySelector("#reconciliationActualMetric"),
  reconciliationDifferenceMetric: document.querySelector("#reconciliationDifferenceMetric"),
  reconciliationDifferenceCard: document.querySelector("#reconciliationDifferenceCard"),
  reconciliationActualInput: document.querySelector("#reconciliationActualInput"),
  reconciliationMessage: document.querySelector("#reconciliationMessage"),
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
  cashflowOperatingCard: document.querySelector("#cashflowOperatingCard"),
  cashflowOperatingIcon: document.querySelector("#cashflowOperatingIcon"),
  cashflowAvailableMetric: document.querySelector("#cashflowAvailableMetric"),
  cashflowAvailableTrend: document.querySelector("#cashflowAvailableTrend"),
  cashflowPendingMetric: document.querySelector("#cashflowPendingMetric"),
  cashflowPendingTrend: document.querySelector("#cashflowPendingTrend"),
  cashflowSafeCard: document.querySelector("#cashflowSafeCard"),
  cashflowSafeIcon: document.querySelector("#cashflowSafeIcon"),
  cashflowSafeLabel: document.querySelector("#cashflowSafeLabel"),
  cashflowSafeMetric: document.querySelector("#cashflowSafeMetric"),
  cashflowSafeTrend: document.querySelector("#cashflowSafeTrend"),
  cashflowEquationOpening: document.querySelector("#cashflowEquationOpening"),
  cashflowEquationIncome: document.querySelector("#cashflowEquationIncome"),
  cashflowEquationPaid: document.querySelector("#cashflowEquationPaid"),
  cashflowEquationPending: document.querySelector("#cashflowEquationPending"),
  cashflowEquationResult: document.querySelector("#cashflowEquationResult"),
  cashflowEquationClosing: document.querySelector("#cashflowEquationClosing"),
  cashflowChartSummary: document.querySelector("#cashflowChartSummary"),
  cashflowChartLegend: document.querySelector("#cashflowChartLegend"),
  cashflowChart: document.querySelector("#cashflowChart"),
  cashflowTooltip: document.querySelector("#cashflowTooltip"),
  cashflowAgendaTitle: document.querySelector("#cashflowAgendaTitle"),
  cashflowAgendaSummary: document.querySelector("#cashflowAgendaSummary"),
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
  incomeAnalysisPeriodLabel: document.querySelector("#incomeAnalysisPeriodLabel"),
  incomeAnalysisHero: document.querySelector("#incomeAnalysisHero"),
  incomeAnalysisHealthTitle: document.querySelector("#incomeAnalysisHealthTitle"),
  incomeAnalysisHealthMessage: document.querySelector("#incomeAnalysisHealthMessage"),
  incomeAnalysisTotalMetric: document.querySelector("#incomeAnalysisTotalMetric"),
  incomeAnalysisTotalNote: document.querySelector("#incomeAnalysisTotalNote"),
  incomeSourceFilter: document.querySelector("#incomeSourceFilter"),
  incomeSourceSearch: document.querySelector("#incomeSourceSearch"),
  clearIncomeFiltersBtn: document.querySelector("#clearIncomeFiltersBtn"),
  incomeAverageMetric: document.querySelector("#incomeAverageMetric"),
  incomeAverageNote: document.querySelector("#incomeAverageNote"),
  incomeTicketMetric: document.querySelector("#incomeTicketMetric"),
  incomeTicketNote: document.querySelector("#incomeTicketNote"),
  incomeTopSourceMetric: document.querySelector("#incomeTopSourceMetric"),
  incomeTopSourceNote: document.querySelector("#incomeTopSourceNote"),
  incomeRecurringMetric: document.querySelector("#incomeRecurringMetric"),
  incomeRecurringNote: document.querySelector("#incomeRecurringNote"),
  incomeMonthlyChart: document.querySelector("#incomeMonthlyChart"),
  incomeSourceList: document.querySelector("#incomeSourceList"),
  incomeRecurringList: document.querySelector("#incomeRecurringList"),
  incomeSourceDonut: document.querySelector("#incomeSourceDonut"),
  incomeSourceDonutMetric: document.querySelector("#incomeSourceDonutMetric"),
  incomeFilteredSourceMetric: document.querySelector("#incomeFilteredSourceMetric"),
  incomeFilteredSourceNote: document.querySelector("#incomeFilteredSourceNote"),
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
  currentHealthAvailableMetric: document.querySelector("#currentHealthAvailableMetric"),
  currentHealthPendingMetric: document.querySelector("#currentHealthPendingMetric"),
  currentHealthClosingMetric: document.querySelector("#currentHealthClosingMetric"),
  analyticsSavingsLabel: document.querySelector("#analyticsSavingsLabel"),
  analyticsSavingsMetric: document.querySelector("#analyticsSavingsMetric"),
  analyticsSavingsTrend: document.querySelector("#analyticsSavingsTrend"),
  analyticsCalculationPeriod: document.querySelector("#analyticsCalculationPeriod"),
  analyticsOpeningMetric: document.querySelector("#analyticsOpeningMetric"),
  analyticsPeriodIncomeMetric: document.querySelector("#analyticsPeriodIncomeMetric"),
  analyticsPaidExpenseMetric: document.querySelector("#analyticsPaidExpenseMetric"),
  analyticsAvailableCard: document.querySelector("#analyticsAvailableCard"),
  analyticsAvailableMetric: document.querySelector("#analyticsAvailableMetric"),
  analyticsProjectionLine: document.querySelector("#analyticsProjectionLine"),
  analyticsProjectedMetric: document.querySelector("#analyticsProjectedMetric"),
  analyticsProjectedNote: document.querySelector("#analyticsProjectedNote"),
  analyticsTicketMetric: document.querySelector("#analyticsTicketMetric"),
  analyticsTicketNote: document.querySelector("#analyticsTicketNote"),
  analyticsIncomeMetric: document.querySelector("#analyticsIncomeMetric"),
  analyticsIncomeNote: document.querySelector("#analyticsIncomeNote"),
  analyticsExpenseMetric: document.querySelector("#analyticsExpenseMetric"),
  analyticsExpenseNote: document.querySelector("#analyticsExpenseNote"),
  analyticsPendingMetric: document.querySelector("#analyticsPendingMetric"),
  analyticsPendingNote: document.querySelector("#analyticsPendingNote"),
  analyticsCoverageCard: document.querySelector("#analyticsCoverageCard"),
  analyticsCoverageMetric: document.querySelector("#analyticsCoverageMetric"),
  analyticsCoverageNote: document.querySelector("#analyticsCoverageNote"),
  historicalPeriodLabel: document.querySelector("#historicalPeriodLabel"),
  historicalFirstDate: document.querySelector("#historicalFirstDate"),
  historicalIncomeMetric: document.querySelector("#historicalIncomeMetric"),
  historicalExpenseMetric: document.querySelector("#historicalExpenseMetric"),
  historicalBalanceCard: document.querySelector("#historicalBalanceCard"),
  historicalBalanceMetric: document.querySelector("#historicalBalanceMetric"),
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
  transactionsFilteredIncome: document.querySelector("#transactionsFilteredIncome"),
  transactionsFilteredIncomeCount: document.querySelector("#transactionsFilteredIncomeCount"),
  transactionsFilteredExpense: document.querySelector("#transactionsFilteredExpense"),
  transactionsFilteredExpenseCount: document.querySelector("#transactionsFilteredExpenseCount"),
  transactionsFilteredResult: document.querySelector("#transactionsFilteredResult"),
  transactionsFilteredResultStatus: document.querySelector("#transactionsFilteredResultStatus"),
  transactionsFilteredResultCard: document.querySelector("#transactionsFilteredResultCard"),
  creditCardsPeriodLabel: document.querySelector("#creditCardsPeriodLabel"),
  newCardTransactionBtn: document.querySelector("#newCardTransactionBtn"),
  creditCardFilter: document.querySelector("#creditCardFilter"),
  creditCardStatusFilter: document.querySelector("#creditCardStatusFilter"),
  creditCardSearchInput: document.querySelector("#creditCardSearchInput"),
  clearCreditCardFiltersBtn: document.querySelector("#clearCreditCardFiltersBtn"),
  creditCardCommandCenter: document.querySelector("#creditCardCommandCenter"),
  creditCardHealthTitle: document.querySelector("#creditCardHealthTitle"),
  creditCardHealthMessage: document.querySelector("#creditCardHealthMessage"),
  creditLimitRing: document.querySelector("#creditLimitRing"),
  creditUsagePercent: document.querySelector("#creditUsagePercent"),
  creditTotalLimitMetric: document.querySelector("#creditTotalLimitMetric"),
  creditUsedLimitMetric: document.querySelector("#creditUsedLimitMetric"),
  creditAvailableLimitMetric: document.querySelector("#creditAvailableLimitMetric"),
  creditPeriodTotalMetric: document.querySelector("#creditPeriodTotalMetric"),
  creditCardWallet: document.querySelector("#creditCardWallet"),
  creditTopExpensesNote: document.querySelector("#creditTopExpensesNote"),
  creditTopExpenses: document.querySelector("#creditTopExpenses"),
  creditLargestGroupMetric: document.querySelector("#creditLargestGroupMetric"),
  creditGroupBars: document.querySelector("#creditGroupBars"),
  creditInvoiceTitle: document.querySelector("#creditInvoiceTitle"),
  creditInvoiceSummary: document.querySelector("#creditInvoiceSummary"),
  creditInvoiceRows: document.querySelector("#creditInvoiceRows"),
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
  backupImport: document.querySelector("#backupImport"),
  backupImportStatus: document.querySelector("#backupImportStatus"),
  exportBackupBtn: document.querySelector("#exportBackupBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  catalogModalityOptions: document.querySelector("#catalogModalityOptions"),
  dialog: document.querySelector("#transactionDialog"),
  form: document.querySelector("#transactionForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  transactionId: document.querySelector("#transactionId"),
  dateInput: document.querySelector("#dateInput"),
  dateInputLabel: document.querySelector("#dateInputLabel"),
  weekdayInput: document.querySelector("#weekdayInput"),
  transactionType: document.querySelector("#transactionType"),
  purchaseDateField: document.querySelector("#purchaseDateField"),
  purchaseDateInput: document.querySelector("#purchaseDateInput"),
  cardDuePreview: document.querySelector("#cardDuePreview"),
  descriptionInput: document.querySelector("#descriptionInput"),
  descriptionSuggestions: document.querySelector("#descriptionSuggestions"),
  incomeAmountInput: document.querySelector("#incomeAmountInput"),
  expenseAmountInput: document.querySelector("#expenseAmountInput"),
  incomeAmountField: document.querySelector("#incomeAmountField"),
  expenseAmountField: document.querySelector("#expenseAmountField"),
  expenseClassInput: document.querySelector("#expenseClassInput"),
  expenseClassField: document.querySelector("#expenseClassField"),
  groupInput: document.querySelector("#groupInput"),
  groupField: document.querySelector("#groupField"),
  paymentMethodInput: document.querySelector("#paymentMethodInput"),
  paymentMethodLabel: document.querySelector("#paymentMethodLabel"),
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
  openingAlertDialog: document.querySelector("#openingAlertDialog"),
  openingAlertTitle: document.querySelector("#openingAlertTitle"),
  openingAlertBody: document.querySelector("#openingAlertBody"),
  closeOpeningAlertBtn: document.querySelector("#closeOpeningAlertBtn"),
  dismissOpeningAlertBtn: document.querySelector("#dismissOpeningAlertBtn"),
  viewOpeningAlertsBtn: document.querySelector("#viewOpeningAlertsBtn"),
  insufficientBalanceDialog: document.querySelector("#insufficientBalanceDialog"),
  blockedPaymentMetric: document.querySelector("#blockedPaymentMetric"),
  blockedAvailableMetric: document.querySelector("#blockedAvailableMetric"),
  blockedMissingMetric: document.querySelector("#blockedMissingMetric"),
  blockedBalanceMessage: document.querySelector("#blockedBalanceMessage"),
  closeInsufficientBalanceBtn: document.querySelector("#closeInsufficientBalanceBtn"),
  addMissingIncomeBtn: document.querySelector("#addMissingIncomeBtn"),
  groupCatalogForm: document.querySelector("#groupCatalogForm"),
  newGroupInput: document.querySelector("#newGroupInput"),
  groupCatalogSubmitBtn: document.querySelector("#groupCatalogSubmitBtn"),
  groupCatalogList: document.querySelector("#groupCatalogList"),
  groupCatalogCount: document.querySelector("#groupCatalogCount"),
  expenseClassCatalogForm: document.querySelector("#expenseClassCatalogForm"),
  newExpenseClassInput: document.querySelector("#newExpenseClassInput"),
  expenseClassCatalogSubmitBtn: document.querySelector("#expenseClassCatalogSubmitBtn"),
  expenseClassCatalogList: document.querySelector("#expenseClassCatalogList"),
  expenseClassCatalogCount: document.querySelector("#expenseClassCatalogCount"),
  paymentCatalogForm: document.querySelector("#paymentCatalogForm"),
  newPaymentInput: document.querySelector("#newPaymentInput"),
  newPaymentModalityInput: document.querySelector("#newPaymentModalityInput"),
  paymentCatalogSubmitBtn: document.querySelector("#paymentCatalogSubmitBtn"),
  adminUsersNav: document.querySelector("#adminUsersNav"),
  reloadUsersBtn: document.querySelector("#reloadUsersBtn"),
  registeredUsersMetric: document.querySelector("#registeredUsersMetric"),
  pendingUsersMetric: document.querySelector("#pendingUsersMetric"),
  activeUsersMetric: document.querySelector("#activeUsersMetric"),
  adminUsersFeedback: document.querySelector("#adminUsersFeedback"),
  adminUsersList: document.querySelector("#adminUsersList"),
  paymentCatalogList: document.querySelector("#paymentCatalogList"),
  paymentCatalogCount: document.querySelector("#paymentCatalogCount"),
  cardCatalogForm: document.querySelector("#cardCatalogForm"),
  newCardPaymentInput: document.querySelector("#newCardPaymentInput"),
  newCardBrandInput: document.querySelector("#newCardBrandInput"),
  newCardClosingDayInput: document.querySelector("#newCardClosingDayInput"),
  newCardDueDayInput: document.querySelector("#newCardDueDayInput"),
  newCardBestDayInput: document.querySelector("#newCardBestDayInput"),
  newCardLimitInput: document.querySelector("#newCardLimitInput"),
  cardCatalogSubmitBtn: document.querySelector("#cardCatalogSubmitBtn"),
  cardCatalogList: document.querySelector("#cardCatalogList"),
  cardCatalogCount: document.querySelector("#cardCatalogCount"),
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
  window.MEG_NATIVE_NOTIFICATIONS?.sync?.(state);
}

function replaceImportedState(transactions, options = {}) {
  state = normalizeState({
    transactions,
    budgets: state.budgets || {},
    catalogs: state.catalogs || DEFAULT_CATALOGS,
  });
  originalTransactionsById = new Map(state.transactions.map((item) => [item.id, item]));
  analyticsDefaultPeriodApplied = false;
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
    catalogs: {
      groups,
      expenseClasses,
      paymentMethods: [...paymentMap.values()],
      cards: (incomingCatalogs.cards || []).map((card) => ({
        paymentMethod: String(card?.paymentMethod || "").trim(),
        brand: String(card?.brand || "VISA").trim().toUpperCase(),
        closingDay: Number(card?.closingDay || 0),
        dueDay: Number(card?.dueDay || 0),
        bestPurchaseDay: Number(card?.bestPurchaseDay || 0),
        limit: Number(card?.limit || 0),
      })).filter((card) => card.paymentMethod && card.closingDay && card.dueDay),
    },
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
  const modality = normalizeText(item.modality);
  if (modality.includes("ALIMENTA")) return true;
  if (item.type === "income") return description.includes("VEROCARD");
  if (item.type === "expense") return payment.includes("VEROCARD");
  return false;
}

function paidTransactionsUntilToday() {
  return state.transactions.filter((item) => item.date <= todayIso && !isVerocardTransaction(item));
}

function transactionsUntil(dateValue) {
  return state.transactions.filter((item) => item.date <= dateValue);
}

function accountBalanceUntil(dateValue) {
  const totals = totalsFor(transactionsUntil(dateValue).filter((item) => !isVerocardTransaction(item)));
  return totals.income - totals.expense;
}

function availableBankBalanceForPayment(excludeId = "") {
  return availableMonetaryBalance(state.transactions, todayIso, excludeId);
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
  const safeAvailable = Math.max(available, 0);
  const missing = Math.max(amount - safeAvailable, 0);
  els.blockedPaymentMetric.textContent = money.format(amount);
  els.blockedAvailableMetric.textContent = money.format(safeAvailable);
  els.blockedMissingMetric.textContent = money.format(missing);
  els.blockedBalanceMessage.textContent = `Insira ao menos ${money.format(missing)} em receita recebida antes de confirmar este pagamento.`;
  showToast("Pagamento bloqueado", `Faltam ${money.format(missing)} no saldo monetário.`, "danger");
  if (!els.insufficientBalanceDialog.open) els.insufficientBalanceDialog.showModal();
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
  return lastCalendarDayOfMonth(monthValue);
}

function addDays(dateValue, days) {
  return addCalendarDays(dateValue, days);
}

function daysBetween(start, end) {
  return Math.max(1, calendarDaysBetween(start, end) + 1);
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

function historicalTransactionsThroughCurrentMonth() {
  const currentMonthEnd = lastDayOfMonth(currentMonth);
  return state.transactions
    .filter((item) => item.date && item.date <= currentMonthEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function currentMonthFinancialHealth() {
  const monthStart = `${currentMonth}-01`;
  const monthEnd = lastDayOfMonth(currentMonth);
  return {
    monthStart,
    monthEnd,
    ...calculateCurrentMonthHealth(state.transactions, monthStart, todayIso, monthEnd),
  };
}

function historicalMonthsThroughCurrentMonth() {
  const items = historicalTransactionsThroughCurrentMonth();
  if (!items.length) return [];
  const months = [];
  let cursor = monthOf(items[0].date);
  while (cursor <= currentMonth) {
    months.push(cursor);
    const [year, month] = cursor.split("-").map(Number);
    cursor = new Date(year, month, 1).toISOString().slice(0, 7);
  }
  return months;
}

function monthlyClosingBalanceRows() {
  return historicalMonthsThroughCurrentMonth().map((month) => ({
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
  if (selectedView === "dashboard") renderDashboard();
  if (selectedView === "cashflow") renderCashflow();
  if (selectedView === "analytics") {
    renderAnalyticsFilters();
    renderAnalytics();
  }
  if (selectedView === "income-analysis") renderIncomeAnalysis();
  if (selectedView === "transactions") renderTransactions();
  if (selectedView === "credit-cards") renderCreditCards();
  if (selectedView === "budgets") renderBudgets();
  if (selectedView === "pending") renderPending();
  if (selectedView === "catalogs") renderCatalogs();
  if (selectedView === "settings") renderSettings();
}

function renderDashboard() {
  const items = selectedTransactions();
  const totals = financialSummaryForPeriod(items);
  const { start: dashboardStart, end: dashboardEnd } = dateRangeForSelectedPeriod();
  const monetaryPosition = calculateMonetaryDashboard(state.transactions, dashboardStart, dashboardEnd, todayIso);
  const balance = totals.consolidatedBalance;
  const monthCount = selectedPeriodMonthCount(items);
  const totalBudget = Object.values(state.budgets).reduce((sum, value) => sum + Number(value || 0), 0) * monthCount;
  const usedBudget = totalBudget ? Math.round((totals.expense / totalBudget) * 100) : 0;

  els.dashboardTitle.textContent = `Resumo - ${periodLabel()}`;
  if (els.categoryChartNote) els.categoryChartNote.textContent = `${formatCompactMoney(totals.expense)} no periodo`;
  els.monetaryRevenueMetric.textContent = money.format(monetaryPosition.openingBalance + monetaryPosition.currentIncome);
  els.monetaryExpenseMetric.textContent = money.format(monetaryPosition.currentPaidExpense);
  els.monetarySituationMetric.textContent = money.format(monetaryPosition.currentBalance);
  els.monetaryRevenueNote.textContent = selectedPeriod.mode !== "month"
    ? `${money.format(monetaryPosition.currentIncome)} no período + ${money.format(monetaryPosition.openingBalance)} anteriores`
    : `${money.format(monetaryPosition.currentIncome)} em ${formatMonthCode(selectedPeriod.month)} + ${money.format(monetaryPosition.openingBalance)} até ${formatMonthCode(previousMonthValue(selectedPeriod.month))}`;
  els.monetaryExpenseNote.textContent = `${money.format(monetaryPosition.pendingExpense)} em contas pendentes`;
  els.monetarySituationNote.textContent = monetaryPosition.balanceAfterPending >= 0
    ? `✅ Após quitar as pendências, sobram ${money.format(monetaryPosition.surplusAfterPending)}`
    : `🚨 Após quitar as pendências, faltam ${money.format(monetaryPosition.missingAfterPending)}`;
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
  setCardTone(els.monetaryPanel, monetaryPosition.balanceAfterPending >= 0);
  setCardTone(els.ticketPanel, totals.ticketBalance >= 0);
  setCardTone(els.consolidatedPanel, totals.consolidatedBalance >= 0);

  renderCurrentSituation();
  renderDashboardPayables();
  renderCategoryChart();
  renderMonthProgress();
}

function updateReconciliationPreview() {
  const actualBalance = Number(els.reconciliationActualInput.value || 0);
  const reconciliation = calculateBalanceReconciliation(state.transactions, actualBalance, todayIso);
  els.reconciliationLedgerMetric.textContent = money.format(reconciliation.ledgerBalance);
  els.reconciliationActualMetric.textContent = money.format(reconciliation.actualBalance);
  els.reconciliationDifferenceMetric.textContent = money.format(reconciliation.difference);
  els.reconciliationDifferenceCard.classList.toggle("positive", reconciliation.difference > 0.005);
  els.reconciliationDifferenceCard.classList.toggle("negative", reconciliation.difference < -0.005);
  els.reconciliationMessage.textContent = reconciliation.reconciled
    ? "O saldo do MEG já confere com o banco. Nenhum ajuste será criado."
    : reconciliation.difference > 0
      ? `Faltam ${money.format(reconciliation.adjustmentAmount)} no livro-caixa. O MEG registrará uma receita de ajuste.`
      : `Sobram ${money.format(reconciliation.adjustmentAmount)} no livro-caixa. O MEG registrará uma despesa de ajuste.`;
  return reconciliation;
}

function openReconciliationDialog() {
  const ledgerBalance = availableMonetaryBalance(state.transactions, todayIso);
  els.reconciliationActualInput.value = ledgerBalance.toFixed(2);
  updateReconciliationPreview();
  els.reconciliationDialog.showModal();
  window.setTimeout(() => {
    els.reconciliationActualInput.select();
    els.reconciliationActualInput.focus();
  }, 40);
}

function saveBalanceReconciliation(event) {
  event.preventDefault();
  const reconciliation = updateReconciliationPreview();
  if (reconciliation.reconciled) {
    els.reconciliationDialog.close();
    showToast("Saldo conferido", "O saldo do MEG já corresponde ao saldo bancário.", "success");
    return;
  }
  const type = reconciliation.adjustmentType;
  const adjustment = normalizeTransaction({
    id: crypto.randomUUID(),
    date: todayIso,
    weekday: weekdayShort(todayIso),
    type,
    launchType: type === "income" ? "RECEITA" : "DESPESA",
    description: "AJUSTE DE CONCILIAÇÃO BANCÁRIA",
    incomeAmount: type === "income" ? reconciliation.adjustmentAmount : 0,
    expenseAmount: type === "expense" ? reconciliation.adjustmentAmount : 0,
    amount: reconciliation.adjustmentAmount,
    category: type === "income" ? "Receitas" : "AJUSTE DE SALDO",
    group: type === "expense" ? "AJUSTE DE SALDO" : "",
    expenseClass: type === "expense" ? "AJUSTE DE SALDO" : "",
    paymentMethod: "AJUSTE DE SALDO",
    account: "AJUSTE DE SALDO",
    status: "paid",
    situation: "PAGO",
    modality: "A VISTA",
    notes: `Conciliação em ${todayIso}: saldo calculado ${money.format(reconciliation.ledgerBalance)}; saldo bancário ${money.format(reconciliation.actualBalance)}.`,
    source: "CONCILIAÇÃO BANCÁRIA",
    reconciliation: true,
  });
  state.transactions.push(adjustment);
  saveState();
  els.reconciliationDialog.close();
  render();
  showToast("Saldo conciliado", `${money.format(reconciliation.adjustmentAmount)} registrados como ajuste auditável.`, "success");
}

function modalityForPayment(method) {
  const catalogItem = (state.catalogs?.paymentMethods || []).find((item) => normalizeText(item.description) === normalizeText(method));
  return catalogItem?.modality || PAYMENT_MODALITIES[method] || "";
}

function incomeSourceName(item) {
  return String(item.description || "Receita sem descrição").trim().toUpperCase();
}

function renderIncomeAnalysis() {
  const incomeItems = selectedTransactions().filter((item) => item.type === "income");
  const allMonetaryItems = incomeItems.filter((item) => !isVerocardTransaction(item));
  const ticketItems = incomeItems.filter(isVerocardTransaction);
  const sourceOptions = [...new Set(allMonetaryItems.map(incomeSourceName))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (incomeSourceFilter !== "all" && !sourceOptions.includes(incomeSourceFilter)) incomeSourceFilter = "all";
  els.incomeSourceFilter.innerHTML = `<option value="all">Todas as origens</option>${sourceOptions.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("")}`;
  els.incomeSourceFilter.value = incomeSourceFilter;
  if (els.incomeSourceSearch.value !== incomeSourceSearch) els.incomeSourceSearch.value = incomeSourceSearch;
  const search = normalizeText(incomeSourceSearch);
  const monetaryItems = allMonetaryItems.filter((item) => {
    const source = incomeSourceName(item);
    return (incomeSourceFilter === "all" || source === incomeSourceFilter) && (!search || normalizeText(source).includes(search));
  });
  const total = monetaryItems.reduce((sum, item) => sum + Number(item.incomeAmount || item.amount || 0), 0);
  const unfilteredTotal = allMonetaryItems.reduce((sum, item) => sum + Number(item.incomeAmount || item.amount || 0), 0);
  const ticketTotal = ticketItems.reduce((sum, item) => sum + Number(item.incomeAmount || item.amount || 0), 0);
  const months = [...new Set(monetaryItems.map((item) => monthOf(item.date)).filter(Boolean))].sort();
  const average = months.length ? total / months.length : 0;
  const sourceMap = new Map();
  monetaryItems.forEach((item) => {
    const source = incomeSourceName(item);
    const current = sourceMap.get(source) || { source, value: 0, count: 0, months: new Set() };
    current.value += Number(item.incomeAmount || item.amount || 0);
    current.count += 1;
    current.months.add(monthOf(item.date));
    sourceMap.set(source, current);
  });
  const sources = [...sourceMap.values()].sort((a, b) => b.value - a.value);
  const recurring = sources.filter((item) => item.months.size > 1);
  const monthly = months.map((month) => ({
    month,
    value: monetaryItems.filter((item) => monthOf(item.date) === month).reduce((sum, item) => sum + Number(item.incomeAmount || item.amount || 0), 0),
  }));
  const previous = monthly.at(-2)?.value || 0;
  const latest = monthly.at(-1)?.value || 0;
  const variation = previous ? ((latest - previous) / previous) * 100 : latest ? 100 : 0;
  const maxMonthly = Math.max(...monthly.map((item) => item.value), 1);
  const maxSource = Math.max(...sources.map((item) => item.value), 1);
  const filteredShare = unfilteredTotal ? Math.min((total / unfilteredTotal) * 100, 100) : 0;

  els.incomeAnalysisPeriodLabel.textContent = periodLabel();
  els.incomeAnalysisTotalMetric.textContent = money.format(total);
  els.incomeAnalysisTotalNote.textContent = `${monetaryItems.length} entrada(s) monetária(s)${incomeSourceFilter !== "all" || search ? " no filtro" : ""}`;
  els.incomeSourceDonut.style.setProperty("--income-share", `${filteredShare * 3.6}deg`);
  els.incomeSourceDonutMetric.textContent = `${filteredShare.toFixed(0)}%`;
  els.incomeFilteredSourceMetric.textContent = incomeSourceFilter === "all" ? (search ? `Busca: ${incomeSourceSearch}` : "Todas") : incomeSourceFilter;
  els.incomeFilteredSourceNote.textContent = `${money.format(total)} de ${money.format(unfilteredTotal)} no período selecionado`;
  els.incomeAverageMetric.textContent = money.format(average);
  els.incomeAverageNote.textContent = months.length ? `Média em ${months.length} mês(es) com receita` : "Sem base para média";
  els.incomeTicketMetric.textContent = money.format(ticketTotal);
  els.incomeTicketNote.textContent = `${ticketItems.length} crédito(s) de alimentação`;
  els.incomeTopSourceMetric.textContent = sources[0]?.source || "—";
  els.incomeTopSourceNote.textContent = sources[0] ? `${money.format(sources[0].value)} em ${sources[0].count} lançamento(s)` : "Sem receitas no período";
  els.incomeRecurringMetric.textContent = String(recurring.length);
  els.incomeRecurringNote.textContent = recurring.length ? `${recurring.length} fonte(s) aumentam a previsibilidade` : "Nenhuma fonte repetida identificada";
  els.incomeAnalysisHero.classList.toggle("risk", !total);
  els.incomeAnalysisHero.classList.toggle("attention", total > 0 && variation < -10);
  els.incomeAnalysisHero.classList.toggle("healthy", total > 0 && variation >= -10);
  if (!total) {
    els.incomeAnalysisHealthTitle.textContent = "🔴 Nenhuma receita monetária no período";
    els.incomeAnalysisHealthMessage.textContent = "Registre as entradas recebidas para acompanhar estabilidade, recorrência e evolução da renda.";
  } else if (variation < -10 && monthly.length > 1) {
    els.incomeAnalysisHealthTitle.textContent = `🟡 Receita do último mês caiu ${Math.abs(variation).toFixed(1)}%`;
    els.incomeAnalysisHealthMessage.textContent = `A entrada mais recente foi ${money.format(latest)}, abaixo dos ${money.format(previous)} do mês anterior. Preserve caixa e revise receitas previstas.`;
  } else {
    els.incomeAnalysisHealthTitle.textContent = `🟢 ${money.format(total)} em receitas monetárias`;
    els.incomeAnalysisHealthMessage.textContent = recurring.length
      ? `${recurring.length} fonte(s) recorrente(s) dão previsibilidade. A média mensal do período é ${money.format(average)}.`
      : `A média mensal é ${money.format(average)}. Identifique receitas recorrentes para tornar o planejamento mais seguro.`;
  }
  els.incomeMonthlyChart.innerHTML = monthly.length
    ? monthly.map((item) => `<article class="income-month-bar"><strong>${money.format(item.value)}</strong><i style="height:${Math.max((item.value / maxMonthly) * 100, 2)}%"></i><span>${formatMonthCode(item.month)}</span></article>`).join("")
    : `<div class="empty">Nenhuma receita monetária no período selecionado.</div>`;
  els.incomeSourceList.innerHTML = sources.length
    ? sources.slice(0, 10).map((item, index) => `<article class="income-source-item"><span class="income-rank">${index + 1}</span><div><strong>${escapeHtml(item.source)}</strong><small>${item.count} lançamento(s) · ${item.months.size} mês(es)</small></div><b>${money.format(item.value)}</b><div class="income-source-track"><i style="width:${Math.max((item.value / maxSource) * 100, 3)}%"></i></div></article>`).join("")
    : `<div class="empty">Cadastre receitas para descobrir suas principais fontes.</div>`;
  els.incomeRecurringList.innerHTML = recurring.length
    ? recurring.slice(0, 8).map((item) => `<article class="income-recurring-item"><span>🔁</span><div><strong>${escapeHtml(item.source)}</strong><small>Presente em ${item.months.size} meses · média ${money.format(item.value / item.months.size)}</small></div><b>${money.format(item.value)}</b></article>`).join("")
    : `<div class="empty">Ainda não há receitas repetidas em meses diferentes.</div>`;
}

function openingAlertData() {
  const horizonIso = addDays(todayIso, 3);
  const relevant = state.transactions.filter((item) => item.type === "expense" && item.status === "pending" && !isVerocardTransaction(item) && item.date <= horizonIso);
  const overdue = relevant.filter((item) => item.date < todayIso);
  const todayItems = relevant.filter((item) => item.date === todayIso);
  const upcoming = relevant.filter((item) => item.date > todayIso);
  const total = relevant.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const health = calculateCurrentMonthHealth(state.transactions, `${currentMonth}-01`, todayIso, lastDayOfMonth(currentMonth));
  return {
    relevant,
    overdue,
    todayItems,
    upcoming,
    overdueCount: groupPayableItems(overdue).length,
    todayCount: groupPayableItems(todayItems).length,
    upcomingCount: groupPayableItems(upcoming).length,
    total,
    health,
  };
}

function showOpeningFinancialAlert() {
  if (!els.openingAlertDialog || sessionStorage.getItem(`meg-opening-alert-${todayIso}`)) return;
  const data = openingAlertData();
  if (!data.relevant.length && data.health.projectedClosing >= 0) return;
  sessionStorage.setItem(`meg-opening-alert-${todayIso}`, "1");
  const tone = data.overdueCount || data.health.projectedClosing < 0 ? "risk" : "attention";
  els.openingAlertDialog.classList.remove("risk", "attention");
  els.openingAlertDialog.classList.add(tone);
  els.openingAlertTitle.textContent = data.overdueCount
    ? `🚨 ${data.overdueCount} conta(s)/fatura(s) vencida(s)`
    : data.todayCount ? `⏰ ${data.todayCount} conta(s)/fatura(s) vencem hoje` : "📅 Próximos vencimentos";
  const grouped = groupPayableItems(data.relevant).slice(0, 5);
  els.openingAlertBody.innerHTML = `
    <div class="opening-alert-summary">
      <article><span>Vencidas</span><strong>${data.overdueCount}</strong></article>
      <article><span>Hoje</span><strong>${data.todayCount}</strong></article>
      <article><span>Próximos 3 dias</span><strong>${data.upcomingCount}</strong></article>
      <article><span>Total urgente</span><strong>${money.format(data.total)}</strong></article>
    </div>
    ${data.health.projectedClosing < 0 ? `<div class="opening-alert-critical">⚠️ Mesmo usando o saldo atual, faltam <strong>${money.format(Math.abs(data.health.projectedClosing))}</strong> para fechar ${formatMonthCode(currentMonth)}. Priorize inserir a receita faltante.</div>` : ""}
    <div class="opening-alert-list">${grouped.length ? grouped.map((group) => {
      const itemTone = group.date < todayIso ? "critical" : group.date === todayIso ? "warning" : "";
      return `<article class="opening-alert-item ${itemTone}"><span aria-hidden="true">${group.date < todayIso ? "🚨" : group.date === todayIso ? "⏰" : "📅"}</span><span><strong>${escapeHtml(payableGroupLabel(group))}</strong><small>${formatDate(group.date)} · ${group.items.length > 1 ? `${group.items.length} lançamentos agrupados` : group.payment}</small></span><b>${money.format(payableGroupTotal(group))}</b></article>`;
    }).join("") : `<div class="empty">Nenhuma conta vence nos próximos três dias.</div>`}</div>`;
  els.openingAlertDialog.showModal();
}

function cardForPayment(method) {
  return (state.catalogs?.cards || []).find((card) => normalizeText(card.paymentMethod) === normalizeText(method)) || null;
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
  const nextPendingSummary = summarizeDueDate(situation.allPendingItems);
  els.pendingLaunchedTrend.textContent = nextPendingSummary
    ? `${groupPayableItems(situation.allPendingItems).length} conta(s)/fatura(s) · próxima: ${formatDate(nextPendingSummary.date)} · ${nextPendingSummary.description}`
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

function renderDashboardPayables() {
  const pending = selectedTransactions()
    .filter((item) => item.type === "expense" && item.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description, "pt-BR"));
  const groups = groupPayableItems(pending);
  payableGroupCache = new Map(groups.map((group, index) => [`payable-${index}`, group]));
  const total = pending.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  els.dashboardPayableSummary.textContent = `${groups.length} conta(s)/fatura(s) · ${pending.length} lançamento(s) · ${money.format(total)} em aberto`;
  els.dashboardPayables.innerHTML = groups.length
    ? groups.map((group, index) => {
        const totalGroup = payableGroupTotal(group);
        const overdue = group.date < todayIso;
        const title = group.isCard ? `Fatura ${payableGroupLabel(group)}` : payableGroupLabel(group);
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
  const pendingSoonItems = monthExpenses
    .filter((item) => item.status === "pending" && item.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pendingSoon = summarizeDueDate(pendingSoonItems);
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
      text: pendingSoon ? `${pendingSoon.description} · ${money.format(pendingSoon.total)}` : "Nada futuro pendente",
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
  const summary = calculateFinancialSummary(state.transactions, start, end);
  const lowPoint = points.reduce((lowest, point) => (!lowest || point.value < lowest.value ? point : lowest), null);
  return { openingBalance, movements, points, totals, summary, lowPoint, start, end };
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
  const closingBalance = data.summary.projectedBalance;
  const availableResources = data.summary.availableIncome;
  const paidExpenses = data.summary.paidExpense;
  const pendingExpenses = data.summary.pendingExpense;
  const operatingResult = data.summary.operatingResult;
  const coverage = data.totals.expense ? (availableResources / data.totals.expense) * 100 : 100;
  const negativePoints = data.points.filter((point) => point.value < 0);
  const tone = closingBalance < 0 || negativePoints.length ? "risk" : coverage < 110 ? "attention" : "healthy";
  els.cashflowDecisionHero.classList.remove("risk", "attention", "healthy");
  els.cashflowDecisionHero.classList.add(tone);
  els.cashflowClosingMetric.textContent = money.format(closingBalance);
  els.cashflowCoverageTrend.textContent = `${coverage.toFixed(0)}% das saídas cobertas pelos recursos do período`;
  els.cashflowOperatingCard.classList.remove("healthy", "risk", "attention");
  els.cashflowOperatingCard.classList.add(operatingResult < 0 ? "risk" : operatingResult === 0 ? "attention" : "healthy");
  els.cashflowOperatingIcon.textContent = operatingResult < 0 ? "📉" : operatingResult === 0 ? "➖" : "📈";
  els.cashflowAvailableMetric.textContent = money.format(operatingResult);
  els.cashflowAvailableTrend.textContent = operatingResult < 0
    ? `As despesas superam as receitas em ${money.format(Math.abs(operatingResult))}.`
    : `As receitas superam as despesas em ${money.format(operatingResult)}.`;
  els.cashflowPendingMetric.textContent = money.format(pendingExpenses);
  els.cashflowPendingTrend.textContent = `${data.movements.filter((item) => item.type === "expense" && !(item.status === "paid" || normalizeText(item.situation) === "PAGO")).length} conta(s) ainda aguardam pagamento.`;
  els.cashflowSafeCard.classList.remove("healthy", "risk", "attention");
  els.cashflowSafeCard.classList.add(closingBalance < 0 ? "risk" : coverage < 110 ? "attention" : "healthy");
  els.cashflowSafeIcon.textContent = closingBalance < 0 ? "🚨" : coverage < 110 ? "⚠️" : "✅";
  els.cashflowSafeLabel.textContent = closingBalance < 0 ? "Falta para pagar tudo" : "Sobra depois de pagar tudo";
  els.cashflowSafeMetric.textContent = money.format(Math.abs(closingBalance));
  els.cashflowSafeTrend.textContent = closingBalance < 0
    ? "O caixa atual não cobre todas as obrigações previstas."
    : "Margem livre estimada depois de cumprir todas as obrigações.";
  els.cashflowEquationOpening.textContent = money.format(data.openingBalance);
  els.cashflowEquationIncome.textContent = money.format(data.totals.income);
  els.cashflowEquationPaid.textContent = money.format(paidExpenses);
  els.cashflowEquationPending.textContent = money.format(pendingExpenses);
  els.cashflowEquationClosing.textContent = money.format(closingBalance);
  els.cashflowEquationResult.classList.toggle("risk", closingBalance < 0);
  els.cashflowEquationResult.classList.toggle("healthy", closingBalance >= 0);
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
  renderCashflowList(data);
}

function renderCashflowList(data) {
  const isLivePeriod = data.start <= todayIso && data.end >= todayIso;
  const isFuturePeriod = data.start > todayIso;
  const isPaid = (item) => item.status === "paid" || normalizeText(item.situation) === "PAGO";
  const candidates = data.movements.filter((item) => {
    if (!isLivePeriod) return true;
    if (item.type === "expense") return !isPaid(item);
    return item.date >= todayIso;
  });
  const futureIncomeCount = candidates.filter((item) => item.type === "income").length;
  const pendingCount = candidates.filter((item) => item.type === "expense").length;
  els.cashflowAgendaTitle.textContent = isLivePeriod || isFuturePeriod ? "Próximos impactos no seu saldo" : "Movimentos ocorridos no período";
  els.cashflowAgendaSummary.textContent = isLivePeriod
    ? `${pendingCount} conta(s) em aberto · ${futureIncomeCount} entrada(s) futura(s)`
    : `${candidates.length} movimento(s) agrupados por data`;

  const dates = new Map();
  candidates.forEach((item) => {
    if (!dates.has(item.date)) dates.set(item.date, []);
    dates.get(item.date).push(item);
  });
  const pointByDate = new Map(data.points.map((point) => [point.date, point]));
  const dayCards = [...dates.entries()].sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).slice(0, 12);

  els.cashflowList.innerHTML = dayCards.length
    ? dayCards.map(([date, items]) => {
        const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.incomeAmount || item.amount || 0), 0);
        const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
        const impact = income - expense;
        const balanceAfter = pointByDate.get(date)?.value ?? data.openingBalance;
        const overdue = isLivePeriod && date < todayIso;
        const daysUntil = date >= todayIso ? Math.max(daysBetween(todayIso, date) - 1, 0) : -1;
        const timing = !isLivePeriod && !isFuturePeriod
          ? "REALIZADO"
          : overdue
            ? "VENCIDO"
            : daysUntil === 0
              ? "HOJE"
              : daysUntil === 1
                ? "AMANHÃ"
                : daysUntil <= 7
                  ? `EM ${daysUntil} DIAS`
                  : "PROGRAMADO";
        const summarized = new Map();
        items.forEach((item) => {
          const payment = item.paymentMethod || item.account || "Não informado";
          const card = isCreditCardExpense(item);
          const key = card ? `card:${normalizeText(payment)}` : `item:${item.id}`;
          if (!summarized.has(key)) summarized.set(key, { card, payment, items: [], total: 0, type: item.type });
          const row = summarized.get(key);
          row.items.push(item);
          row.total += Number(item.type === "income" ? item.incomeAmount || item.amount || 0 : item.expenseAmount || item.amount || 0);
        });
        const rows = [...summarized.values()];
        const visibleRows = rows.slice(0, 5).map((row) => {
          const item = row.items[0];
          const title = row.card ? `Fatura ${row.payment}` : item.description;
          const detail = row.card
            ? `${row.items.length} lançamento(s) agrupado(s)`
            : `${item.paymentMethod || item.account || "Não informado"} · ${item.group || item.category || "Sem categoria"}`;
          const rowTag = row.card ? "div" : "button";
          const rowAction = row.card ? "" : `type="button" data-edit="${escapeHtml(item.id)}" title="Editar lançamento"`;
          return `<${rowTag} class="cashflow-movement-row ${row.type}" ${rowAction}>
            <span class="cashflow-movement-icon" aria-hidden="true">${row.type === "income" ? "↗" : row.card ? "💳" : "↘"}</span>
            <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span>
            <strong class="amount ${row.type === "income" ? "positive" : "negative"}">${row.type === "income" ? "+" : "−"}${money.format(Math.abs(row.total))}</strong>
          </${rowTag}>`;
        }).join("");
        const hiddenRows = rows.length > 5 ? `<div class="cashflow-more">+ ${rows.length - 5} movimento(s) resumido(s) nesta data</div>` : "";
        return `<article class="cashflow-day-card ${overdue ? "overdue" : ""} ${balanceAfter < 0 ? "negative-balance" : ""}">
          <header class="cashflow-day-header">
            <div class="cashflow-day-date"><span>${escapeHtml(weekdayShort(date))}</span><strong>${formatDate(date)}</strong><small>${timing}</small></div>
            <div class="cashflow-day-totals">
              <span>Entradas<strong class="positive">+${money.format(income)}</strong></span>
              <span>Saídas<strong class="negative">−${money.format(expense)}</strong></span>
              <span>Impacto do dia<strong class="${impact >= 0 ? "positive" : "negative"}">${impact >= 0 ? "+" : "−"}${money.format(Math.abs(impact))}</strong></span>
            </div>
          </header>
          <div class="cashflow-day-movements">${visibleRows}${hiddenRows}</div>
          <footer><span>Saldo projetado após esta data</span><strong class="${balanceAfter >= 0 ? "positive" : "negative"}">${money.format(balanceAfter)}</strong></footer>
        </article>`;
      }).join("")
    : `<div class="empty cashflow-empty"><strong>✅ Nenhum movimento futuro neste período</strong><span>Não há entradas previstas nem contas pendentes para alterar o seu saldo.</span></div>`;
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
  const monetaryItems = paymentItems.filter((item) => !isVerocardTransaction(item));
  const expenses = monetaryItems.filter((item) => item.type === "expense");
  const analysisUniverse = filterAnalyticsPayments(state.transactions);
  const { start, end } = dateRangeForSelectedPeriod();
  const summary = calculateFinancialSummary(analysisUniverse, start, end);
  const totals = { income: summary.availableIncome, expense: summary.expense };
  const monthCount = selectedPeriodMonthCount(periodItems);
  const groups = groupExpenseRows(monetaryItems);
  const evolution = modalityEvolutionRows(monetaryItems);
  const closingBalances = monthlyClosingBalanceRows();
  const topGroup = groups[0];
  const previousTotals = totalsFor(filterAnalyticsPayments(previousPeriodTransactions()).filter((item) => !isVerocardTransaction(item)));
  const previousExpense = previousTotals.expense || 0;
  const variation = previousExpense ? ((summary.expense - previousExpense) / previousExpense) * 100 : 0;
  const top3 = groups.slice(0, 3).reduce((sum, item) => sum + item.value, 0);
  const concentration = summary.expense ? (top3 / summary.expense) * 100 : 0;
  const result = summary.closingBalance;
  const projectedResult = summary.projectedBalance;
  const savingsRate = summary.availableIncome ? (projectedResult / summary.availableIncome) * 100 : 0;
  const paidExpense = summary.paidExpense;
  const pendingExpenses = expenses.filter((item) => item.status === "pending");
  const pendingExpense = summary.pendingExpense;
  const overdueExpenses = pendingExpenses.filter((item) => item.date < todayIso);
  const overdueValue = overdueExpenses.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const coverage = summary.expense ? (summary.availableIncome / summary.expense) * 100 : summary.availableIncome ? 100 : 0;
  const currentMonthEnd = lastDayOfMonth(currentMonth);
  const historicalProjection = calculateHistoricalProjection(state.transactions, currentMonthEnd);
  const allHistoricalItems = historicalProjection.allItems;
  const historicalTotals = historicalProjection;
  const historicalBalance = historicalProjection.balance;
  const monthHealth = currentMonthFinancialHealth();

  const paymentLabel = analyticsFilters.payments.length ? `${analyticsFilters.payments.length} modalidade(s)` : "todas as modalidades";
  els.analyticsPeriodLabel.textContent = `${periodLabel()} · modalidades: ${paymentLabel}`;
  els.avgExpenseMetric.textContent = money.format(summary.expense / monthCount);
  els.avgExpenseTrend.textContent = `${monthCount} mes(es) no periodo`;
  els.topGroupMetric.textContent = topGroup ? topGroup.group : "-";
  els.topGroupTrend.textContent = topGroup ? money.format(topGroup.value) : money.format(0);
  els.variationMetric.textContent = previousExpense ? `${variation > 0 ? "+" : ""}${variation.toFixed(1)}%` : "Sem base";
  els.variationTrend.textContent = previousExpense ? `Periodo anterior: ${money.format(previousExpense)}` : "Sem periodo anterior comparavel";
  els.concentrationMetric.textContent = `${concentration.toFixed(0)}%`;
  els.analyticsIncomeMetric.textContent = money.format(summary.income);
  els.analyticsIncomeNote.textContent = `${monetaryItems.filter((item) => item.type === "income").length} entrada(s) monetária(s) no período`;
  els.analyticsExpenseMetric.textContent = money.format(summary.expense);
  els.analyticsExpenseNote.textContent = `${money.format(paidExpense)} pagas · ${money.format(pendingExpense)} pendentes`;
  els.analyticsPendingMetric.textContent = money.format(pendingExpense);
  els.analyticsPendingNote.textContent = overdueExpenses.length ? `${overdueExpenses.length} vencida(s), somando ${money.format(overdueValue)}` : `${pendingExpenses.length} compromisso(s), nenhum vencido`;
  els.analyticsCoverageMetric.textContent = `${coverage.toFixed(0)}%`;
  els.analyticsCoverageNote.textContent = projectedResult >= 0 ? `Saldo projetado de ${money.format(projectedResult)}` : `Faltam ${money.format(Math.abs(projectedResult))} para cobrir tudo`;
  els.analyticsCoverageCard.classList.toggle("risk", projectedResult < 0);
  els.analyticsCoverageCard.classList.toggle("healthy", projectedResult >= 0);
  els.analyticsCalculationPeriod.textContent = `${formatDate(start)} a ${formatDate(end)}`;
  els.analyticsOpeningMetric.textContent = money.format(summary.openingBalance);
  els.analyticsPeriodIncomeMetric.textContent = money.format(summary.income);
  els.analyticsPaidExpenseMetric.textContent = money.format(summary.expense);
  els.analyticsAvailableMetric.textContent = money.format(summary.projectedBalance);
  els.analyticsAvailableCard.classList.toggle("risk", summary.projectedBalance < 0);
  els.analyticsAvailableCard.classList.toggle("healthy", summary.projectedBalance >= 0);
  els.analyticsProjectedMetric.textContent = money.format(summary.closingBalance);
  els.analyticsProjectionLine.classList.toggle("risk", summary.closingBalance < 0);
  els.analyticsProjectionLine.classList.toggle("healthy", summary.closingBalance >= 0);
  els.analyticsProjectedNote.textContent = `${money.format(summary.paidExpense)} já pagos · ${money.format(summary.pendingExpense)} ainda reservados`;
  els.analyticsTicketMetric.textContent = money.format(summary.ticketBalance);
  els.analyticsTicketNote.textContent = `${money.format(summary.ticketIncome)} em créditos − ${money.format(summary.ticketExpense)} em gastos`;
  els.historicalFirstDate.textContent = allHistoricalItems.length ? formatDate(allHistoricalItems[0].date) : "—";
  els.historicalIncomeMetric.textContent = money.format(historicalTotals.income);
  els.historicalExpenseMetric.textContent = money.format(historicalTotals.expense);
  els.historicalBalanceMetric.textContent = money.format(historicalBalance);
  els.historicalBalanceCard.classList.toggle("risk", historicalBalance < 0);
  els.historicalBalanceCard.classList.toggle("healthy", historicalBalance >= 0);
  els.historicalPeriodLabel.textContent = allHistoricalItems.length
    ? `${formatDate(allHistoricalItems[0].date)} até ${formatDate(currentMonthEnd)} · inclui contas pagas e pendentes do mês atual`
    : "Sem lançamentos históricos até o fechamento do mês atual";

  const monthMarginRate = monthHealth.availableToday > 0 ? (monthHealth.projectedClosing / monthHealth.availableToday) * 100 : 0;
  const analyticsTone = monthHealth.projectedClosing < 0 ? "risk" : monthMarginRate >= 20 ? "healthy" : "attention";
  els.analyticsDecisionHero.classList.remove("risk", "attention", "healthy");
  els.analyticsDecisionHero.classList.add(analyticsTone);
  els.currentHealthAvailableMetric.textContent = money.format(monthHealth.availableToday);
  els.currentHealthPendingMetric.textContent = money.format(monthHealth.pendingValue);
  els.currentHealthClosingMetric.textContent = money.format(monthHealth.projectedClosing);
  els.analyticsSavingsLabel.textContent = monthHealth.projectedClosing < 0 ? "Falta para fechar o mês" : "Sobra após quitar o mês";
  els.analyticsSavingsMetric.textContent = money.format(Math.abs(monthHealth.projectedClosing));
  els.analyticsSavingsTrend.textContent = `${monthHealth.pendingItems.length} conta(s) pendente(s) em ${formatMonthCode(currentMonth)}`;
  const overdueWarning = monthHealth.overdueItems.length ? ` Há ${monthHealth.overdueItems.length} conta(s) vencida(s).` : "";
  const nextDueWarning = monthHealth.nextDue
    ? ` Próximo vencimento: ${monthHealth.nextDue.description || "conta"} em ${formatDate(monthHealth.nextDue.date)} (${money.format(monthHealth.nextDue.total)}).`
    : "";
  if (monthHealth.projectedClosing < 0) {
    els.analyticsHealthTitle.textContent = `🔴 Saúde financeira em alerta: faltam ${money.format(Math.abs(monthHealth.projectedClosing))}`;
    els.analyticsHealthMessage.textContent = `Você tem ${money.format(monthHealth.availableToday)} disponíveis hoje, mas ainda precisa pagar ${money.format(monthHealth.pendingValue)} neste mês. Mesmo usando todo o saldo, o caixa fecha negativo.${overdueWarning}${nextDueWarning}`;
  } else if (monthMarginRate >= 20) {
    els.analyticsHealthTitle.textContent = `🟢 O mês fecha com sobra real de ${money.format(monthHealth.projectedClosing)}`;
    els.analyticsHealthMessage.textContent = `O saldo de hoje cobre todas as ${monthHealth.pendingItems.length} contas ainda abertas e preserva ${monthMarginRate.toFixed(1)}% de margem. Essa é a sobra efetiva depois de quitar o mês.${nextDueWarning}`;
  } else {
    els.analyticsHealthTitle.textContent = `🟡 O mês fecha, mas a margem é curta: ${money.format(monthHealth.projectedClosing)}`;
    els.analyticsHealthMessage.textContent = `O saldo atual cobre as contas pendentes, porém resta apenas ${monthMarginRate.toFixed(1)}% de margem. Evite novos compromissos até concluir os pagamentos.${overdueWarning}${nextDueWarning}`;
  }

  renderModalityEvolutionChart(evolution);
  renderBalanceClosingChart(closingBalances);
  renderGroupBarChart(groups.slice(0, 10));
  renderExpenseRanking(groups, summary.expense);
  renderDecisionInsights({ monthHealth, groups, totals, variation, previousExpense, concentration, expenses, result: projectedResult, coverage, pendingExpense, overdueExpenses, overdueValue, savingsRate });
}

let balanceChartPoints = [];

function prepareScrollableCanvas(canvas, itemCount, itemWidth, sidePadding = 96) {
  const scroller = canvas.closest(".chart-scroll");
  const viewportWidth = scroller?.clientWidth || canvas.parentElement?.clientWidth || 320;
  const desiredWidth = Math.max(viewportWidth, itemCount * itemWidth + sidePadding);
  canvas.style.setProperty("--chart-width", `${Math.ceil(desiredWidth)}px`);
  const content = canvas.closest(".chart-scroll-content");
  if (content) content.style.width = `${Math.ceil(desiredWidth)}px`;
}

function renderModalityEvolutionChart(data) {
  const canvas = els.monthlyTrendChart;
  prepareScrollableCanvas(canvas, data.length, 70, 100);
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
  prepareScrollableCanvas(canvas, data.length, 82, 120);
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

function renderDecisionInsights({ monthHealth, groups, totals, variation, previousExpense, concentration, expenses, result, coverage, pendingExpense, overdueExpenses, overdueValue, savingsRate }) {
  const insights = [];
  const top = groups[0];
  if (monthHealth.projectedClosing < 0) {
    insights.push({
      tone: "risk",
      title: `1. Prioridade máxima: faltam ${money.format(Math.abs(monthHealth.projectedClosing))} para fechar ${formatMonthCode(currentMonth)}`,
      text: `O caixa disponível hoje é ${money.format(monthHealth.availableToday)}, enquanto as contas restantes somam ${money.format(monthHealth.pendingValue)}. Regularize primeiro vencidas e essenciais; depois renegocie ou adie compromissos até eliminar o déficit.`,
    });
  } else if (monthHealth.availableToday > 0 && (monthHealth.projectedClosing / monthHealth.availableToday) < .2) {
    insights.push({
      tone: "attention",
      title: "1. O mês fecha, mas sem margem de segurança",
      text: `Depois das contas ainda abertas restam apenas ${money.format(monthHealth.projectedClosing)}. Não trate esse valor como disponível para novos gastos antes de concluir o mês.`,
    });
  } else {
    insights.push({
      tone: "",
      title: "1. As contas do mês estão cobertas",
      text: `Após reservar ${money.format(monthHealth.pendingValue)} para tudo que ainda falta pagar, permanecem ${money.format(monthHealth.projectedClosing)}. Preserve essa margem até o fechamento.`,
    });
  }
  if (overdueExpenses.length) {
    insights.push({
      tone: "risk",
      title: `2. Regularize ${overdueExpenses.length} conta(s) vencida(s)`,
      text: `O atraso soma ${money.format(overdueValue)}. Quite primeiro as contas com juros, serviços essenciais ou risco de bloqueio.`,
    });
  } else if (pendingExpense > 0) {
    insights.push({
      tone: "attention",
      title: "2. Reserve o valor das contas pendentes",
      text: `${money.format(pendingExpense)} ainda sairão do caixa. Trate esse valor como comprometido, mesmo antes do pagamento.`,
    });
  }
  if (top && totals.expense) {
    insights.push({
      tone: "attention",
      title: `${insights.length + 1}. Revise ${top.group}`,
      text: `É o maior grupo do período: ${money.format(top.value)}, ou ${((top.value / totals.expense) * 100).toFixed(1)}% das despesas. Compare os itens antes de cortar despesas menores.`,
    });
  }
  if (previousExpense && variation > 10) {
    insights.push({
      tone: "risk",
      title: `${insights.length + 1}. Despesas cresceram no comparativo`,
      text: `A alta foi de ${variation.toFixed(1)}%: de ${money.format(previousExpense)} para ${money.format(totals.expense)}. Confira quais grupos explicam o aumento.`,
    });
  } else if (previousExpense && variation < -10) {
    insights.push({
      tone: "",
      title: `${insights.length + 1}. Economia confirmada no comparativo`,
      text: `As despesas caíram ${Math.abs(variation).toFixed(1)}% contra o período anterior. Identifique o que mudou para repetir o resultado.`,
    });
  }
  if (concentration >= 60) {
    insights.push({
      tone: "attention",
      title: `${insights.length + 1}. Poucos grupos controlam o orçamento`,
      text: `Os três maiores grupos concentram ${concentration.toFixed(0)}% das despesas. Uma redução pequena neles tem impacto maior que vários cortes pequenos.`,
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
  const nextDate = pending[0]?.date;
  const nextItems = nextDate ? pending.filter((item) => item.date === nextDate) : [];
  const nextGroups = groupPayableItems(nextItems);
  const nextTotal = nextItems.reduce((sum, item) => sum + Number(item.expenseAmount || item.amount || 0), 0);
  const nextLabels = [...new Set(nextGroups.map(payableGroupLabel))];
  const nextDescription = nextLabels.length > 3
    ? `${nextLabels.slice(0, 3).join(", ")} +${nextLabels.length - 3}`
    : nextLabels.join(", ");
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
  els.monthPaidCount.textContent = String(groupPayableItems(paid).length);
  els.monthPaidValue.textContent = money.format(paidValue);
  els.monthPendingCount.textContent = String(groupPayableItems(pending).length);
  els.monthPendingValue.textContent = money.format(pendingValue);
  els.monthNextDue.textContent = nextDate ? formatDate(nextDate) : "—";
  els.monthNextDueDescription.textContent = nextDate ? `${money.format(nextTotal)} · ${nextDescription}` : "Nenhuma conta pendente";
}

function replaceState(nextState) {
  state = normalizeState(nextState || { transactions: [], budgets: {} });
  originalTransactionsById = new Map(state.transactions.map((item) => [item.id, item]));
  analyticsDefaultPeriodApplied = false;
  render();
  return state.transactions.length;
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
  if (!years.includes(selectedPeriod.year)) selectedPeriod.year = years[0] || todayIso.slice(0, 4);
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
  const filter = document.querySelector(`[data-multi-filter="${key}"]`);
  if (!filter) return;
  const selected = Array.isArray(transactionColumnFilters[key]) ? transactionColumnFilters[key] : [];
  const search = normalizeText(filter.querySelector("[data-multi-filter-search]")?.value || "");
  const labels = key === "type" ? { income: "Receita", expense: "Despesa" } : {};
  const options = (key === "type" ? ["income", "expense"] : values)
    .filter((value) => !search || normalizeText(labels[value] || value).includes(search));
  const summary = filter.querySelector("summary");
  const emptyLabel = ["expenseClass", "paymentMethod", "situation", "modality"].includes(key) ? "Todas" : "Todos";
  summary.textContent = selected.length === 0 ? emptyLabel : selected.length === 1 ? (labels[selected[0]] || selected[0]) : `${selected.length} selecionados`;
  summary.classList.toggle("has-filter", selected.length > 0);
  filter.querySelector("[data-multi-filter-options]").innerHTML = options.length
    ? options.map((value) => `<label><input type="checkbox" data-multi-filter-option value="${escapeHtml(value)}" ${selected.includes(value) ? "checked" : ""} /><span>${escapeHtml(labels[value] || value)}</span></label>`).join("")
    : '<small class="excel-filter-empty">Nenhum item encontrado.</small>';
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
  const exactMatches = (key, value) => {
    const selected = transactionColumnFilters[key];
    if (!Array.isArray(selected) || selected.length === 0) return true;
    return selected.some((candidate) => normalizeText(value) === normalizeText(candidate));
  };
  if (transactionColumnFilters.date && item.date !== transactionColumnFilters.date) return false;
  if (transactionColumnFilters.purchaseDate && item.purchaseDate !== transactionColumnFilters.purchaseDate) return false;
  if (!exactMatches("type", item.type)) return false;
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

function renderTransactionsFilterSummary(items) {
  const incomeItems = items.filter((item) => item.type === "income");
  const expenseItems = items.filter((item) => item.type === "expense");
  const income = incomeItems.reduce((total, item) => total + Number(item.incomeAmount || item.amount || 0), 0);
  const expense = expenseItems.reduce((total, item) => total + Number(item.expenseAmount || item.amount || 0), 0);
  const result = income - expense;
  const plural = (count) => `${count} ${count === 1 ? "lançamento" : "lançamentos"}`;

  els.transactionsFilteredIncome.textContent = money.format(income);
  els.transactionsFilteredIncomeCount.textContent = plural(incomeItems.length);
  els.transactionsFilteredExpense.textContent = money.format(expense);
  els.transactionsFilteredExpenseCount.textContent = plural(expenseItems.length);
  els.transactionsFilteredResult.textContent = money.format(result);
  els.transactionsFilteredResultStatus.textContent = result > 0
    ? "Sobra no recorte selecionado"
    : result < 0
      ? "Déficit no recorte selecionado"
      : items.length
        ? "Recorte equilibrado"
        : "Nenhum lançamento encontrado";
  els.transactionsFilteredResultCard.classList.toggle("is-positive", result > 0);
  els.transactionsFilteredResultCard.classList.toggle("is-negative", result < 0);
}

function renderTransactions() {
  renderColumnFilterOptions();
  const query = els.searchInput.value.trim().toLowerCase();
  const type = els.typeFilter.value;
  const rows = selectedTransactions()
    .filter((item) => (type === "all" ? true : item.type === type))
    .filter((item) => `${item.description} ${item.category} ${item.account}`.toLowerCase().includes(query))
    .filter(matchesColumnFilters);
  renderTransactionsFilterSummary(rows);
  sortTransactions(rows, els.transactionSortFilter?.value || "date_desc");

  els.transactionRows.innerHTML = rows.length
    ? rows
        .map(
          (item) => `
        <tr class="transaction-row ${item.type === "income" ? "transaction-income-row" : "transaction-expense-row"}">
          <td class="transaction-date-cell"><span class="transaction-date-value">
            <button class="transaction-edit-button" type="button" data-edit="${item.id}" aria-label="Editar ${escapeHtml(item.description)}" title="Editar lançamento">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 17.2 9.8-9.8 2.8 2.8L6.8 20H4v-2.8ZM18.8 8 16 5.2l1.4-1.4a2 2 0 0 1 2.8 2.8L18.8 8Z"/></svg>
            </button>
            <span>${formatDate(item.date)}</span>
          </span></td>
          <td>${item.purchaseDate ? formatDate(item.purchaseDate) : ""}</td>
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
          <td class="actions-col"><span class="transaction-row-status" aria-hidden="true">${item.type === "income" ? "↗" : "↘"}</span></td>
        </tr>
      `,
        )
        .join("")
    : `<tr><td colspan="14" class="empty">Nenhum lancamento encontrado.</td></tr>`;
}

function cardBrandClass(brand) {
  const value = normalizeText(brand).replace(/[^A-Z]/g, "").toLowerCase();
  return ["visa", "mastercard", "elo", "amex", "hipercard"].includes(value) ? value : "other";
}

function cardBrandLabel(brand) {
  const labels = { VISA: "VISA", MASTERCARD: "Mastercard", ELO: "elo", AMEX: "AMERICAN EXPRESS", HIPERCARD: "Hipercard", OUTRO: "MEG CARD" };
  return labels[normalizeText(brand)] || "MEG CARD";
}

function renderCreditCards() {
  const registeredCards = state.catalogs?.cards || [];
  const paymentNames = [...new Set([
    ...registeredCards.map((card) => card.paymentMethod),
    ...state.transactions.filter(isCreditCardExpense).map((item) => item.paymentMethod || item.account).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  els.creditCardFilter.innerHTML = `<option value="all">Todos os cartões</option>${paymentNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  if (paymentNames.includes(creditCardFilter)) els.creditCardFilter.value = creditCardFilter;
  else creditCardFilter = "all";
  els.creditCardStatusFilter.value = creditCardStatusFilter;
  els.creditCardSearchInput.value = creditCardSearch;

  const portfolio = calculateCreditCardPortfolio(state.transactions, selectedTransactions(), registeredCards, {
    card: creditCardFilter === "all" ? "" : creditCardFilter,
    status: creditCardStatusFilter,
    search: creditCardSearch,
  });
  const usage = Math.round(portfolio.usagePercent);
  const healthTone = usage >= 90 ? "risk" : usage >= 70 ? "attention" : "healthy";
  els.creditCardsPeriodLabel.textContent = `${periodLabel()} · ${portfolio.items.length} compra(s) encontrada(s)`;
  els.creditCardCommandCenter.classList.remove("risk", "attention", "healthy");
  els.creditCardCommandCenter.classList.add(healthTone);
  els.creditCardHealthTitle.textContent = !portfolio.cards.length
    ? "Cadastre seus cartões para acompanhar os limites"
    : usage >= 90 ? "Limite em zona crítica" : usage >= 70 ? "Uso do limite exige atenção" : "Limites sob controle";
  els.creditCardHealthMessage.textContent = !portfolio.cards.length
    ? "As compras de crédito já podem ser vistas; complete o cadastro para calcular o limite disponível."
    : usage >= 90 ? "Evite novas compras até reduzir as faturas em aberto." : usage >= 70 ? "O limite disponível está diminuindo. Revise os maiores gastos antes de comprar." : "Você ainda possui margem disponível nos cartões cadastrados.";
  els.creditLimitRing.style.setProperty("--credit-progress", `${Math.min(usage, 100) * 3.6}deg`);
  els.creditUsagePercent.textContent = `${usage}%`;
  els.creditTotalLimitMetric.textContent = money.format(portfolio.totalLimit);
  els.creditUsedLimitMetric.textContent = money.format(portfolio.usedLimit);
  els.creditAvailableLimitMetric.textContent = money.format(portfolio.availableLimit);
  els.creditPeriodTotalMetric.textContent = money.format(portfolio.periodTotal);

  els.creditCardWallet.innerHTML = portfolio.cards.length ? portfolio.cards.map((card) => {
    const selected = creditCardFilter !== "all" && normalizeText(creditCardFilter) === normalizeText(card.paymentMethod);
    const usagePercent = Math.round(card.usagePercent);
    return `<button type="button" class="credit-card-visual brand-${cardBrandClass(card.brand)} ${selected ? "selected" : ""}" data-credit-card-select="${escapeHtml(card.paymentMethod)}">
      <span class="credit-card-glow" aria-hidden="true"></span>
      <span class="credit-card-brand">${escapeHtml(cardBrandLabel(card.brand))}</span>
      <span class="credit-card-chip" aria-hidden="true"></span>
      <span class="credit-card-name">${escapeHtml(card.paymentMethod)}</span>
      <span class="credit-card-cycle">Fecha dia ${card.closingDay || "—"} · vence dia ${card.dueDay || "—"}</span>
      <span class="credit-card-usage"><i style="width:${Math.min(usagePercent, 100)}%"></i></span>
      <span class="credit-card-values"><small>Utilizado <b>${money.format(card.used)}</b></small><small>Disponível <b>${money.format(card.available)}</b></small></span>
    </button>`;
  }).join("") : `<div class="empty credit-card-empty">Nenhum cartão identificado. <button class="button" type="button" data-view-link="catalogs">Cadastrar cartão</button></div>`;

  const topExpenses = [...portfolio.items].sort((a, b) => Number(b.expenseAmount || b.amount || 0) - Number(a.expenseAmount || a.amount || 0)).slice(0, 6);
  els.creditTopExpensesNote.textContent = `${money.format(portfolio.periodTotal)} no período`;
  els.creditTopExpenses.innerHTML = topExpenses.length ? topExpenses.map((item, index) => `<button type="button" data-edit="${item.id}"><span class="credit-expense-rank">${index + 1}</span><span><strong>${escapeHtml(item.description)}</strong><small>${formatDate(item.purchaseDate || item.date)} · ${escapeHtml(item.paymentMethod || item.account)}</small></span><b>${money.format(item.expenseAmount || item.amount || 0)}</b></button>`).join("") : `<div class="empty">Nenhuma compra corresponde aos filtros.</div>`;

  const groups = new Map();
  portfolio.items.forEach((item) => {
    const group = item.group || item.category || "Sem categoria";
    groups.set(group, (groups.get(group) || 0) + Number(item.expenseAmount || item.amount || 0));
  });
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  const groupMax = sortedGroups[0]?.[1] || 1;
  els.creditLargestGroupMetric.textContent = portfolio.largestGroup.name ? `${portfolio.largestGroup.name} · ${money.format(portfolio.largestGroup.total)}` : "Sem dados";
  els.creditGroupBars.innerHTML = sortedGroups.length ? sortedGroups.map(([group, total], index) => `<div><span><b>${escapeHtml(group)}</b><small>${money.format(total)}</small></span><i><em style="width:${(total / groupMax) * 100}%" class="tone-${Math.min(index + 1, 4)}"></em></i></div>`).join("") : `<div class="empty">Sem grupos para comparar.</div>`;

  els.creditInvoiceTitle.textContent = creditCardFilter === "all" ? "Lançamentos dos cartões" : `Fatura · ${creditCardFilter}`;
  els.creditInvoiceSummary.textContent = `${portfolio.items.length} compra(s) · ${money.format(portfolio.periodTotal)} · ${money.format(portfolio.pendingTotal)} em aberto`;
  els.creditInvoiceRows.innerHTML = portfolio.items.length ? portfolio.items.map((item) => `<tr>
    <td>${formatDate(item.purchaseDate || item.date)}</td><td>${formatDate(item.date)}</td><td><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.notes || "")}</small></td><td>${escapeHtml(item.group || item.category || "")}</td><td>${escapeHtml(item.paymentMethod || item.account || "")}</td><td class="amount negative">${money.format(item.expenseAmount || item.amount || 0)}</td><td><span class="credit-status ${item.status === "paid" ? "paid" : "pending"}">${item.status === "paid" ? "PAGA" : "EM ABERTO"}</span></td><td><button type="button" class="transaction-edit-button" data-edit="${item.id}" aria-label="Editar ${escapeHtml(item.description)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 17.2 9.8-9.8 2.8 2.8L6.8 20H4v-2.8ZM18.8 8 16 5.2l1.4-1.4a2 2 0 0 1 2.8 2.8L18.8 8Z"/></svg></button></td>
  </tr>`).join("") : `<tr><td colspan="8" class="empty">Nenhuma compra encontrada para o período e filtros selecionados.</td></tr>`;
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
  const visibleGroups = groupPayableItems(visibleItems, { separateStatus: true });
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
  const overdueGroups = groupPayableItems(overdue);
  const todayGroups = groupPayableItems(dueToday);
  const nextSevenGroups = groupPayableItems(nextSeven);

  els.pendingMonthLabel.textContent = `${formatMonth(selectedPendingMonth)} - filtro da aba Pendentes`;
  els.pendingTotalMetric.textContent = money.format(pendingTotal);
  els.pendingCountMetric.textContent = `${groupPayableItems(pendingVisible).length} conta(s)/fatura(s) pendente(s) no filtro`;
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
  els.overduePendingMetric.textContent = `${overdueGroups.length} · ${money.format(overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`;
  els.todayPendingMetric.textContent = `${todayGroups.length} · ${money.format(dueToday.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`;
  els.nextSevenPendingMetric.textContent = `${nextSevenGroups.length} · ${money.format(nextSeven.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`;
  if (overdue.length) {
    const firstOverdue = summarizeDueDate(overdue);
    els.pendingHealthTitle.textContent = `${overdueGroups.length} conta(s)/fatura(s) vencida(s) exigem ação`;
    els.pendingHealthMessage.textContent = `Regularize primeiro ${firstOverdue.description}, com total de ${money.format(firstOverdue.total)} vencido em ${formatDate(firstOverdue.date)}. ${coverage < 100 ? "O saldo disponível ainda não cobre todas as obrigações." : "Há saldo para cobrir as contas em aberto."}`;
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

  const orderedVisibleGroups = visibleGroups.sort((a, b) => (a.status === b.status ? a.date.localeCompare(b.date) : a.status === "pending" ? -1 : 1));
  [...payableGroupCache.keys()].filter((key) => key.startsWith("pending-payable-")).forEach((key) => payableGroupCache.delete(key));
  orderedVisibleGroups.forEach((group, index) => payableGroupCache.set(`pending-payable-${index}`, group));
  els.pendingBillsList.innerHTML = orderedVisibleGroups.length
    ? orderedVisibleGroups
        .map(
          (group, index) => {
            const item = group.items[0];
            const groupKey = `pending-payable-${index}`;
            const totalGroup = payableGroupTotal(group);
            const priority = group.status === "paid" ? "paid" : group.date < todayIso ? "overdue" : group.date === todayIso ? "today" : group.date <= sevenDaysAhead ? "soon" : "future";
            const priorityLabel = { paid: "PAGA", overdue: "VENCIDA", today: "VENCE HOJE", soon: "PRÓXIMOS 7 DIAS", future: "PROGRAMADA" }[priority];
            const title = group.isCard ? `Fatura ${payableGroupLabel(group)}` : payableGroupLabel(group);
            const detail = group.isCard
              ? `${formatDate(group.date)} · ${group.items.length} lançamento(s) agrupado(s) · clique para conferir`
              : `${formatDate(group.date)} · ${group.payment} · ${item.group || item.category || "Sem categoria"}`;
            const editAttribute = group.isCard ? `data-card-group="${groupKey}"` : `data-edit="${escapeHtml(item.id)}"`;
            const toggleAttribute = group.isCard ? `data-toggle-paid-group="${groupKey}"` : `data-toggle-paid="${escapeHtml(item.id)}"`;
            return `
          <article class="bill-item ${group.status === "paid" ? "done" : ""} ${group.isCard ? "grouped-card-bill" : ""} priority-${priority}">
            <input type="checkbox" ${toggleAttribute} ${group.status === "paid" ? "checked" : ""} aria-label="${group.status === "paid" ? "Reabrir" : "Pagar"} ${escapeHtml(title)}" />
            <button type="button" class="bill-meta bill-edit-button" ${editAttribute}>
              <strong>${group.isCard ? "💳 " : ""}${escapeHtml(title)}</strong>
              <small>${escapeHtml(detail)}</small>
            </button>
            <span class="bill-priority">${priorityLabel}</span>
            <strong class="amount negative">${money.format(totalGroup)}</strong>
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
  if (els.dialog?.open && document.activeElement === els.descriptionInput) renderDescriptionSuggestions();
}

function descriptionHistory() {
  const selectedType = els.transactionType.value;
  const history = new Map();
  state.transactions.forEach((item, index) => {
    if (item.type !== selectedType) return;
    const description = String(item.description || "").replace(/\s+\d+\/\d+$/u, "").trim();
    if (!description) return;
    const key = normalizeText(description);
    const current = history.get(key) || { description, count: 0, lastIndex: -1 };
    current.count += 1;
    current.lastIndex = index;
    history.set(key, current);
  });
  return [...history.values()];
}

function matchingDescriptions(query = els.descriptionInput.value) {
  const normalizedQuery = normalizeText(query.trim());
  return descriptionHistory()
    .map((item) => {
      const normalized = normalizeText(item.description);
      const words = normalized.split(/\s+/u);
      let score = 0;
      if (!normalizedQuery) score = item.count * 10 + item.lastIndex / 10000;
      else if (normalized === normalizedQuery) score = 10000;
      else if (normalized.startsWith(normalizedQuery)) score = 7000;
      else if (words.some((word) => word.startsWith(normalizedQuery))) score = 5000;
      else if (normalized.includes(normalizedQuery)) score = 3000;
      return { ...item, score: score + item.count * 10 + item.lastIndex / 10000 };
    })
    .filter((item) => !normalizedQuery || item.score >= 3000)
    .sort((a, b) => b.score - a.score || a.description.localeCompare(b.description, "pt-BR"))
    .slice(0, 40);
}

function closeDescriptionSuggestions() {
  descriptionSuggestionItems = [];
  activeDescriptionSuggestion = -1;
  els.descriptionSuggestions.classList.add("hidden");
  els.descriptionSuggestions.innerHTML = "";
  els.descriptionInput.setAttribute("aria-expanded", "false");
  els.descriptionInput.removeAttribute("aria-activedescendant");
}

function selectDescriptionSuggestion(index) {
  const suggestion = descriptionSuggestionItems[index];
  if (!suggestion) return;
  els.descriptionInput.value = suggestion.description;
  closeDescriptionSuggestions();
  els.descriptionInput.focus();
}

function setActiveDescriptionSuggestion(index) {
  if (!descriptionSuggestionItems.length) return;
  activeDescriptionSuggestion = (index + descriptionSuggestionItems.length) % descriptionSuggestionItems.length;
  const options = [...els.descriptionSuggestions.querySelectorAll(".autocomplete-option")];
  options.forEach((option, optionIndex) => {
    const active = optionIndex === activeDescriptionSuggestion;
    option.classList.toggle("active", active);
    option.setAttribute("aria-selected", String(active));
  });
  const activeOption = options[activeDescriptionSuggestion];
  if (activeOption) {
    els.descriptionInput.setAttribute("aria-activedescendant", activeOption.id);
    activeOption.scrollIntoView({ block: "nearest" });
  }
}

function renderDescriptionSuggestions() {
  descriptionSuggestionItems = matchingDescriptions();
  activeDescriptionSuggestion = -1;
  els.descriptionSuggestions.innerHTML = "";
  if (!descriptionSuggestionItems.length) {
    closeDescriptionSuggestions();
    return;
  }
  descriptionSuggestionItems.forEach((item, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.id = `description-suggestion-${index}`;
    option.className = "autocomplete-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    const label = document.createElement("span");
    label.textContent = item.description;
    const useCount = document.createElement("small");
    useCount.textContent = item.count > 1 ? `${item.count} usos` : "Usado anteriormente";
    option.append(label, useCount);
    option.addEventListener("mousedown", (event) => event.preventDefault());
    option.addEventListener("click", () => selectDescriptionSuggestion(index));
    els.descriptionSuggestions.append(option);
  });
  els.descriptionSuggestions.classList.remove("hidden");
  els.descriptionInput.setAttribute("aria-expanded", "true");
}

function handleDescriptionKeydown(event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (els.descriptionSuggestions.classList.contains("hidden")) renderDescriptionSuggestions();
    setActiveDescriptionSuggestion(activeDescriptionSuggestion + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setActiveDescriptionSuggestion(activeDescriptionSuggestion - 1);
  } else if (event.key === "Enter" && activeDescriptionSuggestion >= 0) {
    event.preventDefault();
    selectDescriptionSuggestion(activeDescriptionSuggestion);
  } else if (event.key === "Escape") {
    closeDescriptionSuggestions();
  }
}

function renderCatalogs() {
  const groups = state.catalogs?.groups || [];
  const expenseClasses = state.catalogs?.expenseClasses || [];
  const payments = state.catalogs?.paymentMethods || [];
  const cards = state.catalogs?.cards || [];
  const defaultGroupKeys = new Set(DEFAULT_GROUPS.map(normalizeText));
  const defaultExpenseClassKeys = new Set(DEFAULT_CATALOGS.expenseClasses.map(normalizeText));
  const defaultPaymentKeys = new Set(DEFAULT_CATALOGS.paymentMethods.map((item) => normalizeText(item.description)));
  els.groupCatalogCount.textContent = `${groups.length} cadastrados`;
  els.paymentCatalogCount.textContent = `${payments.length} cadastradas`;
  els.expenseClassCatalogCount.textContent = `${expenseClasses.length} cadastradas`;
  els.cardCatalogCount.textContent = `${cards.length} cadastrados`;
  els.groupCatalogList.innerHTML = groups.map((group) => `<div class="catalog-row"><strong>${escapeHtml(group)}</strong><span class="catalog-actions"><button type="button" class="catalog-edit" data-edit-group="${escapeHtml(group)}">Editar</button>${defaultGroupKeys.has(normalizeText(group)) ? `<span class="catalog-badge">PADRÃO</span>` : `<button type="button" class="catalog-remove" data-remove-group="${escapeHtml(group)}">Remover</button>`}</span></div>`).join("");
  els.expenseClassCatalogList.innerHTML = expenseClasses.map((item) => `<div class="catalog-row"><strong>${escapeHtml(item)}</strong><span class="catalog-actions"><button type="button" class="catalog-edit" data-edit-expense-class="${escapeHtml(item)}">Editar</button>${defaultExpenseClassKeys.has(normalizeText(item)) ? `<span class="catalog-badge">PADRÃO</span>` : `<button type="button" class="catalog-remove" data-remove-expense-class="${escapeHtml(item)}">Remover</button>`}</span></div>`).join("");
  els.paymentCatalogList.innerHTML = payments.map((item) => `<div class="catalog-row"><span><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.modality)}</small></span><span class="catalog-actions"><button type="button" class="catalog-edit" data-edit-payment="${escapeHtml(item.description)}">Editar</button>${defaultPaymentKeys.has(normalizeText(item.description)) ? `<span class="catalog-badge">PADRÃO</span>` : `<button type="button" class="catalog-remove" data-remove-payment="${escapeHtml(item.description)}">Remover</button>`}</span></div>`).join("");
  const creditPayments = payments.filter((item) => normalizeText(item.modality) === "CREDITO");
  const selectedCardPayment = els.newCardPaymentInput.value;
  els.newCardPaymentInput.innerHTML = `<option value="">Selecione o cartão</option>${creditPayments.map((item) => `<option value="${escapeHtml(item.description)}">${escapeHtml(item.description)}</option>`).join("")}`;
  if (creditPayments.some((item) => item.description === selectedCardPayment)) els.newCardPaymentInput.value = selectedCardPayment;
  els.cardCatalogList.innerHTML = cards.length
    ? cards.map((card) => `<div class="catalog-row card-catalog-row"><span><strong>${escapeHtml(card.paymentMethod)}</strong><small>${escapeHtml(cardBrandLabel(card.brand))} · fecha dia ${card.closingDay} · vence dia ${card.dueDay} · melhor compra dia ${card.bestPurchaseDay || "—"}</small><small>Limite ${money.format(card.limit || 0)}</small></span><span class="catalog-actions"><button type="button" class="catalog-edit" data-edit-card="${escapeHtml(card.paymentMethod)}">Editar</button><button type="button" class="catalog-remove" data-remove-card="${escapeHtml(card.paymentMethod)}">Remover</button></span></div>`).join("")
    : `<div class="empty">Cadastre as regras dos seus cartões para calcular as próximas faturas.</div>`;
}

function beginCatalogEdit(type, value) {
  if (type === "group") {
    editingGroup = value;
    els.newGroupInput.value = value;
    els.groupCatalogSubmitBtn.textContent = "Atualizar";
    els.newGroupInput.focus();
  }
  if (type === "expenseClass") {
    editingExpenseClass = value;
    els.newExpenseClassInput.value = value;
    els.expenseClassCatalogSubmitBtn.textContent = "Atualizar";
    els.newExpenseClassInput.focus();
  }
  if (type === "payment") {
    const payment = state.catalogs.paymentMethods.find((item) => normalizeText(item.description) === normalizeText(value));
    if (!payment) return;
    editingPaymentMethod = payment.description;
    els.newPaymentInput.value = payment.description;
    els.newPaymentModalityInput.value = payment.modality;
    els.paymentCatalogSubmitBtn.textContent = "Atualizar";
    els.newPaymentInput.focus();
  }
}

function catalogNameExists(items, value, originalValue, selector = (item) => item) {
  return items.some((item) => normalizeText(selector(item)) === normalizeText(value)
    && normalizeText(selector(item)) !== normalizeText(originalValue));
}

function editCardCatalog(paymentMethod) {
  const card = cardForPayment(paymentMethod);
  if (!card) return;
  editingCardPaymentMethod = card.paymentMethod;
  els.newCardPaymentInput.value = card.paymentMethod;
  els.newCardBrandInput.value = card.brand || "VISA";
  els.newCardClosingDayInput.value = String(card.closingDay);
  els.newCardDueDayInput.value = String(card.dueDay);
  els.newCardBestDayInput.value = String(card.bestPurchaseDay || "");
  els.newCardLimitInput.value = String(card.limit || 0);
  els.cardCatalogSubmitBtn.textContent = "Atualizar cartão";
  els.cardCatalogForm.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => els.newCardClosingDayInput.focus(), 250);
}

function addGroupCatalog(event) {
  event.preventDefault();
  const value = els.newGroupInput.value.trim().toUpperCase();
  if (!value || catalogNameExists(state.catalogs.groups, value, editingGroup)) return;
  const updated = Boolean(editingGroup);
  if (updated) {
    const previous = editingGroup;
    state.catalogs.groups = state.catalogs.groups.map((item) => normalizeText(item) === normalizeText(previous) ? value : item);
    state.transactions = state.transactions.map((item) => ({
      ...item,
      group: normalizeText(item.group) === normalizeText(previous) ? value : item.group,
      category: normalizeText(item.category) === normalizeText(previous) ? value : item.category,
    }));
    const budgetKey = Object.keys(state.budgets || {}).find((key) => normalizeText(key) === normalizeText(previous));
    if (budgetKey && budgetKey !== value) {
      state.budgets[value] = state.budgets[budgetKey];
      delete state.budgets[budgetKey];
    }
  } else state.catalogs.groups.push(value);
  editingGroup = "";
  els.newGroupInput.value = "";
  els.groupCatalogSubmitBtn.textContent = "Adicionar";
  saveState();
  showToast(updated ? "Grupo atualizado" : "Grupo cadastrado", value + (updated ? " foi atualizado em todo o histórico." : " foi adicionado à lista."), "success");
  render();
}

function addPaymentCatalog(event) {
  event.preventDefault();
  const description = els.newPaymentInput.value.trim().toUpperCase();
  const modality = els.newPaymentModalityInput.value.trim().toUpperCase();
  if (!description || !modality || catalogNameExists(state.catalogs.paymentMethods, description, editingPaymentMethod, (item) => item.description)) return;
  const updated = Boolean(editingPaymentMethod);
  if (updated) {
    const previous = editingPaymentMethod;
    state.catalogs.paymentMethods = state.catalogs.paymentMethods.map((item) => normalizeText(item.description) === normalizeText(previous) ? { description, modality } : item);
    state.transactions = state.transactions.map((item) => ({
      ...item,
      paymentMethod: normalizeText(item.paymentMethod) === normalizeText(previous) ? description : item.paymentMethod,
      account: normalizeText(item.account) === normalizeText(previous) ? description : item.account,
      modality: normalizeText(item.paymentMethod) === normalizeText(previous) ? modality : item.modality,
    }));
    state.catalogs.cards = state.catalogs.cards.map((card) => normalizeText(card.paymentMethod) === normalizeText(previous) ? { ...card, paymentMethod: description } : card);
  } else state.catalogs.paymentMethods.push({ description, modality });
  editingPaymentMethod = "";
  els.newPaymentInput.value = "";
  els.newPaymentModalityInput.value = "";
  els.paymentCatalogSubmitBtn.textContent = "Adicionar";
  saveState();
  showToast(updated ? "Forma de pagamento atualizada" : "Forma de pagamento cadastrada", description + " · " + modality, "success");
  render();
}

function addExpenseClassCatalog(event) {
  event.preventDefault();
  const value = els.newExpenseClassInput.value.trim().toUpperCase();
  if (!value || catalogNameExists(state.catalogs.expenseClasses, value, editingExpenseClass)) return;
  const updated = Boolean(editingExpenseClass);
  if (updated) {
    const previous = editingExpenseClass;
    state.catalogs.expenseClasses = state.catalogs.expenseClasses.map((item) => normalizeText(item) === normalizeText(previous) ? value : item);
    state.transactions = state.transactions.map((item) => ({ ...item, expenseClass: normalizeText(item.expenseClass) === normalizeText(previous) ? value : item.expenseClass }));
  } else state.catalogs.expenseClasses.push(value);
  editingExpenseClass = "";
  els.newExpenseClassInput.value = "";
  els.expenseClassCatalogSubmitBtn.textContent = "Adicionar";
  saveState();
  showToast(updated ? "Classificação atualizada" : "Classificação cadastrada", value + (updated ? " foi atualizada em todo o histórico." : " foi adicionada à lista."), "success");
  render();
}

function addCardCatalog(event) {
  event.preventDefault();
  const paymentMethod = els.newCardPaymentInput.value.trim();
  const brand = els.newCardBrandInput.value.trim().toUpperCase();
  const closingDay = Number(els.newCardClosingDayInput.value);
  const dueDay = Number(els.newCardDueDayInput.value);
  const bestPurchaseDay = Number(els.newCardBestDayInput.value);
  const limit = Number(els.newCardLimitInput.value);
  if (!paymentMethod || [closingDay, dueDay, bestPurchaseDay].some((day) => day < 1 || day > 31) || limit < 0) return;
  const card = { paymentMethod, brand, closingDay, dueDay, bestPurchaseDay, limit };
  const lookupPaymentMethod = editingCardPaymentMethod || paymentMethod;
  const index = state.catalogs.cards.findIndex((item) => normalizeText(item.paymentMethod) === normalizeText(lookupPaymentMethod));
  const updated = index >= 0;
  if (index >= 0) state.catalogs.cards[index] = card;
  else state.catalogs.cards.push(card);
  editingCardPaymentMethod = "";
  els.cardCatalogForm.reset();
  els.cardCatalogSubmitBtn.textContent = "Salvar cartão";
  saveState();
  render();
  showToast(updated ? "Cartão atualizado" : "Cartão cadastrado", `${paymentMethod}: fechamento dia ${closingDay} e vencimento dia ${dueDay}.`, "success");
}

function removeCatalogItem(type, value) {
  if (type === "group") state.catalogs.groups = state.catalogs.groups.filter((item) => normalizeText(item) !== normalizeText(value));
  if (type === "expenseClass") state.catalogs.expenseClasses = state.catalogs.expenseClasses.filter((item) => normalizeText(item) !== normalizeText(value));
  if (type === "payment") state.catalogs.paymentMethods = state.catalogs.paymentMethods.filter((item) => normalizeText(item.description) !== normalizeText(value));
  if (type === "card") state.catalogs.cards = state.catalogs.cards.filter((item) => normalizeText(item.paymentMethod) !== normalizeText(value));
  if (type === "card" && normalizeText(editingCardPaymentMethod) === normalizeText(value)) {
    editingCardPaymentMethod = "";
    els.cardCatalogForm.reset();
    els.cardCatalogSubmitBtn.textContent = "Salvar cartão";
  }
  if (type === "group" && normalizeText(editingGroup) === normalizeText(value)) {
    editingGroup = "";
    els.groupCatalogForm.reset();
    els.groupCatalogSubmitBtn.textContent = "Adicionar";
  }
  if (type === "expenseClass" && normalizeText(editingExpenseClass) === normalizeText(value)) {
    editingExpenseClass = "";
    els.expenseClassCatalogForm.reset();
    els.expenseClassCatalogSubmitBtn.textContent = "Adicionar";
  }
  if (type === "payment" && normalizeText(editingPaymentMethod) === normalizeText(value)) {
    editingPaymentMethod = "";
    els.paymentCatalogForm.reset();
    els.paymentCatalogSubmitBtn.textContent = "Adicionar";
  }
  saveState();
  showToast("Cadastro removido", value + " foi excluído da lista.", "success");
  render();
}

function setView(view) {
  selectedView = view;
  setMobileMenu(false);
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  els.views.forEach((item) => item.classList.toggle("active", item.id === view));
  document.querySelectorAll("[data-mobile-view]").forEach((item) => item.classList.toggle("active", item.dataset.mobileView === view));
  if (view === "analytics" && !analyticsDefaultPeriodApplied) {
    const historicalDates = state.transactions
      .map((item) => String(item.date || ""))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayIso)
      .sort();
    selectedPeriod.mode = "range";
    selectedPeriod.start = historicalDates[0] || `${currentMonth}-01`;
    selectedPeriod.end = todayIso;
    analyticsDefaultPeriodApplied = true;
    render();
  } else {
    requestAnimationFrame(render);
  }
}

function setMobileMenu(open) {
  const isMobile = window.matchMedia("(max-width: 980px)").matches;
  const shouldOpen = Boolean(open && isMobile);
  els.sidebar?.classList.toggle("mobile-open", shouldOpen);
  els.sidebarBackdrop?.classList.toggle("visible", shouldOpen);
  els.mobileMenuBtn?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("mobile-menu-open", shouldOpen);
}

function setDesktopSidebarCollapsed(collapsed) {
  const shouldCollapse = Boolean(collapsed);
  els.appShell?.classList.toggle("sidebar-collapsed", shouldCollapse);
  els.desktopSidebarToggle?.setAttribute("aria-expanded", String(!shouldCollapse));
  els.desktopSidebarToggle?.setAttribute("aria-label", shouldCollapse ? "Expandir menu" : "Recolher menu");
  try { localStorage.setItem("meg-sidebar-collapsed", shouldCollapse ? "1" : "0"); } catch {}
}

function updateSidebarClock() {
  if (!els.sidebarDateTime) return;
  els.sidebarDateTime.textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
}

async function loadSidebarVersion() {
  if (!els.sidebarVersion) return;
  try {
    const response = await fetch(new URL("downloads/app-version.json", document.baseURI), { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const release = await response.json();
    els.sidebarVersion.textContent = `MEG v${release.versionName || release.version || "1.3.0"}`;
  } catch {
    els.sidebarVersion.textContent = "MEG v1.3.0";
  }
}

function syncAmountFields() {
  const isIncome = els.transactionType.value === "income";
  els.incomeAmountField.classList.toggle("hidden", !isIncome);
  els.expenseAmountField.classList.toggle("hidden", isIncome);
  els.expenseClassField.classList.toggle("hidden", isIncome);
  els.groupField.classList.toggle("hidden", isIncome);
  els.incomeAmountInput.disabled = !isIncome;
  els.expenseAmountInput.disabled = isIncome;
  els.expenseClassInput.disabled = isIncome;
  els.groupInput.disabled = isIncome;
  els.incomeAmountInput.required = isIncome;
  els.expenseAmountInput.required = !isIncome;
  els.expenseClassInput.required = !isIncome;
  els.groupInput.required = !isIncome;
  els.paymentMethodLabel.textContent = isIncome ? "FORMA DE RECEBIMENTO" : "FORMA DE PAGAMENTO";
  const paidOption = els.statusInput.querySelector('option[value="paid"]');
  if (paidOption) paidOption.textContent = isIncome ? "RECEBIDO" : "PAGO";
  if (isIncome) {
    els.expenseAmountInput.value = "";
    els.expenseClassInput.value = "";
    els.groupInput.value = "";
  } else {
    els.incomeAmountInput.value = "";
  }
  syncCardDates();
  syncInstallmentFields();
  if (document.activeElement === els.descriptionInput) renderDescriptionSuggestions();
}

function isInstallmentModality() {
  const modality = normalizeText(els.modalityInput.value);
  return modality === "CREDITO" || modality === "CREDIARIO";
}

function syncCardDates({ recalculate = !els.transactionId.value } = {}) {
  const card = els.transactionType.value === "expense" ? cardForPayment(els.paymentMethodInput.value) : null;
  const show = Boolean(card);
  els.purchaseDateField.classList.toggle("hidden", !show);
  els.purchaseDateInput.disabled = !show;
  els.purchaseDateInput.required = show;
  els.dateInput.readOnly = show;
  els.dateInputLabel.textContent = show ? "DATA DE VENCIMENTO DA FATURA" : "DATA";
  els.cardDuePreview.classList.toggle("hidden", !show);

  if (!show) {
    els.cardDuePreview.textContent = "";
    return;
  }

  if (!els.purchaseDateInput.value && !els.transactionId.value) els.purchaseDateInput.value = todayIso;
  if (recalculate && els.purchaseDateInput.value) {
    els.dateInput.value = cardStatementDueDate(els.purchaseDateInput.value, card.closingDay, card.dueDay);
    els.weekdayInput.value = weekdayShort(els.dateInput.value);
  }
  els.cardDuePreview.textContent = els.purchaseDateInput.value
    ? `Fecha dia ${card.closingDay}. Esta compra vence em ${formatDate(els.dateInput.value)}. Melhor dia: ${card.bestPurchaseDay || "—"}.`
    : `Informe a data da compra para calcular a fatura. Fecha dia ${card.closingDay}.`;
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
  syncCardDates({ recalculate: true });
  syncInstallmentFields();
}

function syncModalityPaymentOptions() {
  refreshPaymentMethodOptions();
  syncCardDates({ recalculate: true });
  syncInstallmentFields();
}

function openTransactionDialog(item = null) {
  const defaultDate = selectedPeriod.mode === "month" ? `${selectedPeriod.month}-${todayIso.slice(8, 10)}` : todayIso;
  els.dialogTitle.textContent = item ? "Editar lancamento" : "Novo lancamento";
  els.transactionId.value = item?.id || "";
  els.dateInput.value = item?.date || defaultDate;
  els.purchaseDateInput.value = item?.purchaseDate || "";
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
  syncCardDates({ recalculate: !item });
  syncInstallmentFields();
  els.dialog.showModal();
  els.transactionType.focus();
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
    ...(!els.purchaseDateInput.disabled && els.purchaseDateInput.value ? { purchaseDate: els.purchaseDateInput.value } : {}),
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
  showToast(
    previous ? "Lançamento atualizado" : "Lançamento salvo",
    payload.description + " · " + money.format(payload.amount),
    "success"
  );
  render();
}

function deleteTransaction() {
  const id = els.transactionId.value;
  if (!id) return;
  const removed = state.transactions.find((item) => item.id === id);
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveState();
  els.dialog.close();
  showToast("Lançamento excluído", removed ? removed.description : "O lançamento foi removido.", "success");
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
  showToast(paid ? "Conta paga" : "Pagamento desfeito", `${item.description} · ${money.format(item.amount)}`, "success");
  render();
}

function togglePaidGroup(groupKey, paid, control) {
  const group = payableGroupCache.get(groupKey);
  if (!group) return;
  if (paid) {
    if (control) control.checked = false;
    openPaymentConfirmation(groupKey);
    return;
  }
  group.items.forEach((item) => {
    item.status = "pending";
    item.situation = "PENDENTE";
  });
  saveState();
  showToast("Fatura reaberta", `${group.payment} · ${money.format(payableGroupTotal(group))}`, "success");
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
    showToast("Meta salva", category + " · " + money.format(state.budgets[category]), "success");
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
    showToast("CSV importado", imported.length + " lançamentos foram adicionados com sucesso.", "success");
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
        ...(normalizeDate(row["data da compra"] || row.purchasedate) ? { purchaseDate: normalizeDate(row["data da compra"] || row.purchasedate) } : {}),
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  const payload = {
    format: "MEG_FINANCAS_BACKUP",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: structuredClone(state),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, "backup-meg-financas-" + new Date().toISOString().slice(0, 10) + ".json");
  showToast("Backup concluído", state.transactions.length + " lançamentos foram incluídos na cópia.", "success");
}

async function handleBackupImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const backupState = parsed?.format === "MEG_FINANCAS_BACKUP" ? parsed.state : parsed;
    if (!backupState || !Array.isArray(backupState.transactions) || typeof backupState.budgets !== "object") {
      throw new Error("Este arquivo não é um backup válido do MEG Finanças.");
    }
    if (!window.confirm("Restaurar " + backupState.transactions.length + " lançamentos? A base atual será substituída.")) {
      els.backupImportStatus.textContent = "Restauração cancelada.";
      return;
    }
    replaceState(backupState);
    saveState({ cloud: false });
    await window.MEG_CLOUD?.saveNow?.(state, { force: true });
    els.backupImportStatus.textContent = state.transactions.length + " lançamentos restaurados e salvos com segurança.";
    showToast("Backup restaurado", "A base financeira foi restaurada com sucesso.", "success");
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível restaurar o backup.";
    els.backupImportStatus.textContent = message;
    showToast("Falha na restauração", message, "danger");
  } finally {
    event.target.value = "";
  }
}

function exportCsv() {
  const headers = ["DATA", "DATA DA COMPRA", "DiaSemana", "TP LANÇAMENTO", "DESCRIÇÃO", "RECEITA($)", "CLASSIFICAÇÃO DA DESPESA", "GRUPO", "DESPESA (R$)", "FORMA DE PAGAMENTO", "SITUAÇÃO", "MODALIDADE", "OBSERVAÇÕES"];
  const rows = state.transactions
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => [
      item.date,
      item.purchaseDate || "",
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
  downloadBlob(blob, "despesas-meg-" + new Date().toISOString().slice(0, 10) + ".csv");
  showToast("CSV exportado", "O arquivo de lançamentos foi gerado com sucesso.", "success");
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

function cleanManagedUserEmail(value) {
  return String(value || "").trim().replace(/[?？]+$/u, "").toLowerCase();
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
    const cleanEmail = cleanManagedUserEmail(user.email);
    const primaryAdmin = cleanEmail === "m_vilalva@hotmail.com";
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
      ? `<button class="button primary" type="button" data-reset-user-password="${escapeHtml(user.id)}">Redefinir senha</button><button class="button ghost" type="button" data-test-user-email="${escapeHtml(user.id)}">Testar e-mail</button>`
      : "";
    const deleteAction = !primaryAdmin
      ? `<button class="button danger-soft" type="button" data-delete-managed-user="${escapeHtml(user.id)}">Excluir acesso</button>`
      : "";
    return `<article class="admin-user-card" data-managed-user="${escapeHtml(user.id)}">
      <div class="admin-user-head">
        <div class="user-avatar">${escapeHtml(user.name.slice(0, 1).toUpperCase())}</div>
        <div class="admin-user-identity"><span class="user-status-pill ${user.status.toLowerCase()}">${escapeHtml(USER_STATUS_LABELS[user.status] || user.status)}</span><h3>${escapeHtml(user.name)}</h3><a href="mailto:${escapeHtml(cleanEmail)}">${escapeHtml(cleanEmail)}</a></div>
        ${primaryAdmin ? '<span class="primary-admin-badge">Administrador principal</span>' : ""}
      </div>
      <div class="admin-user-details"><span><small>Cadastrado em</small><strong>${userDate(user.createdAt)}</strong></span><span><small>Último acesso</small><strong>${userDate(user.lastLoginAt)}</strong></span></div>
      <div class="admin-user-permissions"><label>Perfil de acesso<select class="user-role-select" data-user-role="${escapeHtml(user.id)}" ${primaryAdmin ? "disabled" : ""}>${roleOptions}</select></label><label>WhatsApp<input class="user-phone-input" data-user-phone="${escapeHtml(user.id)}" value="${escapeHtml(user.phone || "")}" placeholder="5518999999999" inputmode="tel" ${primaryAdmin ? "disabled" : ""}></label></div>
      <div class="admin-user-actions">${!primaryAdmin && user.status === "ACTIVE" ? `<button class="button" type="button" data-save-user-role="${escapeHtml(user.id)}">Salvar dados e permissão</button>` : ""}${pendingActions}${activeActions}${inactiveActions}${resetAction}${deleteAction}</div>
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
  const phone = card?.querySelector("[data-user-phone]")?.value?.replace(/\D/g, "") || undefined;
  let note;
  if (action === "REJECT") {
    note = window.prompt("Informe o motivo da rejeição (opcional):", "") ?? undefined;
  }
  if ((action === "BLOCK" || action === "REJECT") && !window.confirm(`Confirma ${action === "BLOCK" ? "o bloqueio" : "a rejeição"} deste usuário?`)) return;
  setUsersFeedback("Atualizando acesso...", "loading");
  try {
    const result = await window.MEG_CLOUD.changeUserAccess(userId, { action, role, phone, note });
    const delivered = (result.notifications || []).filter((item) => item.status === "sent").map((item) => item.channel === "whatsapp" ? "WhatsApp" : "e-mail");
    const channelText = delivered.length ? ` Aviso enviado por ${delivered.join(" e ")}.` : action === "UPDATE" ? "" : " Atenção: nenhum aviso foi entregue.";
    const successMessage = action === "APPROVE" ? `Usuário aprovado.${channelText}` : action === "BLOCK" ? `Usuário bloqueado e sessões encerradas.${channelText}` : action === "REJECT" ? `Solicitação rejeitada.${channelText}` : "Dados e permissão atualizados.";
    await loadManagedUsers({ keepFeedback: true });
    setUsersFeedback(successMessage, "success");
    showToast("Acesso atualizado", successMessage, "success");
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
    const delivered = (result.notifications || []).filter((item) => item.status === "sent").map((item) => item.channel === "whatsapp" ? "WhatsApp" : "e-mail");
    const failed = (result.notifications || []).filter((item) => item.status === "failed").map((item) => item.channel === "whatsapp" ? "WhatsApp" : "e-mail");
    setUsersFeedback(`Nova senha enviada com segurança por ${delivered.join(" e ") || result.deliveredTo}.${failed.length ? ` Não entregue por ${failed.join(" e ")}; use “Testar e-mail” para ver o motivo.` : ""}`, failed.length ? "warning" : "success");
  } catch (cause) {
    setUsersFeedback(cause instanceof Error ? cause.message : "Falha ao redefinir a senha.", "error");
  }
}

async function testManagedUserEmail(userId) {
  const card = document.querySelector(`[data-managed-user="${cssEscape(userId)}"]`);
  const email = card?.querySelector(".admin-user-identity a")?.textContent || "o e-mail cadastrado";
  setUsersFeedback(`Testando a entrega para ${email} sem alterar a senha...`, "loading");
  try {
    await window.MEG_CLOUD.testUserEmail(userId);
    setUsersFeedback(`E-mail de teste aceito pelo provedor para ${email}.`, "success");
  } catch (cause) {
    setUsersFeedback(cause instanceof Error ? cause.message : "Falha no teste de e-mail.", "error");
  }
}

async function deleteManagedUser(userId) {
  const card = document.querySelector(`[data-managed-user="${cssEscape(userId)}"]`);
  const email = card?.querySelector(".admin-user-identity a")?.textContent || "este usuário";
  if (!window.confirm(`Excluir definitivamente o acesso de ${email}? As sessões e os dados pessoais desta conta serão removidos. Esta ação não pode ser desfeita.`)) return;
  setUsersFeedback("Excluindo acesso...", "loading");
  try {
    await window.MEG_CLOUD.deleteManagedUser(userId);
    await loadManagedUsers({ keepFeedback: true });
    setUsersFeedback("Acesso excluído definitivamente.", "success");
    showToast("Acesso excluído", email + " não possui mais acesso ao MEG.", "success");
  } catch (cause) {
    setUsersFeedback(cause instanceof Error ? cause.message : "Falha ao excluir o acesso.", "error");
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
  const removeCardButton = event.target.closest("[data-remove-card]");
  const editCardButton = event.target.closest("[data-edit-card]");
  const editGroupCatalogButton = event.target.closest("[data-edit-group]");
  const editExpenseClassCatalogButton = event.target.closest("[data-edit-expense-class]");
  const editPaymentCatalogButton = event.target.closest("[data-edit-payment]");
  const creditCardSelectButton = event.target.closest("[data-credit-card-select]");
  const userActionButton = event.target.closest("[data-user-action]");
  const saveUserRoleButton = event.target.closest("[data-save-user-role]");
  const resetUserPasswordButton = event.target.closest("[data-reset-user-password]");
  const testUserEmailButton = event.target.closest("[data-test-user-email]");
  const deleteManagedUserButton = event.target.closest("[data-delete-managed-user]");
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
  if (removeCardButton) removeCatalogItem("card", removeCardButton.dataset.removeCard);
  if (editCardButton) editCardCatalog(editCardButton.dataset.editCard);
  if (editGroupCatalogButton) beginCatalogEdit("group", editGroupCatalogButton.dataset.editGroup);
  if (editExpenseClassCatalogButton) beginCatalogEdit("expenseClass", editExpenseClassCatalogButton.dataset.editExpenseClass);
  if (editPaymentCatalogButton) beginCatalogEdit("payment", editPaymentCatalogButton.dataset.editPayment);
  if (creditCardSelectButton) {
    creditCardFilter = creditCardSelectButton.dataset.creditCardSelect || "all";
    renderCreditCards();
  }
  if (userActionButton) updateManagedUser(userActionButton.dataset.userId, userActionButton.dataset.userAction);
  if (saveUserRoleButton) updateManagedUser(saveUserRoleButton.dataset.saveUserRole, "UPDATE");
  if (resetUserPasswordButton) resetManagedUserPassword(resetUserPasswordButton.dataset.resetUserPassword);
  if (testUserEmailButton) testManagedUserEmail(testUserEmailButton.dataset.testUserEmail);
  if (deleteManagedUserButton) deleteManagedUser(deleteManagedUserButton.dataset.deleteManagedUser);
});

document.addEventListener("change", (event) => {
  const paidToggle = event.target.closest("[data-toggle-paid]");
  const paidGroupToggle = event.target.closest("[data-toggle-paid-group]");
  if (paidToggle) togglePaid(paidToggle.dataset.togglePaid, paidToggle.checked);
  if (paidGroupToggle) togglePaidGroup(paidGroupToggle.dataset.togglePaidGroup, paidGroupToggle.checked, paidGroupToggle);
});

els.navItems.forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
document.querySelectorAll("[data-mobile-view]").forEach((item) => item.addEventListener("click", () => setView(item.dataset.mobileView)));
document.querySelector("[data-mobile-action='new']")?.addEventListener("click", () => openTransactionDialog());
document.querySelector("[data-mobile-action='menu']")?.addEventListener("click", () => setMobileMenu(true));
els.mobileMenuBtn?.addEventListener("click", () => setMobileMenu(true));
els.sidebarCloseBtn?.addEventListener("click", () => setMobileMenu(false));
els.sidebarBackdrop?.addEventListener("click", () => setMobileMenu(false));
els.desktopSidebarToggle?.addEventListener("click", () => setDesktopSidebarCollapsed(!els.appShell?.classList.contains("sidebar-collapsed")));
window.addEventListener("resize", () => {
  if (!window.matchMedia("(max-width: 980px)").matches) setMobileMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileMenu(false);
});
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
  selectedPeriod.year = els.yearFilter.value || todayIso.slice(0, 4);
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
els.openReconciliationBtn?.addEventListener("click", openReconciliationDialog);
els.reconciliationActualInput?.addEventListener("input", updateReconciliationPreview);
els.reconciliationForm?.addEventListener("submit", saveBalanceReconciliation);
els.closeReconciliationBtn?.addEventListener("click", () => els.reconciliationDialog.close());
els.cancelReconciliationBtn?.addEventListener("click", () => els.reconciliationDialog.close());
els.searchInput.addEventListener("input", renderTransactions);
els.typeFilter.addEventListener("change", renderTransactions);
els.transactionSortFilter.addEventListener("change", renderTransactions);
els.transactionColumnFilters.forEach((control) => {
  control.addEventListener(control.tagName === "SELECT" ? "change" : "input", () => {
    transactionColumnFilters[control.dataset.columnFilter] = control.value;
    renderTransactions();
  });
});
document.addEventListener("input", (event) => {
  if (event.target.matches?.("[data-multi-filter-search]")) renderColumnFilterOptions();
});
document.addEventListener("change", (event) => {
  if (!event.target.matches?.("[data-multi-filter-option]")) return;
  const filter = event.target.closest("[data-multi-filter]");
  if (!filter) return;
  transactionColumnFilters[filter.dataset.multiFilter] = [...filter.querySelectorAll("[data-multi-filter-option]:checked")].map((input) => input.value);
  renderTransactions();
});
document.addEventListener("click", (event) => {
  const clearButton = event.target.closest?.("[data-multi-filter-clear]");
  if (!clearButton) return;
  const filter = clearButton.closest("[data-multi-filter]");
  if (!filter) return;
  transactionColumnFilters[filter.dataset.multiFilter] = [];
  const search = filter.querySelector("[data-multi-filter-search]");
  if (search) search.value = "";
  renderTransactions();
});
els.clearColumnFiltersBtn?.addEventListener("click", () => {
  Object.keys(transactionColumnFilters).forEach((key) => delete transactionColumnFilters[key]);
  els.transactionColumnFilters.forEach((control) => { control.value = ""; });
  document.querySelectorAll("[data-multi-filter-search]").forEach((control) => { control.value = ""; });
  els.searchInput.value = "";
  els.typeFilter.value = "all";
  renderTransactions();
});
els.creditCardFilter?.addEventListener("change", () => {
  creditCardFilter = els.creditCardFilter.value || "all";
  renderCreditCards();
});
els.creditCardStatusFilter?.addEventListener("change", () => {
  creditCardStatusFilter = els.creditCardStatusFilter.value || "all";
  renderCreditCards();
});
els.creditCardSearchInput?.addEventListener("input", () => {
  creditCardSearch = els.creditCardSearchInput.value.trim();
  renderCreditCards();
});
els.clearCreditCardFiltersBtn?.addEventListener("click", () => {
  creditCardFilter = "all";
  creditCardStatusFilter = "all";
  creditCardSearch = "";
  renderCreditCards();
});
els.newCardTransactionBtn?.addEventListener("click", () => {
  openTransactionDialog();
  els.transactionType.value = "expense";
  syncAmountFields();
  els.modalityInput.value = "CREDITO";
  syncModalityPaymentOptions();
  if (creditCardFilter !== "all") {
    els.paymentMethodInput.value = creditCardFilter;
    syncPaymentModality();
  }
  els.descriptionInput.focus();
});
els.pendingStatusFilter.addEventListener("change", renderPending);
els.pendingPaymentFilter.addEventListener("change", renderPending);
els.pendingMonthFilter.addEventListener("change", () => {
  selectedPendingMonth = els.pendingMonthFilter.value || currentMonth;
  renderPending();
});
els.markAllPendingPaidBtn.addEventListener("click", markAllCurrentPendingPaid);
els.incomeSourceFilter?.addEventListener("change", () => {
  incomeSourceFilter = els.incomeSourceFilter.value || "all";
  renderIncomeAnalysis();
});
els.incomeSourceSearch?.addEventListener("input", () => {
  incomeSourceSearch = els.incomeSourceSearch.value.trim();
  renderIncomeAnalysis();
});
els.clearIncomeFiltersBtn?.addEventListener("click", () => {
  incomeSourceFilter = "all";
  incomeSourceSearch = "";
  renderIncomeAnalysis();
});
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
els.purchaseDateInput.addEventListener("change", () => syncCardDates({ recalculate: true }));
els.transactionType.addEventListener("change", syncAmountFields);
els.descriptionInput.addEventListener("input", renderDescriptionSuggestions);
els.descriptionInput.addEventListener("focus", renderDescriptionSuggestions);
els.descriptionInput.addEventListener("keydown", handleDescriptionKeydown);
els.descriptionInput.addEventListener("blur", () => window.setTimeout(closeDescriptionSuggestions, 120));
els.paymentMethodInput.addEventListener("change", syncPaymentModality);
els.modalityInput.addEventListener("change", syncModalityPaymentOptions);
els.purchaseTotalInput.addEventListener("input", syncInstallmentFields);
els.installmentCountInput.addEventListener("input", syncInstallmentFields);
els.form.addEventListener("submit", saveTransaction);
els.deleteTransactionBtn.addEventListener("click", deleteTransaction);
els.closeDialogBtn.addEventListener("click", () => {
  closeDescriptionSuggestions();
  els.dialog.close();
});
els.cancelDialogBtn.addEventListener("click", () => {
  closeDescriptionSuggestions();
  els.dialog.close();
});
els.dialog.addEventListener("close", closeDescriptionSuggestions);
els.paymentConfirmForm.addEventListener("submit", confirmDashboardPayment);
els.closePaymentConfirmBtn.addEventListener("click", () => els.paymentConfirmDialog.close());
els.cancelPaymentConfirmBtn.addEventListener("click", () => els.paymentConfirmDialog.close());
els.closeCardLaunchDialogBtn.addEventListener("click", () => els.cardLaunchDialog.close());
els.cancelCardLaunchDialogBtn.addEventListener("click", () => els.cardLaunchDialog.close());
els.closeOpeningAlertBtn.addEventListener("click", () => els.openingAlertDialog.close());
els.dismissOpeningAlertBtn.addEventListener("click", () => els.openingAlertDialog.close());
els.viewOpeningAlertsBtn.addEventListener("click", () => {
  els.openingAlertDialog.close();
  setView("pending");
});
els.closeInsufficientBalanceBtn.addEventListener("click", () => els.insufficientBalanceDialog.close());
els.addMissingIncomeBtn.addEventListener("click", () => {
  els.insufficientBalanceDialog.close();
  openTransactionDialog();
  els.transactionType.value = "income";
  syncAmountFields();
  els.descriptionInput.focus();
});
els.applySuggestedBudgetsBtn.addEventListener("click", applySuggestedBudgets);
els.budgetEditorGrid.addEventListener("click", handleBudgetClick);
els.csvImport.addEventListener("change", handleCsvImport);
els.backupImport.addEventListener("change", handleBackupImport);
els.exportBackupBtn.addEventListener("click", exportBackup);
els.exportCsvBtn.addEventListener("click", exportCsv);
els.groupCatalogForm.addEventListener("submit", addGroupCatalog);
els.expenseClassCatalogForm.addEventListener("submit", addExpenseClassCatalog);
els.paymentCatalogForm.addEventListener("submit", addPaymentCatalog);
els.cardCatalogForm.addEventListener("submit", addCardCatalog);
els.newCardPaymentInput.addEventListener("change", () => {
  const card = cardForPayment(els.newCardPaymentInput.value);
  if (!card) return;
  els.newCardClosingDayInput.value = String(card.closingDay);
  els.newCardDueDayInput.value = String(card.dueDay);
  els.newCardBestDayInput.value = String(card.bestPurchaseDay || "");
  els.newCardLimitInput.value = String(card.limit || 0);
  els.newCardBrandInput.value = card.brand || "VISA";
});
window.addEventListener("resize", () => {
  renderCategoryChart();
  renderAnalytics();
});

setView(selectedView);
setDesktopSidebarCollapsed(localStorage.getItem("meg-sidebar-collapsed") === "1");
updateSidebarClock();
window.setInterval(updateSidebarClock, 30000);
loadSidebarVersion();
render();
window.setTimeout(showOpeningFinancialAlert, 450);

window.MEG_APP = {
  replaceImportedState,
  replaceState,
  getState: () => structuredClone(state),
  showToast,
  render
};
