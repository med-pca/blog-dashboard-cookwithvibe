import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Printer, ShieldCheck } from "lucide-react";
import DOMPurify from "dompurify";
import PageHeader from "../components/PageHeader";
import { BlogDetaySkeleton } from "../components/Skeletons";
import LoadError from "../components/LoadError";
import SEO from "../components/SEO";
import AdSenseBlock from "../components/AdSenseBlock";
import { fetchPostBySlug } from "../api/blog.js";
import { formatDate } from "../lib/date.js";
import { fallbackCover, resolveCoverSrc } from "../lib/postCover.js";
import { formatMinutes, hasGlanceFacts, recipeIngredients } from "../lib/recipe";
import { SITE_URL } from "../lib/site";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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
    : `${SITE_URL}${fallbackCover(post.slug || slug)}`;

  // Structured recipe facts, filled by the AI pipeline at generation time and
  // correctable in the admin form. Technique and planning articles carry none
  // of them and simply render without these panels.
  const showGlance = hasGlanceFacts(post);
  const ingredients = recipeIngredients(post);
  const prep = formatMinutes(post.prepMinutes);
  const cook = formatMinutes(post.cookMinutes);
  const hasSidebar = showGlance || ingredients.length > 0;

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
      name: "CookWithVibe",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "CookWithVibe",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/food/logo-mark.svg`,
      },
    },
  };

  return (
    <>
      <SEO
        title={post.title}
        description={post.metaDescription || post.excerpt || post.title}
        image={absoluteImage}
        type="article"
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

            <div className="flex items-center gap-4 pt-1">
              <span
                aria-hidden="true"
                className="w-11 h-11 rounded-full bg-brand-tint text-brand-deep font-display text-xl flex items-center justify-center shrink-0"
              >
                CV
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-[0.9375rem] font-bold text-ink">
                  CookWithVibe Editorial Team
                </p>
                <p className="text-sm text-muted">
                  Published {formatDate(post.publishedAt || post.createdAt)} · Reviewed
                  before publishing
                </p>
              </div>
            </div>
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
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

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
                CookWithVibe Editorial Team
              </h2>
              <p className="text-[0.9375rem] text-body leading-relaxed">
                Our team prepares practical cooking guides for home cooks. Automation may
                assist with research and drafting, while publication remains a manual
                editorial decision. We review ingredient consistency, instructions,
                food-safety wording, and unsupported claims before an article goes live.
                See our{" "}
                <Link to="/editorial-policy" className="text-brand underline">
                  editorial policy
                </Link>
                .
              </p>
            </aside>

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
              {showGlance && (
                <section
                  aria-labelledby="at-a-glance"
                  className="rounded-2xl border border-line bg-white overflow-hidden"
                >
                  <div className="px-6 py-4 bg-brand-tint border-b border-line">
                    <h2
                      id="at-a-glance"
                      className="text-xs font-bold uppercase tracking-widest text-brand-deep"
                    >
                      At a glance
                    </h2>
                  </div>
                  <div className="px-6 py-2">
                    <GlanceRow label="Prep" value={prep} />
                    <GlanceRow label="Cook" value={cook} />
                    <GlanceRow
                      label="Serves"
                      value={
                        typeof post.servings === "number" ? String(post.servings) : null
                      }
                    />
                    <GlanceRow label="Equipment" value={post.equipment} last />
                  </div>
                </section>
              )}

              {ingredients.length > 0 && (
                <section
                  aria-labelledby="ingredients"
                  className="rounded-2xl border border-line bg-white px-6 py-6"
                >
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <h2 id="ingredients" className="font-display text-2xl text-ink">
                      Ingredients
                    </h2>
                    {typeof post.servings === "number" && (
                      <span className="text-[0.8125rem] text-muted shrink-0">
                        Serves {post.servings}
                      </span>
                    )}
                  </div>
                  <ul className="flex flex-col gap-3">
                    {ingredients.map((line, i) => (
                      <li
                        key={`${i}-${line}`}
                        className="flex items-start gap-3 text-[0.9375rem] leading-snug text-body"
                      >
                        <span
                          aria-hidden="true"
                          className="w-[17px] h-[17px] rounded-[5px] border-[1.5px] border-line-strong shrink-0 mt-0.5"
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
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
