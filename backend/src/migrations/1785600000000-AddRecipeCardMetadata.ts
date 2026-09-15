import { MigrationInterface, QueryRunner } from 'typeorm'

// Fiche recette (prep/cook/servings...). Hepsi nullable: mevcut yazılar
// dokunulmadan kalır ve kart yalnızca doldurulmuş alanlarla görünür.
export class AddRecipeCardMetadata1785600000000 implements MigrationInterface {
  name = 'AddRecipeCardMetadata1785600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // "prepMinutes"/"cookMinutes" already exist as integer from the earlier
    // AddBlogRecipeDetails migration (cookwithvibe's own recipe card) — same
    // type, nothing to do. "servings" exists there too but as integer; widen
    // it to free text ("8 crescents", "4-6 people") instead of colliding on
    // ADD. "equipment" has no equivalent in this recipe-card shape, so it goes.
    await queryRunner.query(`ALTER TABLE "blog_posts" ALTER COLUMN "servings" TYPE character varying(80) USING "servings"::text`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "equipment"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "totalMinutes" integer`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "course" character varying(80)`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "cuisine" character varying(120)`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "calories" integer`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "calories"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "cuisine"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "course"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "totalMinutes"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "equipment" character varying(120)`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ALTER COLUMN "servings" TYPE integer USING NULLIF(regexp_replace("servings", '\\D', '', 'g'), '')::integer`)
  }
}
