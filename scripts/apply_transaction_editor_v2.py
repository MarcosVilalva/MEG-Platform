from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps/web/src/legacy-app.js"
EDITOR = ROOT / "apps/web/src/transaction-editor.js"
STYLES = ROOT / "apps/web/src/legacy-styles.css"
WORKFLOW = ROOT / ".github/workflows/apply-transaction-editor-v2.yml"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Trecho não encontrado: {label}")
    if text.count(old) != 1:
        raise RuntimeError(f"Trecho ambíguo ({text.count(old)} ocorrências): {label}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Substituição inválida ({count}): {label}")
    return result


app = APP.read_text(encoding="utf-8")

app = replace_once(
    app,
    'import { GLOBAL_FINANCIAL_SCHEMA_VERSION, isBenefitTransaction, migrateGlobalFinancialState, upsertOpeningBalanceTransaction } from "./legacy-financial-accounts.js";\n',
    'import { GLOBAL_FINANCIAL_SCHEMA_VERSION, isBenefitTransaction, migrateGlobalFinancialState, upsertOpeningBalanceTransaction } from "./legacy-financial-accounts.js";\nimport { createTransactionEditor, replaceSelectOptions } from "./transaction-editor.js";\n',
    "importação do editor",
)

editor_initialization = '''const transactionEditor = createTransactionEditor({
  dialog: els.dialog,
  form: els.form,
  appShell: els.appShell,
  comboboxSelects: [
    els.modalityInput,
    els.paymentMethodInput,
    els.financialAccountInput,
    els.expenseClassInput,
    els.groupInput,
  ],
  segmentedSelects: [els.transactionType, els.statusInput],
});

'''
app = replace_once(app, '};\n\nfunction loadState() {', '};\n\n' + editor_initialization + 'function loadState() {', "inicialização do editor")

payment_options = '''function refreshPaymentMethodOptions(preferred = "") {
  const modality = normalizeText(els.modalityInput.value);
  const inactiveCardMethods = new Set((state.catalogs?.cards || [])
    .filter((card) => card.isActive === false)
    .map((card) => normalizeText(card.paymentMethod)));
  const activeCardMethods = new Set((state.catalogs?.cards || [])
    .filter((card) => card.isActive !== false)
    .map((card) => normalizeText(card.paymentMethod)));
  const allowed = (state.catalogs?.paymentMethods || DEFAULT_CATALOGS.paymentMethods)
    .filter((item) => !modality || normalizeText(item.modality) === modality)
    .filter((item) => isCatalogItemActive("modalities", item.modality) || normalizeText(preferred) === normalizeText(item.description))
    .filter((item) => isCatalogItemActive("paymentMethods", item.description) || normalizeText(preferred) === normalizeText(item.description))
    .filter((item) => {
      if (modality !== "CREDITO") return true;
      const key = normalizeText(item.description);
      if (normalizeText(preferred) === key) return true;
      return activeCardMethods.has(key) && !inactiveCardMethods.has(key);
    })
    .map((item) => item.description)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const preferredValue = allowed.includes(preferred) ? preferred : modality === "CREDITO" ? "" : allowed[0] || "";
  const entries = [
    ...(modality === "CREDITO" ? [{ value: "", label: "Selecione o cartão", disabled: true }] : []),
    ...allowed.map((value) => ({ value, label: value })),
  ];
  replaceSelectOptions(els.paymentMethodInput, entries, preferredValue);
  transactionEditor.refreshAll();
}

function renderCurrentSituation'''
app = regex_once(
    app,
    r'function refreshPaymentMethodOptions\(preferred = ""\) \{.*?\n\}\n\nfunction renderCurrentSituation',
    payment_options,
    "formas de pagamento",
)

financial_accounts = '''function refreshFinancialAccountOptions(preferred = els.financialAccountInput?.value) {
  if (!els.financialAccountInput) return;
  const accounts = (state.catalogs?.accounts || []).filter((account) => account.isActive !== false || account.id === preferred);
  const selected = accounts.some((account) => account.id === preferred) ? preferred : suggestedFinancialAccountId();
  replaceSelectOptions(
    els.financialAccountInput,
    accounts.map((account) => ({
      value: account.id,
      label: `${account.name} - ${account.type === "BENEFIT" ? "Benefício" : "Monetária"}${account.isActive === false ? " (desativada)" : ""}`,
    })),
    selected,
  );
  transactionEditor.refreshAll();
}

function refreshFinancialAccountSubtypeOptions'''
app = regex_once(
    app,
    r'function refreshFinancialAccountOptions\(preferred = els\.financialAccountInput\?\.value\) \{.*?\n\}\n\nfunction refreshFinancialAccountSubtypeOptions',
    financial_accounts,
    "contas financeiras",
)

