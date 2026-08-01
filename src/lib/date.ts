function toDate(value?: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(value?: Date | string | null, fallback = "—") {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  return dateFormatter.format(parsed);
}

export function formatDateTime(value?: Date | string | null, fallback = "—") {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  return dateTimeFormatter.format(parsed).replace(",", "");
}
