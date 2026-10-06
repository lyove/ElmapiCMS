export function formatMoney(amount: number, symbol = "$"): string {
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${normalized.toFixed(2)}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