render_datalists = '''function renderDatalists(preferred = {}) {
  const currentGroup = preferred.group ?? els.groupInput.value;
  const groups = sortedCategories(currentGroup);
  replaceSelectOptions(els.groupInput, groups, currentGroup);

  const currentExpenseClass = preferred.expenseClass ?? els.expenseClassInput.value;
  const expenseClasses = sortedExpenseClasses(currentExpenseClass);
  replaceSelectOptions(els.expenseClassInput, expenseClasses, currentExpenseClass);

  const currentPayment = preferred.paymentMethod ?? els.paymentMethodInput.value;
  const currentModality = preferred.modality ?? els.modalityInput.value;
  const modalities = sortedModalities(currentModality);
  replaceSelectOptions(els.modalityInput, modalities, currentModality);
  refreshPaymentMethodOptions(currentPayment);
  refreshFinancialAccountOptions(preferred.financialAccountId ?? els.financialAccountInput?.value);

  if (selectedView === "catalogs") {
    refreshFinancialAccountSubtypeOptions();
    refreshPaymentCatalogModalityOptions(editingPaymentMethod ? els.newPaymentModalityInput.value : "");
  }
  if (els.dialog?.open && document.activeElement === els.descriptionInput) renderDescriptionSuggestions();
  transactionEditor.refreshAll();
}

function descriptionHistory'''
app = regex_once(
    app,
    r'function renderDatalists\(preferred = \{\}\) \{.*?\n\}\n\nfunction descriptionHistory',
    render_datalists,
    "listas do formulário",
)

app = replace_once(
    app,
    '  syncCardDates();\n  syncInstallmentFields();\n  if (document.activeElement === els.descriptionInput) renderDescriptionSuggestions();\n}\n\nfunction isInstallmentModality()',
    '  syncCardDates();\n  syncInstallmentFields();\n  if (document.activeElement === els.descriptionInput) renderDescriptionSuggestions();\n  transactionEditor.refreshAll();\n}\n\nfunction isInstallmentModality()',
    "atualização do tipo",
)

app = replace_once(
    app,
    '  syncFinancialAccountSelection({ force: true });\n  syncCardDates({ recalculate: true });\n  syncInstallmentFields();\n}\n\nfunction syncModalityPaymentOptions()',
    '  syncFinancialAccountSelection({ force: true });\n  syncCardDates({ recalculate: true });\n  syncInstallmentFields();\n  transactionEditor.refreshAll();\n}\n\nfunction syncModalityPaymentOptions()',
    "sincronização da forma de pagamento",
)

app = replace_once(
    app,
    '  syncFinancialAccountSelection({ force: true });\n  syncCardDates({ recalculate: true });\n  syncInstallmentFields();\n}\n\nfunction openTransactionDialog(item = null)',
    '  syncFinancialAccountSelection({ force: true });\n  syncCardDates({ recalculate: true });\n  syncInstallmentFields();\n  transactionEditor.refreshAll();\n}\n\nfunction openTransactionDialog(item = null)',
    "sincronização da modalidade",
)

app = replace_once(
    app,
    '  syncAmountFields();\n  document.body.classList.add("transaction-modal-open");\n  els.dialog.showModal();\n  requestAnimationFrame(() => els.transactionType.focus({ preventScroll: true }));\n}',
    '  syncAmountFields();\n  document.body.classList.add("transaction-modal-open");\n  els.dialog.showModal();\n  transactionEditor.open();\n  requestAnimationFrame(() => transactionEditor.focusPrimary());\n}',
    "abertura do formulário",
)

app = replace_once(
    app,
    'function saveTransaction(event) {\n  event.preventDefault();',
    'function renderAfterTransactionMutation() {\n  renderPeriodControls();\n  scheduleActiveViewRender();\n}\n\nfunction saveTransaction(event) {\n  event.preventDefault();',
    "renderização pós-salvamento",
)

app = replace_once(
    app,
    '      showToast("Parcelamento criado", `${installments.length} parcela(s) geradas até ${formatDate(installments.at(-1).date)}`, "success");\n      render();\n      return;',
    '      showToast("Parcelamento criado", `${installments.length} parcela(s) geradas até ${formatDate(installments.at(-1).date)}`, "success");\n      renderAfterTransactionMutation();\n      return;',
    "salvamento de parcelas",
)

