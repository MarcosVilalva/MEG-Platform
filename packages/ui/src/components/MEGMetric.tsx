interface MEGMetricProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warning' | 'danger';
}

export function MEGMetric({ label, value, hint, tone = 'default' }: MEGMetricProps) {
  return (
    <article className={`meg-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}
