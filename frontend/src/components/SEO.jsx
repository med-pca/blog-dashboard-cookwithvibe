import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { serializeJsonLd } from "../lib/jsonLd";
import {
  FB_APP_ID,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  TWITTER_CREATOR,
  TWITTER_SITE,
} from "../lib/site";

const DEFAULT_IMAGE = `${SITE_URL}/og-image.webp`;
const DEFAULT_IMAGE_ALT = `${SITE_NAME} — easy home recipes`;
const DEFAULT_DESC =
  "Fresh recipes, practical kitchen tips, and seasonal food inspiration.";

// og:image:width/height are a promise to the crawler: Facebook and LinkedIn
// size the preview box from them *before* they fetch the file, so a wrong pair
// renders a stretched or cropped card. Only the bundled default has dimensions
// we can state; for anything else the caller has to pass them, and when nobody
// knows we emit neither tag and let the crawler measure the image itself.
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

const MIME_BY_EXT = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

// og:image:type lets a crawler skip the format sniff. SVG is deliberately absent
// from the table: no major network renders it, so claiming image/svg+xml would
// only make the broken preview look intentional.
function imageMimeType(url) {
  const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return MIME_BY_EXT[ext];
}

// article:published_time must be ISO 8601. The API already sends ISO strings,
// but a Date instance would stringify to "[object Object]" and an unparsable
// value is worse than no tag at all, so both are filtered out here.
function toIsoDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  // Describes the picture for screen readers on Facebook/X and for anyone whose
  // client fails to load it. Falls back to the title so a share is never mute.
  imageAlt,
  imageWidth,
  imageHeight,
  type = "website",
  noindex = false,
  jsonLd,
  // Paginated lists pass these: `canonicalPath` keeps ?page=N in the canonical
  // (each page is its own indexable URL, not a duplicate of page 1), while
  // prevPath/nextPath tell crawlers the pages form one sequence.
  canonicalPath,
  prevPath,
  nextPath,
  // Article-only Open Graph. Facebook and LinkedIn surface the dates as the
  // "published / updated" line on the card, so a recipe reads as fresh instead
  // of undated. Ignored unless type === "article".
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
}) {
  const { pathname } = useLocation();
  const canonical = `${SITE_URL}${canonicalPath ?? pathname}`;
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `Easy Home Recipes | ${SITE_NAME}`;

  const isDefaultImage = image === DEFAULT_IMAGE;
  const width = imageWidth ?? (isDefaultImage ? DEFAULT_IMAGE_WIDTH : undefined);
  const height =
    imageHeight ?? (isDefaultImage ? DEFAULT_IMAGE_HEIGHT : undefined);
  const alt = imageAlt || title || DEFAULT_IMAGE_ALT;
  const mimeType = imageMimeType(image);
  const isArticle = type === "article";
  const published = isArticle ? toIsoDate(publishedTime) : undefined;
  const modified = isArticle ? toIsoDate(modifiedTime) : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {prevPath && <link rel="prev" href={`${SITE_URL}${prevPath}`} />}
      {nextPath && <link rel="next" href={`${SITE_URL}${nextPath}`} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph — read by Facebook, LinkedIn, WhatsApp, Telegram, Slack,
          Discord, Pinterest and iMessage. */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={SITE_LOCALE} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {/* Crawlers that refuse mixed content look for the https copy by name. */}
      {image.startsWith("https://") && (
        <meta property="og:image:secure_url" content={image} />
      )}
      {mimeType && <meta property="og:image:type" content={mimeType} />}
      {width && <meta property="og:image:width" content={String(width)} />}
      {height && <meta property="og:image:height" content={String(height)} />}
      <meta property="og:image:alt" content={alt} />
      {FB_APP_ID && <meta property="fb:app_id" content={FB_APP_ID} />}

      {/* Article metadata. Repeating article:tag is legal Open Graph and
          survives Helmet's dedupe, which only collapses duplicates across
          separate <Helmet> instances, not within one. */}
      {published && (
        <meta property="article:published_time" content={published} />
      )}
      {modified && (
        <meta property="article:modified_time" content={modified} />
      )}
      {isArticle && author && (
        <meta property="article:author" content={author} />
      )}
      {isArticle && section && (
        <meta property="article:section" content={section} />
      )}
      {isArticle &&
        tags.map((tag) => (
          <meta property="article:tag" content={tag} key={tag} />
        ))}

      {/* Twitter/X. The card falls back to Open Graph for anything omitted, so
          only the genuinely X-specific tags are repeated here. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={alt} />
      {TWITTER_SITE && <meta name="twitter:site" content={TWITTER_SITE} />}
      {TWITTER_CREATOR && (
        <meta name="twitter:creator" content={TWITTER_CREATOR} />
      )}

      {jsonLd && (
        <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      )}
    </Helmet>
  );
}
