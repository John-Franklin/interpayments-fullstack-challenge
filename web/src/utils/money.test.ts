import { describe, expect, test } from 'vitest'
import { formatMinorUnits, formatMoney, minorUnitDigits } from './money'

describe('formatMoney', () => {
  test('formats in the given currency', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
  })
})

describe('formatMinorUnits', () => {
  test('cents to dollars', () => {
    expect(formatMinorUnits(10300, 'USD')).toBe('$103.00')
  })

  test('yen have no minor unit', () => {
    expect(formatMinorUnits(48940, 'JPY')).toBe('¥48,940')
  })
})

describe('minorUnitDigits', () => {
  test("is the currency's decimal places", () => {
    expect(minorUnitDigits('USD')).toBe(2)
    expect(minorUnitDigits('JPY')).toBe(0)
  })
})
