import '../styles/period.css';

export type WebNextPeriodMode = 'month' | 'range' | 'all';

export function WebNextPeriodPopover({
  open,
  mode,
  month,
  start,
  end,
  currentLabel,
  loading,
  error,
  onModeChange,
  onMonthChange,
  onStartChange,
  onEndChange,
  onStepMonth,
  onQuickCurrent,
  onQuickPrevious,
  onApply,
  onClose,
}: {
  open: boolean;
  mode: WebNextPeriodMode;
  month: string;
  start: string;
  end: string;
  currentLabel: string;
  loading: boolean;
  error: string;
  onModeChange: (mode: WebNextPeriodMode) => void;
  onMonthChange: (month: string) => void;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  onStepMonth: (offset: number) => void;
  onQuickCurrent: () => void;
  onQuickPrevious: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return <div className="mnx-period-overlay" data-web-next-overlay="period">
    <button className="mnx-period-backdrop" type="button" aria-label="Fechar período" onClick={onClose} />
    <section className="mnx-period-popover" role="dialog" aria-modal="true" aria-label="Selecionar período">
      <header><div><small>Período de consulta</small><strong>{currentLabel}</strong></div><button type="button" onClick={onClose} aria-label="Fechar">×</button></header>
      <div className="mnx-period-modes">
        <button className={mode === 'month' ? 'is-active' : ''} type="button" onClick={() => onModeChange('month')}>Mês</button>
        <button className={mode === 'range' ? 'is-active' : ''} type="button" onClick={() => onModeChange('range')}>Intervalo</button>
        <button className={mode === 'all' ? 'is-active' : ''} type="button" onClick={() => onModeChange('all')}>Tudo</button>
      </div>
      {mode === 'month' ? <div className="mnx-period-month">
        <div className="mnx-period-stepper"><button type="button" onClick={() => onStepMonth(-1)}>‹</button><input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /><button type="button" onClick={() => onStepMonth(1)}>›</button></div>
        <div className="mnx-period-quick"><button type="button" onClick={onQuickCurrent}>Mês atual</button><button type="button" onClick={onQuickPrevious}>Anterior</button></div>
      </div> : null}
      {mode === 'range' ? <div className="mnx-period-range"><label><span>De</span><input type="date" value={start} onChange={(event) => onStartChange(event.target.value)} /></label><label><span>Até</span><input type="date" value={end} onChange={(event) => onEndChange(event.target.value)} /></label></div> : null}
      {mode === 'all' ? <p className="mnx-period-all">Consulta todo o histórico financeiro disponível.</p> : null}
      {error ? <p className="mnx-period-error">{error}</p> : null}
      <footer><button type="button" onClick={onClose} disabled={loading}>Cancelar</button><button className="is-primary" type="button" onClick={onApply} disabled={loading}>{loading ? 'Carregando…' : 'Aplicar período'}</button></footer>
    </section>
  </div>;
}
