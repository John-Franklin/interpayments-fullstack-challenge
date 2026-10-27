const formatters = new Map<string, Intl.NumberFormat>()

const formatter = (currency: string) => {
  if (!formatters.has(currency)) {
    formatters.set(currency, new Intl.NumberFormat('en-US', { style: 'currency', currency }))
  }
  return formatters.get(currency)!
}

export const formatMoney = (amount: number, currency: string) => formatter(currency).format(amount)

// gateway amounts come back in minor units (cents)
export const formatMinorUnits = (minor: number, currency: string) => {
  const digits = formatter(currency).resolvedOptions().maximumFractionDigits ?? 2
  return formatMoney(minor / 10 ** digits, currency)
}

export const previewSurcharge = (amount: number, rate: number) => Math.round(amount * rate) / 100
