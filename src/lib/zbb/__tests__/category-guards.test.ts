import { describe, it, expect } from 'vitest'
import {
  canDeleteCategory,
  canDeleteGroup,
  canEditItem,
  canArchiveItem,
} from '../category-guards'

describe('canDeleteCategory', () => {
  it('allows deletion when no transactions', () => {
    expect(canDeleteCategory(0)).toBe(true)
  })

  it('prevents deletion when transactions exist', () => {
    expect(canDeleteCategory(1)).toBe(false)
    expect(canDeleteCategory(100)).toBe(false)
  })
})

describe('canDeleteGroup', () => {
  it('allows deletion when all categories have zero transactions', () => {
    expect(canDeleteGroup([0, 0, 0])).toBe(true)
  })

  it('allows deletion for an empty group', () => {
    expect(canDeleteGroup([])).toBe(true)
  })

  it('prevents deletion when any category has transactions', () => {
    expect(canDeleteGroup([0, 5, 0])).toBe(false)
    expect(canDeleteGroup([10])).toBe(false)
  })
})

describe('canEditItem', () => {
  it('allows editing non-system items', () => {
    expect(canEditItem(false)).toBe(true)
  })

  it('prevents editing system items', () => {
    expect(canEditItem(true)).toBe(false)
  })
})

describe('canArchiveItem', () => {
  it('allows archiving non-system items', () => {
    expect(canArchiveItem(false)).toBe(true)
  })

  it('prevents archiving system items', () => {
    expect(canArchiveItem(true)).toBe(false)
  })
})
