// Single source of truth for the public origin. Canonical links, OG/Twitter
// tags and every JSON-LD block read from here, so moving the site to another
// domain is a one-line edit instead of a repo-wide search.
export const SITE_URL = "https://pulserecipe.com";
export const SITE_DOMAIN = "pulserecipe.com";
export const SITE_NAME = "Pulse Recipe";

// Social accounts used by the Twitter/X card and Facebook's crawler. Empty
// means "no account yet": SEO.jsx skips the tag entirely rather than emitting
// an empty handle, which validators flag as a broken card. Fill these in and
// every page picks them up — no other file needs touching.
export const TWITTER_SITE = "";
export const TWITTER_CREATOR = "";
export const FB_APP_ID = "";

// og:locale. Facebook wants the underscore form, not the BCP-47 dash.
export const SITE_LOCALE = "en_US";
