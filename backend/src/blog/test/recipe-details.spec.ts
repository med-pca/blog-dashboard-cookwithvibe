import {
  RECIPE_LIMITS,
  hasGlanceFacts,
  normalizeEquipment,
  normalizeIngredients,
  normalizeMinutes,
  normalizeServings,
} from '../recipe-details'

describe('normalizeMinutes', () => {
  it('accepts zero — a no-prep recipe is not a missing value', () => {
    expect(normalizeMinutes(0)).toBe(0)
  })

  it('rounds fractional minutes the model may return', () => {
    expect(normalizeMinutes(12.4)).toBe(12)
    expect(normalizeMinutes(12.6)).toBe(13)
  })

  it('accepts a numeric string', () => {
    expect(normalizeMinutes('45')).toBe(45)
  })

  it('drops values outside the plausible range instead of clamping them', () => {
    expect(normalizeMinutes(-5)).toBeNull()
    expect(normalizeMinutes(RECIPE_LIMITS.MINUTES_MAX + 1)).toBeNull()
  })

  it('drops anything unparsable', () => {
    expect(normalizeMinutes(null)).toBeNull()
    expect(normalizeMinutes('about an hour')).toBeNull()
    expect(normalizeMinutes({})).toBeNull()
  })
})

describe('normalizeServings', () => {
  it('rejects zero servings — a recipe nobody can eat is a bad value', () => {
    expect(normalizeServings(0)).toBeNull()
  })

  it('accepts a normal yield and drops an implausible one', () => {
    expect(normalizeServings(4)).toBe(4)
    expect(normalizeServings(RECIPE_LIMITS.SERVINGS_MAX + 1)).toBeNull()
  })
})

describe('normalizeEquipment', () => {
  it('strips HTML the model may leak into a plain-text field', () => {
    expect(normalizeEquipment('<strong>One roasting tray</strong>')).toBe('One roasting tray')
  })

  it('truncates rather than rejecting an over-long value', () => {
    const long = 'x'.repeat(RECIPE_LIMITS.EQUIPMENT_MAX + 50)
    expect(normalizeEquipment(long)).toHaveLength(RECIPE_LIMITS.EQUIPMENT_MAX)
  })

  it('turns blank and non-string input into null', () => {
    expect(normalizeEquipment('   ')).toBeNull()
    expect(normalizeEquipment(null)).toBeNull()
    expect(normalizeEquipment(42)).toBeNull()
  })
})

describe('normalizeIngredients', () => {
  it('keeps the lines in order and strips HTML', () => {
    expect(normalizeIngredients(['800 g potatoes', '<em>1 lemon</em>'])).toEqual(['800 g potatoes', '1 lemon'])
  })

  it('drops blank entries rather than rendering empty list items', () => {
    expect(normalizeIngredients(['800 g potatoes', '', '   ', null])).toEqual(['800 g potatoes'])
  })

  it('truncates an over-long list instead of rejecting the draft', () => {
    const many = Array.from({ length: RECIPE_LIMITS.INGREDIENTS_MAX + 10 }, (_, i) => `item ${i}`)
    expect(normalizeIngredients(many)).toHaveLength(RECIPE_LIMITS.INGREDIENTS_MAX)
  })

  it('returns an empty array for anything that is not an array', () => {
    expect(normalizeIngredients('800 g potatoes')).toEqual([])
    expect(normalizeIngredients(undefined)).toEqual([])
  })
})

describe('hasGlanceFacts', () => {
  const empty = { prepMinutes: null, cookMinutes: null, servings: null, equipment: null }

  it('is false when the post carries no timing at all', () => {
    expect(hasGlanceFacts(empty)).toBe(false)
  })

  it('is true as soon as one fact is present, including a zero prep time', () => {
    expect(hasGlanceFacts({ ...empty, prepMinutes: 0 })).toBe(true)
    expect(hasGlanceFacts({ ...empty, equipment: 'One roasting tray' })).toBe(true)
  })
})
