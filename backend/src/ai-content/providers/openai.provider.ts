import { Injectable } from '@nestjs/common'
import { AiContentConfig } from '../ai-content.config'
import { OpenAiClient } from '../../ai/openai.client'
import type {
  AiContentProvider,
  ArticleRequest,
  ArticleResult,
  GeneratedArticle,
  TopicRequest,
  TopicResult,
} from '../types/ai-content.types'

// Strict Structured Outputs schema: every property is required and no extra
// keys are accepted, so a well-formed reply cannot smuggle `published: true`.
const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slug', 'excerpt', 'metaDescription', 'content', 'imagePrompt', 'suggestedKeywords', 'recipe'],
  properties: {
    title: { type: 'string', description: 'Article title, at most 255 characters.' },
    slug: {
      type: 'string',
      description: 'URL slug: lowercase ASCII letters, digits and hyphens only, at most 200 characters.',
    },
    excerpt: { type: 'string', description: 'Plain-text summary, at most 500 characters.' },
    metaDescription: { type: 'string', description: 'Search-result description, at most 160 characters.' },
    content: {
      type: 'string',
      description:
        'Article body as HTML using only p, h2, h3, ul, ol, li, strong, em and blockquote tags. No images, no scripts, no inline styles.',
    },
    imagePrompt: {
      type: 'string',
      description: 'Concise visual description of the finished dish, using only ingredients and garnishes present in the recipe.',
    },
    suggestedKeywords: { type: 'array', items: { type: 'string' }, description: 'Three to eight keywords.' },
    // Structured duplicate of facts the article body already states, so the
    // recipe page can lay them out instead of parsing prose. Strict mode
    // requires every key, hence the explicit nulls for non-recipe articles.
    recipe: {
      type: 'object',
      additionalProperties: false,
      required: ['isRecipe', 'prepMinutes', 'cookMinutes', 'servings', 'equipment', 'ingredients'],
      properties: {
        isRecipe: {
          type: 'boolean',
          description:
            'True only when the article gives a cookable recipe with an ingredient list. False for technique, planning, shopping or explainer articles.',
        },
        prepMinutes: {
          type: ['integer', 'null'],
          description:
            'Hands-on preparation time in whole minutes, excluding cooking. Null when isRecipe is false or the article states no prep time.',
        },
        cookMinutes: {
          type: ['integer', 'null'],
          description:
            'Cooking time in whole minutes, excluding preparation. Include unattended oven, simmering or chilling time. Null when isRecipe is false.',
        },
        servings: {
          type: ['integer', 'null'],
          description: 'Number of people the stated quantities serve. Null when isRecipe is false.',
        },
        equipment: {
          type: ['string', 'null'],
          description:
            'The defining cookware in at most 120 characters, as a short noun phrase such as "One roasting tray" or "Blender and fine sieve". Null when isRecipe is false.',
        },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description:
            'One line per ingredient with its quantity, exactly as the article lists it, for example "800 g small waxy potatoes, halved if larger than a walnut". Plain text, no HTML, no bullet characters, no numbering. Empty array when isRecipe is false.',
        },
      },
    },
  },
} as const

const TOPIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topics'],
  properties: {
    topics: { type: 'array', items: { type: 'string' }, description: 'Distinct article titles.' },
  },
} as const

