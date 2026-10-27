import { describe, expect, test } from 'vitest'
import { formatMinorUnits, formatMoney, previewSurcharge } from './money'

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

describe('previewSurcharge', () => {
  test('takes the rate as a percent and rounds to the cent', () => {
    expect(previewSurcharge(100, 3)).toBe(3)
    expect(previewSurcharge(12.34, 3)).toBe(0.37)
    expect(previewSurcharge(80, 2.5)).toBe(2)
  })
})
