export const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

export const numberFmt = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 3
});

export function formatCLP(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return clp.format(Number.isFinite(n) ? n : 0);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return numberFmt.format(Number.isFinite(n) ? n : 0);
}

export function formatPercent(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${(n * 100).toFixed(2)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-CL');
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Error desconocido';
}
