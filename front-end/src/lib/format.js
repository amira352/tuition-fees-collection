const egp = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  currencyDisplay: "code",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("en-US");

/** 1250000 -> "EGP 1,250,000" */
export function formatEGP(value) {
  return egp.format(value); // en-US + code display -> "EGP 1,250,000"
}

/** 1248 -> "1,248" */
export function formatNumber(value) {
  return plain.format(value);
}

/** 0.18 or 18 -> "18%" (accepts a fraction or an already-scaled percent) */
export function formatPercent(value) {
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}
