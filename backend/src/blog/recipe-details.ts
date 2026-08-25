import { stripHtml } from '../common/html-sanitize'

// Limits for the structured recipe facts behind the "At a glance" and
// "Ingredients" panels. The AI content pipeline writes blog_posts directly and
// bypasses CreateBlogPostDto, so both paths import these instead of restating
// them: a draft that passes generation can never be rejected when an admin
// later saves it from the form.
export const RECIPE_LIMITS = {
  // 48 h covers overnight proving, cold fermentation and long braises.
  MINUTES_MAX: 2880,
  SERVINGS_MAX: 100,
  EQUIPMENT_MAX: 120,
  INGREDIENTS_MAX: 60,
  INGREDIENT_MAX: 200,
} as const

// The structured half of a recipe, kept out of the article HTML so the page can
// lay it out. Every field is optional: technique and planning guides go through
// the same table and simply carry none of it.
export interface RecipeDetails {
  prepMinutes: number | null
  cookMinutes: number | null
  servings: number | null
  equipment: string | null
  ingredients: string[]
}

export const EMPTY_RECIPE_DETAILS: RecipeDetails = {
  prepMinutes: null,
  cookMinutes: null,
  servings: null,
  equipment: null,
  ingredients: [],
}

// Out-of-range or unparsable becomes null rather than throwing: one implausible
// number from the model should cost the draft that field, not the whole run.
function normalizeNumber(value: unknown, min: number, max: number): number | null {
  // Only a number or a numeric string is a value. Everything else is rejected
  // before Number() sees it, because Number(null), Number([]) and Number(false)
  // are all 0 — a plausible minute count that was never actually stated.
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const rounded = Math.round(n)
  if (rounded < min || rounded > max) return null
  return rounded
}

export function normalizeMinutes(value: unknown): number | null {
  return normalizeNumber(value, 0, RECIPE_LIMITS.MINUTES_MAX)
}

export function normalizeServings(value: unknown): number | null {
  return normalizeNumber(value, 1, RECIPE_LIMITS.SERVINGS_MAX)
}

export function normalizeEquipment(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = stripHtml(value).trim().slice(0, RECIPE_LIMITS.EQUIPMENT_MAX)
  return text || null
}

// Blank lines are dropped rather than kept as empty <li>s, and the list is
// truncated instead of rejected — the article body remains the source of truth.
export function normalizeIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? stripHtml(item).trim().slice(0, RECIPE_LIMITS.INGREDIENT_MAX) : ''))
    .filter(item => item !== '')
    .slice(0, RECIPE_LIMITS.INGREDIENTS_MAX)
}

// True when there is anything to put in the "At a glance" panel. Ingredients
// are deliberately excluded: they have their own panel and a post can carry a
// list without any timing.
export function hasGlanceFacts(details: Pick<RecipeDetails, 'prepMinutes' | 'cookMinutes' | 'servings' | 'equipment'>): boolean {
  return (
    details.prepMinutes !== null ||
    details.cookMinutes !== null ||
    details.servings !== null ||
    details.equipment !== null
  )
}
