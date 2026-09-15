import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRecipeFieldsAndBlogComments1785500000000 implements MigrationInterface {
  name = 'AddRecipeFieldsAndBlogComments1785500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // "ingredients" already exists here as text[] from the earlier
    // AddBlogRecipeDetails migration (cookwithvibe's own recipe card); convert
    // it in place to the text/HTML shape instead of colliding on ADD.
    await queryRunner.query(`ALTER TABLE "blog_posts" ALTER COLUMN "ingredients" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ALTER COLUMN "ingredients" TYPE text USING array_to_string("ingredients", E'\n')`,
    )
    await queryRunner.query(`ALTER TABLE "blog_posts" ALTER COLUMN "ingredients" SET DEFAULT ''`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "method" text NOT NULL DEFAULT ''`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "authorName" character varying NOT NULL DEFAULT 'CookWithVibe Editorial Team'`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ADD "authorBio" text NOT NULL DEFAULT ''`)
    await queryRunner.query(`CREATE TYPE "public"."blog_comments_status_enum" AS ENUM('pending', 'approved', 'rejected')`)
    await queryRunner.query(`CREATE TABLE "blog_comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "postId" uuid NOT NULL, "authorName" character varying(120) NOT NULL, "authorEmail" character varying(254) NOT NULL, "content" text NOT NULL, "status" "public"."blog_comments_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_blog_comments" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "IDX_blog_comments_post_status_created" ON "blog_comments" ("postId", "status", "createdAt")`)
    await queryRunner.query(`ALTER TABLE "blog_comments" ADD CONSTRAINT "FK_blog_comments_post" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "blog_comments" DROP CONSTRAINT "FK_blog_comments_post"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_blog_comments_post_status_created"`)
    await queryRunner.query(`DROP TABLE "blog_comments"`)
    await queryRunner.query(`DROP TYPE "public"."blog_comments_status_enum"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "authorBio"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "authorName"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "method"`)
    await queryRunner.query(`ALTER TABLE "blog_posts" ALTER COLUMN "ingredients" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ALTER COLUMN "ingredients" TYPE text[] USING COALESCE(string_to_array(NULLIF("ingredients", ''), E'\n'), '{}')`,
    )
    await queryRunner.query(`ALTER TABLE "blog_posts" ALTER COLUMN "ingredients" SET DEFAULT '{}'`)
  }
}