// Editorial guardrails sent on every article call. Kept next to the schema so
// the contract with the model is readable in one place.
const EDITORIAL_RULES = [
  'Write original, evergreen content that stays useful without live web data.',
  'Never invent statistics, studies, quotes, sources, prices or testimonials.',
  'Never claim personal experience and never claim a recipe or method was tested.',
  'Never invent an author biography, culinary qualification, reader feedback, rating or review.',
  'For recipes, make quantities, serving yield, pan size, equipment capacity, cooking sequence, liquid ratios and total timing internally consistent. Never call a recipe one-pan when another cooking vessel is required.',
  'Use conservative US food-safety guidance: whole beef/pork/lamb/veal cuts 145°F plus a 3-minute rest; fish 145°F; ground meat and egg dishes 160°F; poultry, casseroles and reheated leftovers 165°F. Never suggest a lower value as safe and never rely on color alone.',
  'Do not create instructions for home fermentation, canning, vacuum preservation or other pathogen-sensitive preservation processes. Choose a lower-risk topic instead.',
  'Do not recommend storing raw shell eggs mixed with other ingredients for later meal prep. Cook egg dishes fully before storage.',
  'Do not invent exact prices, nutrition values or health benefits. Use cautious storage guidance and tell readers to refrigerate perishable food promptly.',
  'Do not call a dish healthy, balanced, high-protein, protein-packed, low-carb or suitable for a medical diet unless verified nutrition data was explicitly supplied.',
  'Avoid generic SEO templates. Vary the recipe format and vocabulary only where that improves clarity.',
  'Never mention that the text was produced by an AI, a model or an assistant.',
  'Do not pad: no filler paragraphs, no repeated sentences, no restated headings.',
  'Stay strictly on the given topic.',
  'Give no medical, legal or financial advice that could be unsafe; add no health claims.',
  'Do not reference images inside the article body.',
  'The imagePrompt must describe the exact finished dish from this recipe, including its visible ingredients, texture, cooking method and plating. Never add a garnish or ingredient absent from the recipe.',
  'Fill the recipe object from the article you just wrote, never from a different or idealised version of the dish. Every ingredient line, the serving count, the equipment and both timings must match the article body exactly; prepMinutes plus cookMinutes must equal the total time the article claims.',
  'Set recipe.isRecipe to false for technique, planning, shopping and explainer articles, and then set every other recipe field to null with an empty ingredients array. Never invent an ingredient list for an article that does not contain one.',
  'Keep the ingredient list in the article body as well: the recipe object is a structured copy for layout, not a replacement for the written recipe.',
  'The content field is reader-facing article HTML only. Never put imagePrompt, suggestedKeywords, SEO keywords, collection alignment, editorial notes, review notes, campaign instructions or JSON field labels inside content.',
  'Do not repeat the exact article title as an h2. Do not add generic Overview, Key Benefits, Conclusion or Final Note sections merely to reach the target length.',
  'Use campaign keywords sparingly and naturally. Never repeat an awkward exact-match phrase for SEO.',
  'Use only these HTML tags: p, h2, h3, ul, ol, li, strong, em, blockquote.',
  'Do not emit script, style, iframe, img, form or any on* attribute.',
  'Only add a link when it is genuinely necessary, and only to a well-known https site.',
].join('\n- ')

// The model does this review inside the same call and returns only the corrected
// article. It is deliberately explicit: "write like a human" is too vague to
// catch arithmetic, recipe-safety and near-duplicate failures consistently.
const SILENT_REVIEW_CHECKLIST = [
  'Originality: compare the proposed article with every title in the avoid-list. Reject cosmetic variations that keep the same main ingredient, starch, cooking vessel, sauce and reader promise.',
  'Editorial value: make sure the article gives topic-specific help rather than generic filler or a reusable SEO template.',
  'Recipe arithmetic: recalculate ingredient totals, serving yield and every per-serving statement; remove any number that cannot be supported.',
  'Method consistency: simulate the recipe from start to finish. Confirm that every ingredient is used, every step is physically workable in the named cookware, the pan is not overcrowded, vessel size is plausible, liquid ratios are coherent and prep plus cook time equals total time.',
  'Food safety: check conservative internal temperatures, refrigeration, cooling, reheating and allergen wording where relevant.',
  'Language quality: remove awkward phrases, mistranslations, contradictions, repeated conclusions and robotic transitions.',
  'Trust: remove personal anecdotes, testing claims, ratings, prices, nutrition figures, credentials or reader feedback that were not supplied as verified facts.',
  'Structured recipe: re-read the finished article and confirm the recipe object matches it line for line — same ingredients in the same quantities, same serving count, same equipment, and prepMinutes plus cookMinutes equal to the stated total. Correct the object, not the article.',
  'Clean output: ensure content contains no image prompt, keywords list, collection alignment, campaign instruction, internal note, duplicated title, repeated variations section or editorial checklist.',
].join('\n- ')

@Injectable()
export class OpenAiContentProvider implements AiContentProvider {
  constructor(
    private readonly config: AiContentConfig,
    private readonly client: OpenAiClient,
  ) {}

