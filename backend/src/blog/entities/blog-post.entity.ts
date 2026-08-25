import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Project } from '../../projects/entities/project.entity'

@Entity('blog_posts')
@Index(['published', 'sortOrder'])
// Koleksiyon sayfası "bu koleksiyondaki yazılar" listesini bu indeksle çeker
@Index(['collectionId', 'published'])
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ unique: true })
  slug: string

  @Column({ nullable: true })
  excerpt: string

  @Column({ nullable: true })
  metaDescription: string

  @Column({ type: 'text', default: '' })
  content: string

  @Column({ nullable: true })
  coverImage: string

  @Column({ default: false })
  published: boolean

  // Written only by the AI content pipeline; drives the "AI Draft" badge in the
  // admin list. Not part of CreateBlogPostDto, so it cannot be set over the API.
  @Column({ default: false })
  aiGenerated: boolean

  // Internal description retained until an admin validates the AI draft. It is
  // never selected by public list endpoints and never accepted from public DTOs.
  @Column({ type: 'text', nullable: true })
  aiImagePrompt: string | null

  // Structured recipe facts. Produced by the AI pipeline in the same call as
  // the article body, so a draft arrives complete, and correctable by an admin
  // before publication. All of them stay empty on non-recipe posts (technique
  // and planning guides): the detail page then renders without the recipe
  // panels rather than showing an empty card.
  @Column({ type: 'int', nullable: true })
  prepMinutes: number | null

  @Column({ type: 'int', nullable: true })
  cookMinutes: number | null

  @Column({ type: 'int', nullable: true })
  servings: number | null

  // Free text rather than an enum: "one roasting tray", "blender + sieve".
  @Column({ type: 'varchar', length: 120, nullable: true })
  equipment: string | null

  // One line per ingredient, exactly as it is read on the page
  // ("800 g small waxy potatoes, halved if larger than a walnut").
  @Column('text', { array: true, default: '{}' })
  ingredients: string[]

  // Yazının bağlı olduğu koleksiyon (Project). Boş olabilir: koleksiyona
  // atanmamış yazılar blog listesinde görünmeye devam eder. Koleksiyon
  // silinirse FK ON DELETE SET NULL ile yazı korunur, yalnızca bağı kopar.
  @Column({ type: 'uuid', nullable: true })
  collectionId: string | null

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collectionId' })
  collection: Project | null

  @Column({ nullable: true })
  publishedAt: Date

  @Column({ default: 0 })
  sortOrder: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
