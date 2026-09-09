import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SEO from "../SEO";
import { SITE_URL } from "../../lib/site";

function renderSEO(props, route = "/recipes/lemon-cake") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <SEO {...props} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const content = (selector) =>
  document.head.querySelector(selector)?.getAttribute("content");

const allContent = (selector) =>
  [...document.head.querySelectorAll(selector)].map((el) =>
    el.getAttribute("content"),
  );

describe("SEO social tags", () => {
  it("emits the Open Graph set every network reads", async () => {
    renderSEO({ title: "Lemon Cake", description: "A bright everyday cake." });

    await waitFor(() =>
      expect(content('meta[property="og:title"]')).toContain("Lemon Cake"),
    );
    expect(content('meta[property="og:type"]')).toBe("website");
    expect(content('meta[property="og:url"]')).toBe(
      `${SITE_URL}/recipes/lemon-cake`,
    );
    expect(content('meta[property="og:description"]')).toBe(
      "A bright everyday cake.",
    );
    expect(content('meta[property="og:locale"]')).toBe("en_US");
    expect(content('meta[property="og:site_name"]')).toBe("Pulse Recipe");
  });

  it("describes the default image completely", async () => {
    renderSEO({ title: "Lemon Cake" });

    await waitFor(() =>
      expect(content('meta[property="og:image"]')).toBe(
        `${SITE_URL}/og-image.webp`,
      ),
    );
    expect(content('meta[property="og:image:secure_url"]')).toBe(
      `${SITE_URL}/og-image.webp`,
    );
    expect(content('meta[property="og:image:type"]')).toBe("image/webp");
    expect(content('meta[property="og:image:width"]')).toBe("1200");
    expect(content('meta[property="og:image:height"]')).toBe("630");
    // Falls back to the title so a share is never mute for screen readers.
    expect(content('meta[property="og:image:alt"]')).toBe("Lemon Cake");
    expect(content('meta[name="twitter:image:alt"]')).toBe("Lemon Cake");
    expect(content('meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  it("omits dimensions for an image whose size nobody declared", async () => {
    renderSEO({ title: "Lemon Cake", image: `${SITE_URL}/uploads/cake.jpg` });

    await waitFor(() =>
      expect(content('meta[property="og:image:type"]')).toBe("image/jpeg"),
    );
    // Declaring 1200x630 for an unknown upload makes Facebook reserve the wrong
    // box and render a stretched card — no tag is better than a wrong one.
    expect(document.head.querySelector('meta[property="og:image:width"]')).toBe(
      null,
    );
    expect(
      document.head.querySelector('meta[property="og:image:height"]'),
    ).toBe(null);
  });

  it("honours explicitly declared dimensions", async () => {
    renderSEO({
      title: "Meal Prep",
      image: `${SITE_URL}/guides/meal-prep-planning.webp`,
      imageWidth: 1439,
      imageHeight: 810,
    });

    await waitFor(() =>
      expect(content('meta[property="og:image:width"]')).toBe("1439"),
    );
    expect(content('meta[property="og:image:height"]')).toBe("810");
  });

  it("keeps every article:tag — Helmet dedupes across instances, not within one", async () => {
    renderSEO({
      title: "Lemon Cake",
      type: "article",
      publishedTime: "2026-01-15T10:00:00.000Z",
      modifiedTime: "2026-02-02T08:30:00.000Z",
      author: "Pulse Recipe",
      section: "Dessert",
      tags: ["Dessert", "Italian"],
    });

    await waitFor(() =>
      expect(content('meta[property="og:type"]')).toBe("article"),
    );
    expect(content('meta[property="article:published_time"]')).toBe(
      "2026-01-15T10:00:00.000Z",
    );
    expect(content('meta[property="article:modified_time"]')).toBe(
      "2026-02-02T08:30:00.000Z",
    );
    expect(content('meta[property="article:author"]')).toBe("Pulse Recipe");
    expect(content('meta[property="article:section"]')).toBe("Dessert");
    expect(allContent('meta[property="article:tag"]')).toEqual([
      "Dessert",
      "Italian",
    ]);
  });

  it("normalises dates to ISO 8601 and drops unparsable ones", async () => {
    renderSEO({
      title: "Lemon Cake",
      type: "article",
      publishedTime: new Date("2026-01-15T10:00:00.000Z"),
      modifiedTime: "not a date",
    });

    await waitFor(() =>
      expect(content('meta[property="article:published_time"]')).toBe(
        "2026-01-15T10:00:00.000Z",
      ),
    );
    expect(
      document.head.querySelector('meta[property="article:modified_time"]'),
    ).toBe(null);
  });

  it("leaves article tags off a non-article page", async () => {
    renderSEO({
      title: "Contact",
      publishedTime: "2026-01-15T10:00:00.000Z",
      tags: ["Dessert"],
    });

    await waitFor(() =>
      expect(content('meta[property="og:type"]')).toBe("website"),
    );
    expect(
      document.head.querySelector('meta[property="article:published_time"]'),
    ).toBe(null);
    expect(document.head.querySelector('meta[property="article:tag"]')).toBe(
      null,
    );
  });

  it("skips twitter:site while no account is configured", async () => {
    renderSEO({ title: "Lemon Cake" });

    await waitFor(() =>
      expect(content('meta[name="twitter:card"]')).toBe("summary_large_image"),
    );
    // An empty handle makes X's validator report a broken card, so the tag is
    // absent until site.ts carries a real one.
    expect(document.head.querySelector('meta[name="twitter:site"]')).toBe(null);
    expect(document.head.querySelector('meta[property="fb:app_id"]')).toBe(
      null,
    );
  });
});
