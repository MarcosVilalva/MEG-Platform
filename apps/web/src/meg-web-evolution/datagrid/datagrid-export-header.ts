export type ExportFilterSummary = {
  label: string;
  summary: string;
};

export function timeInSaoPaulo(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));

  return {
    label: `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`,
    file: `${parts.year}-${parts.month}-${parts.day}_${parts.hour}${parts.minute}`,
  };
}

export function exportPeriodLabel(period?: string): string {
  return period?.trim() || 'Período não informado';
}

export function exportFilterLabels(filters: ExportFilterSummary[]): string[] {
  return filters.length ? filters.map((item) => `${item.label}: ${item.summary}`) : ['Nenhum filtro aplicado'];
}

export async function officialLogo(): Promise<{ url: string; aspect: number } | null> {
  try {
    const url = new URL(import.meta.env.BASE_URL + 'brand/logo-meg-financas.svg', window.location.origin);
    const result = await fetch(url);
    if (!result.ok) return null;
    const objectUrl = URL.createObjectURL(new Blob([await result.text()], { type: 'image/svg+xml;charset=utf-8' }));

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Logo indisponível'));
        image.src = objectUrl;
      });

      const aspect = image.naturalWidth / image.naturalHeight || 3;
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = Math.max(1, Math.round(1200 / aspect));
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return { url: canvas.toDataURL('image/png'), aspect };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}
