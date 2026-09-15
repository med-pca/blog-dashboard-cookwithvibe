import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Printer, ShieldCheck, Star } from "lucide-react";
import DOMPurify from "dompurify";
import PageHeader from "../components/PageHeader";
import { BlogDetaySkeleton } from "../components/Skeletons";
import LoadError from "../components/LoadError";
import SEO from "../components/SEO";
import AdSenseBlock from "../components/AdSenseBlock";
import {
  fetchApprovedComments,
  fetchPostBySlug,
  submitBlogComment,
} from "../api/blog.js";
import { formatDate } from "../lib/date.js";
import {
  fallbackCover,
  fallbackSocialCover,
  resolveCoverSrc,
} from "../lib/postCover.js";
import { SITE_NAME, SITE_URL } from "../lib/site";

const RECIPE_HEADING_PATTERN =
  /ingredients|method|instructions|directions|step-by-step/i;

// Tags heading elements with stable ids so the "On this page" jump links and
// the recipe quick-scroll button have somewhere to land.
function prepareArticleContent(content) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = DOMPurify.sanitize(content);

  const usedIds = new Set();
  const headings = [...wrapper.querySelectorAll("h2, h3")].map(
    (heading, index) => {
      const label = heading.textContent?.trim() || `Section ${index + 1}`;
      const baseId =
        label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `section-${index + 1}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
      usedIds.add(id);
      heading.id = id;
      return { id, label, level: heading.tagName === "H3" ? 3 : 2 };
    },
  );

  return {
    html: wrapper.innerHTML,
    headings,
    recipeAnchor:
      headings.find(({ label }) => RECIPE_HEADING_PATTERN.test(label))?.id ||
      headings[0]?.id,
  };
}

// 40 -> "40 min", 90 -> "1 hr 30 min". Stored minutes are formatted here so
// the database never holds display strings.
function formatMinutes(minutes) {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// One row of the "At a glance" card. Rendered only when the fact exists, so a
// post that knows its cook time but not its yield shows a shorter card rather
// than a row reading "Serves —".
function GlanceRow({ label, value, last = false }) {
  if (!value) return null;
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-line"}`}
    >
      <span className="text-[0.9375rem] text-muted">{label}</span>
      <span className="text-[0.9375rem] font-bold text-ink text-right">{value}</span>
    </div>
  );
}

