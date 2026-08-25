import { describe, expect, it } from 'vitest'
import { formatMinutes, hasGlanceFacts, recipeIngredients, totalMinutes } from './recipe'
import type { BlogPost } from '../types'

const bare = {
  prepMinutes: null,
  cookMinutes: null,
  servings: null,
  equipment: null,
} as Pick<BlogPost, 'prepMinutes' | 'cookMinutes' | 'servings' | 'equipment'>

describe('formatMinutes', () => {
  it('reads minutes under an hour plainly', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(0)).toBe('0 min')
  })

  it('drops the minutes part on a whole number of hours', () => {
    expect(formatMinutes(180)).toBe('3 hr')
    expect(formatMinutes(60)).toBe('1 hr')
  })

  it('combines both parts otherwise', () => {
    expect(formatMinutes(90)).toBe('1 hr 30 min')
    expect(formatMinutes(215)).toBe('3 hr 35 min')
  })

  it('returns null for a missing or nonsensical value so the row is skipped', () => {
    expect(formatMinutes(null)).toBeNull()
    expect(formatMinutes(undefined)).toBeNull()
    expect(formatMinutes(-10)).toBeNull()
    expect(formatMinutes(NaN)).toBeNull()
  })
})

describe('totalMinutes', () => {
  it('adds prep and cook', () => {
    expect(totalMinutes({ ...bare, prepMinutes: 10, cookMinutes: 35 })).toBe(45)
  })

  it('treats a missing half as zero rather than discarding the known one', () => {
    expect(totalMinutes({ ...bare, cookMinutes: 35 })).toBe(35)
    expect(totalMinutes({ ...bare, prepMinutes: 0 })).toBe(0)
  })

  it('is null only when neither half is known', () => {
    expect(totalMinutes(bare)).toBeNull()
  })
})

describe('hasGlanceFacts', () => {
  it('is false on an article with no recipe facts', () => {
    expect(hasGlanceFacts(bare)).toBe(false)
  })

  it('counts a zero prep time as a fact', () => {
    expect(hasGlanceFacts({ ...bare, prepMinutes: 0 })).toBe(true)
  })

  it('ignores an equipment string that is only whitespace', () => {
    expect(hasGlanceFacts({ ...bare, equipment: '   ' })).toBe(false)
    expect(hasGlanceFacts({ ...bare, equipment: 'One roasting tray' })).toBe(true)
  })
})

describe('recipeIngredients', () => {
  it('keeps usable lines in order', () => {
    expect(recipeIngredients({ ingredients: ['800 g potatoes', '1 lemon'] })).toEqual([
      '800 g potatoes',
      '1 lemon',
    ])
  })

  it('drops blank lines and survives a response written before the migration', () => {
    expect(recipeIngredients({ ingredients: ['800 g potatoes', '', '  '] })).toEqual(['800 g potatoes'])
    expect(recipeIngredients({} as Pick<BlogPost, 'ingredients'>)).toEqual([])
  })
})
