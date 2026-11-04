import { describe, expect, test } from 'vitest'
import { formatMinorUnits, formatMoney } from './money'

describe('formatMoney', () => {
  test('formats in the given currency', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
  })
})

describe('formatMinorUnits', () => {
  test('cents to dollars', () => {
    expect(formatMinorUnits(10300, 'USD')).toBe('$103.00')
  })
})
