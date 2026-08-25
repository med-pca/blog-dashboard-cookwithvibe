import type { BlogPost } from '../types'

// The structured recipe facts a post may carry. The backend fills these during
// AI generation and an admin can correct them before publishing; every one of
// them is absent on technique and planning articles, which is why nothing here
// throws on a missing value — the caller just skips that row.

type GlanceFacts = Pick<BlogPost, 'prepMinutes' | 'cookMinutes' | 'servings' | 'equipment'>

// Minutes as a cook reads them: "45 min", "1 hr 30 min", "3 hr".
// Returns null for anything that is not a usable duration so the caller can
// leave the row out rather than print "null min".
export function formatMinutes(minutes: number | null | undefined): string | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

// Prep plus cook, for the single "total time" figure on cards and meta rows.
// Null unless at least one half is known; a known half alone is still a useful
// lower bound and is returned as-is.
export function totalMinutes(post: GlanceFacts): number | null {
  const prep = typeof post.prepMinutes === 'number' ? post.prepMinutes : null
  const cook = typeof post.cookMinutes === 'number' ? post.cookMinutes : null
  if (prep === null && cook === null) return null
  return (prep ?? 0) + (cook ?? 0)
}

// Whether there is anything to put in the "At a glance" panel. Mirrors
// hasGlanceFacts() in the backend's blog/recipe-details.ts — ingredients are
// deliberately excluded because they have their own panel.
export function hasGlanceFacts(post: GlanceFacts): boolean {
  return (
    typeof post.prepMinutes === 'number' ||
    typeof post.cookMinutes === 'number' ||
    typeof post.servings === 'number' ||
    (typeof post.equipment === 'string' && post.equipment.trim() !== '')
  )
}

// Defensive read: the column is NOT NULL DEFAULT '{}' server-side, but a
// cached response written before the migration can still arrive without it.
export function recipeIngredients(post: Pick<BlogPost, 'ingredients'>): string[] {
  if (!Array.isArray(post.ingredients)) return []
  return post.ingredients.filter(line => typeof line === 'string' && line.trim() !== '')
}