app = replace_once(
    app,
    '    "success"\n  );\n  render();\n}\n\nfunction deleteTransaction()',
    '    "success"\n  );\n  renderAfterTransactionMutation();\n}\n\nfunction deleteTransaction()',
    "salvamento do lançamento",
)

app = replace_once(
    app,
    '  showToast("Lançamento excluído", removed ? removed.description : "O lançamento foi removido.", "success");\n  render();\n}\n\nfunction togglePaid',
    '  showToast("Lançamento excluído", removed ? removed.description : "O lançamento foi removido.", "success");\n  renderAfterTransactionMutation();\n}\n\nfunction togglePaid',
    "exclusão do lançamento",
)

app = app.replace('.slice(0, 40);', '.slice(0, 20);', 1)

suggestions = '''function renderDescriptionSuggestions() {
  descriptionSuggestionItems = matchingDescriptions();
  activeDescriptionSuggestion = -1;
  if (!descriptionSuggestionItems.length) {
    closeDescriptionSuggestions();
    return;
  }
  const fragment = document.createDocumentFragment();
  descriptionSuggestionItems.forEach((item, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.id = `description-suggestion-${index}`;
    option.className = "autocomplete-option";
    option.dataset.descriptionSuggestionIndex = String(index);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    const label = document.createElement("span");
    label.textContent = item.description;
    const useCount = document.createElement("small");
    useCount.textContent = item.count > 1 ? `${item.count} usos` : "Usado anteriormente";
    option.append(label, useCount);
    fragment.append(option);
  });
  els.descriptionSuggestions.replaceChildren(fragment);
  els.descriptionSuggestions.classList.remove("hidden");
  els.descriptionInput.setAttribute("aria-expanded", "true");
}

function handleDescriptionKeydown'''
app = regex_once(
    app,
    r'function renderDescriptionSuggestions\(\) \{.*?\n\}\n\nfunction handleDescriptionKeydown',
    suggestions,
    "sugestões da descrição",
)

app = replace_once(
    app,
    'els.descriptionInput.addEventListener("blur", () => window.setTimeout(closeDescriptionSuggestions, 120));\nels.paymentMethodInput.addEventListener("change", syncPaymentModality);',
    'els.descriptionInput.addEventListener("blur", () => window.setTimeout(closeDescriptionSuggestions, 120));\nels.descriptionSuggestions.addEventListener("pointerdown", (event) => event.preventDefault());\nels.descriptionSuggestions.addEventListener("click", (event) => {\n  const option = event.target.closest("[data-description-suggestion-index]");\n  if (!option) return;\n  selectDescriptionSuggestion(Number(option.dataset.descriptionSuggestionIndex));\n});\nels.paymentMethodInput.addEventListener("change", syncPaymentModality);',
    "eventos das sugestões",
)

app = replace_once(
    app,
    'els.dialog.addEventListener("close", () => {\n  closeDescriptionSuggestions();\n  document.body.classList.remove("transaction-modal-open");',
    'els.dialog.addEventListener("close", () => {\n  closeDescriptionSuggestions();\n  transactionEditor.close();\n  document.body.classList.remove("transaction-modal-open");',
    "fechamento do editor",
)

APP.write_text(app, encoding="utf-8")

editor = EDITOR.read_text(encoding="utf-8")
editor = replace_once(
    editor,
    '  const available = normalizedEntries.find((entry) => entry.value === preferred && !entry.disabled)\n    || normalizedEntries.find((entry) => !entry.disabled)',
    '  const available = normalizedEntries.find((entry) => entry.value === preferred)\n    || normalizedEntries.find((entry) => !entry.disabled)',
    "seleção do placeholder",
)
editor = replace_once(
    editor,
    '      button.disabled = option.disabled || this.select.disabled;\n      fragment.append(button);',
    '      button.dataset.optionDisabled = option.disabled ? "1" : "0";\n      button.disabled = option.disabled || this.select.disabled;\n      fragment.append(button);',
    "estado dos segmentos",
)
editor = replace_once(
    editor,
    '      button.disabled = this.select.disabled || button.disabled;\n    });',
    '      button.disabled = this.select.disabled || button.dataset.optionDisabled === "1";\n    });',
    "reativação dos segmentos",
)
EDITOR.write_text(editor, encoding="utf-8")