  async suggestTopics(request: TopicRequest): Promise<TopicResult> {
    const avoid = request.avoidTitles.length
      ? `\n\nAlready published or already planned — propose nothing similar to these:\n- ${request.avoidTitles.join('\n- ')}`
      : ''
    const rejected = request.rejectedTopics.length
      ? `\n\nThese candidates were just rejected as too close to existing articles, go further afield:\n- ${request.rejectedTopics.join('\n- ')}`
      : ''
    const keywords = request.keywords.length ? `\nPreferred keywords: ${request.keywords.join(', ')}.` : ''

    const parsed = await this.respond<{ topics: string[] }>({
      model: request.model,
      timeoutMs: request.timeoutMs,
      maxOutputTokens: 2000,
      schemaName: 'topic_ideas',
      schema: TOPIC_SCHEMA,
      instructions:
        'You plan an editorial calendar. Return distinct, specific, self-contained article titles. ' +
        'No numbering, no quotes around titles, no duplicates, no near-duplicates of each other. ' +
        'Diversify primary ingredient, cooking method, cuisine direction, meal type and reader intent; do not return a list of cosmetic variations on one base recipe. ' +
        'Treat two recipes as overlapping when a reader would consider them substantially the same meal even if adjectives, vegetables, sauce or SEO keywords differ.',
      input:
        `Editorial brief:\n${request.masterPrompt}\n\n` +
        `Language: ${request.language}.${keywords}\n` +
        `Propose exactly ${request.count} candidate titles.${avoid}${rejected}`,
    })

    const topics = Array.isArray(parsed.value.topics)
      ? parsed.value.topics.filter((topic): topic is string => typeof topic === 'string' && topic.trim() !== '')
      : []
    return { topics: topics.map(topic => topic.trim()), usage: parsed.usage }
  }

  async writeArticle(request: ArticleRequest): Promise<ArticleResult> {
    const avoid = request.avoidTitles.length
      ? `\n\nDo not overlap with these existing articles:\n- ${request.avoidTitles.join('\n- ')}`
      : ''
    const keywords = request.keywords.length
      ? `\nThese are topic hints, not mandatory exact-match phrases: ${request.keywords.join(', ')}. Use only those that read naturally and never print a keyword list.`
      : ''

    // Reasoning tokens count against max_output_tokens, so leave generous head
    // room above the prose budget or the reply comes back `incomplete`.
    const maxOutputTokens = Math.min(32_000, Math.round(request.targetWords * 3) + 4000)

    const parsed = await this.respond<GeneratedArticle>({
      model: request.model,
      timeoutMs: request.timeoutMs,
      maxOutputTokens,
      schemaName: 'blog_article',
      schema: ARTICLE_SCHEMA,
      instructions:
        `You are a careful staff writer. Write in ${request.language}. Tone: ${request.tone}.\n` +
        `Rules:\n- ${EDITORIAL_RULES}`,
      input:
        `Editorial brief:\n${request.masterPrompt}\n\n` +
        `Write the full article for this exact topic: ${request.topic}\n` +
        `Target length: about ${request.targetWords} words.${keywords}\n` +
        'Choose only sections that genuinely help this specific recipe. Use h2 and, where useful, h3 and lists; vary the structure naturally between articles.\n' +
        'Keep the title concise and specific, preferably 50–70 characters. Put imagePrompt and suggestedKeywords only in their dedicated JSON fields, never in content.\n\n' +
        'Before returning the JSON, silently act as a senior human editor and correct the draft using this checklist. ' +
        'Return only the final corrected article; do not output the checklist or review notes.\n- ' +
        SILENT_REVIEW_CHECKLIST +
        avoid,
    })

    return { article: parsed.value, usage: parsed.usage }
  }

  // Vendor access goes through the shared OpenAI client, which owns timeouts,
  // error classification and log redaction for every AI feature in the app.
  private async respond<T>(options: {
    model: string
    timeoutMs: number
    maxOutputTokens: number
    schemaName: string
    schema: unknown
    instructions: string
    input: string
  }): Promise<{ value: T; usage: { inputTokens: number; outputTokens: number } }> {
    return this.client.respondJson<T>({
      operation: `ai-content:${options.schemaName}`,
      model: options.model,
      timeoutMs: options.timeoutMs,
      maxOutputTokens: options.maxOutputTokens,
      instructions: options.instructions,
      input: options.input,
      schemaName: options.schemaName,
      schema: options.schema as Record<string, unknown>,
      // Retries stay with BullMQ so that every attempt is visible in the job log.
      retries: 0,
    })
  }
}

// Moved next to the SDK call site; re-exported so existing importers of this
// module keep resolving it.
export { isReasoningModel } from '../../ai/openai.client'
