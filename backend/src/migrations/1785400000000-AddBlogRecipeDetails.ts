import { MigrationInterface, QueryRunner } from 'typeorm'

// Structured recipe facts behind the "At a glance" and "Ingredients" panels on
// the recipe page. Filled by the AI pipeline at generation time so a draft
// arrives complete; nullable/empty because technique and planning guides are
// published through the same table and have no recipe to describe.
export class AddBlogRecipeDetails1785400000000 implements MigrationInterface {
  name = 'AddBlogRecipeDetails1785400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "prepMinutes" integer`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "cookMinutes" integer`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "servings" integer`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "equipment" character varying(120)`)
    // NOT NULL DEFAULT '{}' keeps every existing row readable as "no
    // ingredients" without a backfill, and spares the frontend a null check.
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "ingredients" text[] NOT NULL DEFAULT '{}'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "ingredients"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "equipment"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "servings"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "cookMinutes"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "prepMinutes"`)
  }
}