export default function BlogDetay() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentForm, setCommentForm] = useState({
    authorName: "",
    authorEmail: "",
    content: "",
  });
  const [commentState, setCommentState] = useState({
    saving: false,
    message: "",
    error: "",
  });
  const preparedContent = useMemo(
    () => prepareArticleContent(post?.content || ""),
    [post?.content],
  );

  // Only filled fields reach the card, and an all-empty card is not rendered at
  // all — existing posts keep looking exactly as they do until someone fills
  // the fields in. Total time falls back to prep + cook so the two can't clash.
  const recipeCard = useMemo(() => {
    if (!post) return [];
    const { prepMinutes: prep, cookMinutes: cook } = post;
    const total =
      post.totalMinutes ??
      (prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null);
    return [
      { label: "Prep time", value: formatMinutes(prep) },
      { label: "Cook time", value: formatMinutes(cook) },
      { label: "Total time", value: formatMinutes(total) },
      { label: "Servings", value: post.servings },
      { label: "Course", value: post.course },
      { label: "Cuisine", value: post.cuisine },
      {
        label: "Calories",
        value: post.calories != null ? `${post.calories} kcal` : null,
      },
    ].filter((row) => row.value);
  }, [post]);

  function load() {
    setLoading(true);
    setError(null);
    fetchPostBySlug(slug)
      .then(setPost)
      .catch((err) => {
        if (err.status === 404) {
          navigate("/recipes", { replace: true });
          return;
        }
        setError(err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetchApprovedComments(slug)
      .then(setComments)
      .catch(() => setComments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleCommentSubmit(event) {
    event.preventDefault();
    setCommentState({ saving: true, message: "", error: "" });
    try {
      const result = await submitBlogComment(slug, commentForm);
      setCommentForm({ authorName: "", authorEmail: "", content: "" });
      setCommentState({ saving: false, message: result.message, error: "" });
    } catch (err) {
      setCommentState({ saving: false, message: "", error: err.message });
    }
  }

  if (loading || error) {
    return (
      <>
        <PageHeader
          title="Recipes"
          parent={{ to: "/recipes", label: "Recipes" }}
        />
        {loading ? (
          <BlogDetaySkeleton />
        ) : (
          <LoadError
            message="Could not load this recipe. Please check your connection and try again."
            onRetry={load}
          />
        )}
      </>
    );
  }

  if (!post) return null;

  const resolvedCoverImage = resolveCoverSrc(post.coverImage, post.slug || slug);
  const absoluteImage = post.coverImage
    ? /^https?:\/\//i.test(post.coverImage)
      ? post.coverImage
      : `${SITE_URL}${post.coverImage}`
    : // The page can render the SVG illustration, but a share cannot: the
      // social networks all drop SVG, so the card points at the .webp twin.
      `${SITE_URL}${fallbackSocialCover(post.slug || slug)}`;

  // course/cuisine are the only taxonomy a post carries, and they are exactly
  // what a reader filters on ("Dessert", "Italian") — so they become the
  // article's section and tags rather than inventing a new field.
  const articleTags = [post.course, post.cuisine].filter(Boolean);
  const authorName = post.authorName || "CookWithVibe Editorial Team";
  const hasSidebar = recipeCard.length > 0 || !!post.ingredients;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription || post.excerpt || post.title,
    image: absoluteImage,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/food/logo-mark.svg`,
      },
    },
  };

  function scrollToSection(id) {
    if (!id) return;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.metaDescription || post.excerpt || post.title}
        image={absoluteImage}
        imageAlt={post.title}
        type="article"
        publishedTime={post.publishedAt || post.createdAt}
        modifiedTime={post.updatedAt || post.publishedAt || post.createdAt}
        author={authorName}
        section={post.course || undefined}
        tags={articleTags}
        jsonLd={blogSchema}
      />

      <div className="recipe-article bg-paper font-body text-body">
        {/* ── Article header ─────────────────────────────── */}
        <header className="max-w-6xl mx-auto px-6 pt-10 pb-9">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-muted mb-7"
          >
            <Link to="/" className="hover:text-brand transition-colors">
              Home
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link to="/recipes" className="hover:text-brand transition-colors">
              Recipes
            </Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="text-body line-clamp-1">{post.title}</span>
          </nav>

          <div className="max-w-4xl flex flex-col gap-5">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.04] tracking-tight text-ink">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-lg sm:text-xl leading-relaxed text-body max-w-3xl">
                {post.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <span
                aria-hidden="true"
                className="w-11 h-11 rounded-full bg-brand-tint text-brand-deep font-display text-xl flex items-center justify-center shrink-0"
              >
                CV
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[0.9375rem] font-bold text-ink">
                  {authorName}
                </p>
                <p className="text-sm text-muted">
                  Published {formatDate(post.publishedAt || post.createdAt)} · Reviewed
                  before publishing
                </p>
              </div>

              {post.editorialRating != null && (
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-4 py-2 text-brand-deep"
                  aria-label={`Editorial rating: ${post.editorialRating} out of 10`}
                >
                  <Star size={15} fill="currentColor" />
                  <span className="text-[0.8125rem] font-bold">
                    {post.editorialRating}/10
                  </span>
                </span>
              )}
            </div>

            {(recipeCard.length > 0 || post.ingredients || post.method) && (
              <button
                type="button"
                onClick={() =>
                  scrollToSection(
                    recipeCard.length > 0
                      ? "at-a-glance"
                      : post.ingredients
                        ? "ingredients"
                        : "recipe-method",
                  )
                }
                className="inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-3 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-deep"
              >
                Jump to recipe
              </button>
            )}
          </div>
        </header>

        {/* ── Cover ──────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6 pb-12">
          <div className="rounded-3xl overflow-hidden border border-line bg-shell food-photo-wrap relative">
            <img
              src={resolvedCoverImage}
              alt={post.title}
              className="w-full h-64 sm:h-80 lg:h-[30rem] object-cover food-photo"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = fallbackCover(post.slug || slug);
              }}
            />
          </div>
        </div>

        {/* ── Body + recipe panels ───────────────────────── */}
        <div
          className={`max-w-6xl mx-auto px-6 pb-20 grid gap-10 lg:gap-14 items-start ${
            hasSidebar ? "lg:grid-cols-[minmax(0,1fr)_21rem]" : "lg:grid-cols-1"
          }`}
        >
          <article className="min-w-0">
            <AdSenseBlock
              placement="blogArticleTop"
              className="mb-10 rounded-xl border border-line bg-white p-3"
            />

            <div
              className="blog-content max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: preparedContent.html }}
            />

            {post.method && (
              <section id="recipe-method" className="mt-12 scroll-mt-28">
                <h2 className="font-display text-2xl text-ink mb-4">Method</h2>
                <div
                  className="blog-content max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.method) }}
                />
              </section>
            )}

            <AdSenseBlock
              placement="blogArticleBottom"
              className="mt-10 rounded-xl border border-line bg-white p-3"
            />

            <aside
              className="mt-12 rounded-2xl border border-line bg-white p-6"
              aria-label="About the author"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">
                About the author
              </p>
              <h2 className="font-display text-2xl text-ink mb-2">
                {authorName}
              </h2>
              <p className="text-[0.9375rem] text-body leading-relaxed">
                {post.authorBio ||
                  "Our team prepares practical cooking guides for home cooks. Automation may assist with research and drafting, while publication remains a manual editorial decision. We review ingredient consistency, instructions, food-safety wording, and unsupported claims before an article goes live."}{" "}
                See our{" "}
                <Link to="/editorial-policy" className="text-brand underline">
                  editorial policy
                </Link>
                .
              </p>
            </aside>

            {/* ── Comments ───────────────────────────────── */}
            <section
              className="recipe-comments mt-12 border-t border-line pt-10"
              aria-labelledby="comments-title"
            >
              <div className="mb-7 flex items-end justify-between gap-4">
                <h2 id="comments-title" className="font-display text-2xl text-ink">
                  Comments
                </h2>
                <span className="text-sm text-muted">
                  {comments.length} approved
                </span>
              </div>

              <div className="space-y-4">
                {comments.length === 0 && (
                  <p className="rounded-xl bg-shell p-5 text-sm text-muted">
                    No approved comments yet. Be the first to share your experience.
                  </p>
                )}
                {comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-xl border border-line bg-shell p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-ink">{comment.authorName}</h3>
                      <time className="text-xs text-muted">
                        {formatDate(comment.createdAt)}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-body">
                      {comment.content}
                    </p>
                  </article>
                ))}
              </div>

              <form
                onSubmit={handleCommentSubmit}
                className="mt-8 space-y-4 rounded-2xl border border-line bg-brand-tint/40 p-5 sm:p-6"
              >
                <div>
                  <h3 className="font-bold text-ink">Leave a comment</h3>
                  <p className="mt-1 text-xs text-muted">
                    Your email stays private. Comments appear after admin approval.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    maxLength={120}
                    value={commentForm.authorName}
                    onChange={(e) =>
                      setCommentForm((form) => ({
                        ...form,
                        authorName: e.target.value,
                      }))
                    }
                    placeholder="Your name"
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                  <input
                    required
                    type="email"
                    maxLength={254}
                    value={commentForm.authorEmail}
                    onChange={(e) =>
                      setCommentForm((form) => ({
                        ...form,
                        authorEmail: e.target.value,
                      }))
                    }
                    placeholder="Your email"
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <textarea
                  required
                  rows={5}
                  maxLength={3000}
                  value={commentForm.content}
                  onChange={(e) =>
                    setCommentForm((form) => ({
                      ...form,
                      content: e.target.value,
                    }))
                  }
                  placeholder="What did you think of this recipe?"
                  className="w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                {commentState.message && (
                  <p className="text-sm font-medium text-green-700">
                    {commentState.message}
                  </p>
                )}
                {commentState.error && (
                  <p className="text-sm font-medium text-red-600">
                    {commentState.error}
                  </p>
                )}
                <button
                  disabled={commentState.saving}
                  className="rounded-full bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-50"
                >
                  {commentState.saving ? "Submitting…" : "Submit for review"}
                </button>
              </form>
            </section>

            <div className="mt-12 pt-8 border-t border-line">
              <Link
                to="/recipes"
                className="inline-flex items-center gap-2 text-brand font-semibold hover:gap-3 transition-all"
              >
                <ArrowLeft size={16} />
                Back to Recipes
              </Link>
            </div>
          </article>

          {/* Sidebar: only rendered when the post actually carries recipe facts,
              so a technique article does not show two empty cards. */}
          {/* order-first on small screens: stacked in one column the panels
              must come before the method, because that is the order a cook
              reads them in. On lg they return to the right-hand column. */}
          {hasSidebar && (
            <aside className="order-first lg:order-none flex flex-col gap-5 lg:sticky lg:top-28">
              {recipeCard.length > 0 && (
                <section
                  id="at-a-glance"
                  aria-labelledby="at-a-glance-title"
                  className="rounded-2xl border border-line bg-white overflow-hidden scroll-mt-28"
                >
                  <div className="px-6 py-4 bg-brand-tint border-b border-line">
                    <h2
                      id="at-a-glance-title"
                      className="text-xs font-bold uppercase tracking-widest text-brand-deep"
                    >
                      At a glance
                    </h2>
                  </div>
                  <div className="px-6 py-2">
                    {recipeCard.map((row, i) => (
                      <GlanceRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                        last={i === recipeCard.length - 1}
                      />
                    ))}
                  </div>
                </section>
              )}

              {post.ingredients && (
                <section
                  id="ingredients"
                  aria-labelledby="ingredients-title"
                  className="rounded-2xl border border-line bg-white px-6 py-6 scroll-mt-28"
                >
                  <h2 id="ingredients-title" className="font-display text-2xl text-ink mb-4">
                    Ingredients
                  </h2>
                  <div
                    className="blog-content recipe-ingredients-list max-w-none text-[0.9375rem] text-body"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.ingredients) }}
                  />
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-brand text-white text-[0.9375rem] font-semibold hover:bg-brand-deep transition-colors"
                  >
                    <Printer size={16} />
                    Print recipe
                  </button>
                </section>
              )}

              <section className="rounded-2xl bg-cocoa px-6 py-6 flex flex-col gap-3">
                <ShieldCheck size={22} className="text-blush" aria-hidden="true" />
                <p className="text-[0.9375rem] font-bold text-paper">
                  Storing and reheating
                </p>
                <p className="text-sm leading-relaxed text-paper/65">
                  Cool leftovers within two hours, refrigerate for up to three days, and
                  reheat until piping hot throughout.
                </p>
              </section>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
