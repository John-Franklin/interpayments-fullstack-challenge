import { describe, expect, it } from 'vitest'
import { binOf, formatCardNumber, isValidCardNumber, parseExpiry } from './card'

describe('formatCardNumber', () => {
  it('groups digits in fours and drops anything else', () => {
    expect(formatCardNumber('4111-1111 1111x1111')).toBe('4111 1111 1111 1111')
  })
})

describe('binOf', () => {
  it('waits for 8 digits', () => {
    expect(binOf('4111 111')).toBeNull()
    expect(binOf('4111 1111 1')).toBe('41111111')
  })
})

describe('isValidCardNumber', () => {
  it('accepts numbers that pass Luhn', () => {
    expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true)
    expect(isValidCardNumber('3782 822463 10005')).toBe(true)
  })

  it('rejects a bad check digit or a short number', () => {
    expect(isValidCardNumber('4111 1111 1111 1112')).toBe(false)
    expect(isValidCardNumber('4111')).toBe(false)
  })
})

describe('parseExpiry', () => {
  it('parses MM/YY', () => {
    expect(parseExpiry('09/29')).toEqual({ month: 9, year: 2029 })
  })

  it('returns null for a bad month or no slash', () => {
    expect(parseExpiry('13/29')).toBeNull()
    expect(parseExpiry('0929')).toBeNull()
  })
})
