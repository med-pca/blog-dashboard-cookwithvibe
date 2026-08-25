import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsNotIn, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { RESERVED_SLUGS } from '../../common/reserved-slugs'
import { RECIPE_LIMITS } from '../recipe-details'

// Shared by the three recipe number fields — see the comment on prepMinutes.
// NaN is passed through untouched so @IsInt reports it instead of it silently
// becoming null.
function toOptionalNumber({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined
  if (value === '' || value === null) return null
  const n = Number(value)
  return Number.isNaN(n) ? value : n
}

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug yalnızca küçük harf, rakam ve tire içerebilir' })
  @IsNotIn(RESERVED_SLUGS, { message: 'Bu slug rezerve edilmiş, başka bir slug seçin' })
  slug: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  content?: string

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/|\/uploads\/)/, { message: 'Geçerli URL veya /uploads/ yolu olmalı' })
  coverImage?: string

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  published?: boolean

  // Yazının bağlandığı koleksiyon. Formdaki "koleksiyon yok" seçeneği boş
  // string gönderir; null'a çevrilir ve IsOptional null'ı geçirir.
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsUUID()
  collectionId?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2147483647)
  @Type(() => Number)
  sortOrder?: number

  // Structured recipe facts. The AI pipeline fills these at generation time;
  // these decorators exist so an admin can correct a wrong number or a missing
  // ingredient in the form before publishing.
  //
  // The three number fields share one transform: an omitted key must stay
  // undefined so a PATCH does not clear a column the form never sent, while an
  // empty input ('' from a cleared number field) must become an explicit null
  // so clearing it in the form does clear the column. Coercion happens here
  // rather than via @Type so the two never disagree about null.
  @IsOptional()
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  @Max(RECIPE_LIMITS.MINUTES_MAX)
  prepMinutes?: number | null

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  @Max(RECIPE_LIMITS.MINUTES_MAX)
  cookMinutes?: number | null

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(1)
  @Max(RECIPE_LIMITS.SERVINGS_MAX)
  servings?: number | null

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @MaxLength(RECIPE_LIMITS.EQUIPMENT_MAX)
  equipment?: string | null

  // One line per ingredient, rendered as-is by the recipe page.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(RECIPE_LIMITS.INGREDIENTS_MAX)
  @IsString({ each: true })
  @MaxLength(RECIPE_LIMITS.INGREDIENT_MAX, { each: true })
  ingredients?: string[]
}
