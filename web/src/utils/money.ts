const formatters = new Map<string, Intl.NumberFormat>()

const formatter = (currency: string) => {
  if (!formatters.has(currency)) {
    formatters.set(currency, new Intl.NumberFormat('en-US', { style: 'currency', currency }))
  }
  return formatters.get(currency)!
}

export const formatMoney = (amount: number, currency: string) => formatter(currency).format(amount)

// decimal places in the currency's smallest unit: 2 for USD (cents), 0 for JPY (whole yen)
export const minorUnitDigits = (currency: string) => formatter(currency).resolvedOptions().maximumFractionDigits ?? 2

// gateway amounts come back in minor units (cents)
export const formatMinorUnits = (minor: number, currency: string) =>
  formatMoney(minor / 10 ** minorUnitDigits(currency), currency)
