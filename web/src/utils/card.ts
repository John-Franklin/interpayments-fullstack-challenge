export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export const formatCardNumber = (value: string) =>
  digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')

export const binOf = (cardNumber: string) => {
  const digits = digitsOnly(cardNumber)
  return digits.length >= 8 ? digits.slice(0, 8) : null
}

// Luhn check
export const isValidCardNumber = (value: string) => {
  const digits = digitsOnly(value)
  if (digits.length < 12 || digits.length > 19) return false

  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

// "MM/YY" -> { month, year }, null if it doesn't parse
export const parseExpiry = (value: string) => {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(value.trim())
  if (!match) return null

  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  return month >= 1 && month <= 12 ? { month, year } : null
}