styles = STYLES.read_text(encoding="utf-8")
marker = "/* Transaction editor v2 */"
if marker not in styles:
    styles += r'''

/* Transaction editor v2 */
body.transaction-editor-active {
  overflow: hidden;
  background: #eef3f1;
}

.transaction-editor-v2 {
  width: min(1040px, calc(100vw - 28px));
  max-width: none;
  max-height: calc(100dvh - 24px);
  margin: auto;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 24px;
  background: #f4f7f5;
  box-shadow: 0 32px 100px rgba(5, 43, 36, .30);
}

.transaction-editor-v2::backdrop {
  background: rgba(4, 31, 27, .76);
  backdrop-filter: blur(5px);
}

.transaction-editor-form-v2 {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  width: 100%;
  max-height: calc(100dvh - 24px);
  overflow: hidden;
}

.transaction-editor-form-v2 > .modal-header {
  position: relative;
  z-index: 80;
  margin: 0;
  padding: 22px 26px 14px;
  border-bottom: 1px solid #dce5e1;
  background: #fff;
}

.transaction-editor-form-v2 > .modal-header h2 {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.8rem);
}

.transaction-editor-intro {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 26px;
  border-bottom: 1px solid #dce5e1;
  background: #f8fbfa;
}

.transaction-editor-intro span {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  color: #075c4f;
  background: #dff3ed;
  font-size: .7rem;
  font-weight: 900;
  letter-spacing: .08em;
}

.transaction-editor-intro p {
  margin: 0;
  color: #5f716b;
  font-size: .88rem;
  font-weight: 650;
}

.transaction-editor-layout {
  display: grid !important;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr);
  gap: 14px !important;
  min-height: 0;
  padding: 18px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.transaction-editor-section {
  position: relative;
  min-width: 0;
  padding: 16px;
  border: 1px solid #dbe5e1;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(14, 58, 49, .045);
}

.transaction-editor-section:first-child,
.transaction-editor-section:last-child {
  grid-column: 1;
}

.transaction-editor-section:nth-child(2),
.transaction-editor-section:nth-child(3) {
  grid-column: 2;
}

.transaction-editor-section:nth-child(3) {
  grid-row: 2 / span 2;
}

.transaction-editor-section > header {
  margin-bottom: 13px;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf2f0;
}

.transaction-editor-section > header strong,
.transaction-editor-section > header small {
  display: block;
}

.transaction-editor-section > header strong {
  color: #173b34;
  font-size: .96rem;
}

.transaction-editor-section > header small {
  margin-top: 3px;
  color: #73837e;
  font-size: .76rem;
  font-weight: 600;
}

.transaction-editor-section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
  align-items: start;
}

.transaction-editor-section-grid > label,
.transaction-editor-section-grid > .installment-fields {
  min-width: 0;
  margin: 0;
}

.transaction-editor-section-grid > .full,
.transaction-editor-section-grid > .autocomplete-label,
.transaction-editor-section-grid > .installment-fields,
.transaction-editor-section-grid > .installment-edit-scope {
  grid-column: 1 / -1;
}

.transaction-editor-technical-field {
  display: none !important;
}

.transaction-editor-form-v2 label {
  gap: 7px;
  color: #345149;
  font-size: .72rem;
  font-weight: 850;
  letter-spacing: .035em;
}

.transaction-editor-form-v2 input,
.transaction-editor-form-v2 textarea,
.fast-combobox-control {
  min-height: 46px;
  border: 1px solid #cbdad5;
  border-radius: 11px;
  background: #fbfdfc;
  box-shadow: none;
  transition: border-color 100ms ease, box-shadow 100ms ease, background 100ms ease;
}

.transaction-editor-form-v2 input:focus,
.transaction-editor-form-v2 textarea:focus,
.fast-combobox-control:focus-visible,
.fast-combobox.open .fast-combobox-control {
  outline: 0;
  border-color: #168c78;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(22, 140, 120, .13);
}

.fast-combobox-source,
.fast-segmented-source {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  overflow: hidden !important;
  clip: rect(0 0 0 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
  opacity: 0 !important;
}

.fast-combobox {
  position: relative;
  min-width: 0;
}

.fast-combobox.open {
  z-index: 120;
}

.fast-combobox-control {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 13px;
  color: #182f29;
  font: inherit;
  font-size: .88rem;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
}

.fast-combobox-control:disabled {
  color: #87938f;
  background: #eef2f0;
  cursor: not-allowed;
}

.fast-combobox-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fast-combobox-arrow {
  flex: 0 0 auto;
  color: #55716a;
  font-size: 1.05rem;
  transition: transform 100ms ease;
}

.fast-combobox.open .fast-combobox-arrow {
  transform: rotate(180deg);
}

.fast-combobox-popover {
  position: absolute;
  z-index: 500;
  top: calc(100% + 6px);
  left: 0;
  width: max(100%, 280px);
  max-width: min(430px, calc(100vw - 48px));
  padding: 9px;
  border: 1px solid #bdd1cb;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 22px 55px rgba(8, 54, 45, .24);
}

.fast-combobox-search-wrap {
  position: sticky;
  top: 0;
  z-index: 2;
  padding-bottom: 7px;
  background: #fff;
}

.fast-combobox-search {
  width: 100%;
  min-height: 40px !important;
  padding: 8px 11px !important;
  font-size: .84rem !important;
}

.fast-combobox-options {
  display: grid;
  gap: 3px;
  max-height: 260px;
  overflow: auto;
  overscroll-behavior: contain;
}

.fast-combobox-option {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 0;
  border-radius: 9px;
  color: #25433b;
  background: transparent;
  font: inherit;
  font-size: .82rem;
  font-weight: 680;
  text-align: left;
  cursor: pointer;
}

.fast-combobox-option:hover,
.fast-combobox-option.active {
  background: #eaf6f2;
}

.fast-combobox-option.selected {
  color: #075c4f;
  background: #dff3ed;
  font-weight: 850;
}

.fast-combobox-option:disabled {
  color: #9aa6a2;
  background: #f5f7f6;
  cursor: not-allowed;
}

.fast-combobox-empty,
.fast-combobox-limit {
  display: block;
  padding: 12px 8px;
  color: #74847f;
  font-size: .76rem;
  font-weight: 650;
}

.fast-segmented-control {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 5px;
  padding: 4px;
  border: 1px solid #cbdad5;
  border-radius: 12px;
  background: #eef4f1;
}

.fast-segmented-control button {
  min-height: 37px;
  padding: 7px 10px;
  border: 0;
  border-radius: 9px;
  color: #50655f;
  background: transparent;
  font: inherit;
  font-size: .78rem;
  font-weight: 850;
  cursor: pointer;
}

.fast-segmented-control button.active {
  color: #fff;
  background: #116f60;
  box-shadow: 0 5px 14px rgba(17, 111, 96, .22);
}

.transaction-editor-form-v2 > .modal-actions {
  position: relative;
  z-index: 90;
  margin: 0;
  padding: 14px 22px;
  border-top: 1px solid #dce5e1;
  background: #fff;
  box-shadow: 0 -8px 24px rgba(12, 48, 41, .06);
}

.transaction-editor-form-v2 > .modal-actions .button {
  min-height: 43px;
}

.transaction-editor-form-v2.is-saving {
  cursor: progress;
}

.transaction-editor-form-v2.is-saving .transaction-editor-layout {
  pointer-events: none;
  opacity: .72;
}

@media (max-width: 780px) {
  .transaction-editor-v2 {
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }
  .transaction-editor-form-v2 {
    height: 100dvh;
    max-height: 100dvh;
  }
  .transaction-editor-layout {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .transaction-editor-section,
  .transaction-editor-section:first-child,
  .transaction-editor-section:last-child,
  .transaction-editor-section:nth-child(2),
  .transaction-editor-section:nth-child(3) {
    grid-column: 1;
    grid-row: auto;
  }
  .transaction-editor-section-grid {
    grid-template-columns: 1fr;
  }
  .transaction-editor-section-grid > * {
    grid-column: 1 / -1;
  }
  .transaction-editor-intro {
    align-items: flex-start;
    padding-inline: 16px;
  }
  .transaction-editor-form-v2 > .modal-header {
    padding-inline: 16px;
  }
  .transaction-editor-form-v2 > .modal-actions {
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  }
  .fast-combobox-popover {
    width: 100%;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .transaction-editor-v2 *,
  .transaction-editor-v2 *::before,
  .transaction-editor-v2 *::after {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}
'''
STYLES.write_text(styles, encoding="utf-8")

# Remove the one-shot automation after applying the patch.
if Path(__file__).exists():
    Path(__file__).unlink()
if WORKFLOW.exists():
    WORKFLOW.unlink()

print("Editor de lançamentos v2 aplicado com sucesso.")
