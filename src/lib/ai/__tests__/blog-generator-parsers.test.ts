import { describe, it, expect } from "vitest";
import {
  extractBlock,
  parseSuffix,
  parseCarousel,
  parseThread,
} from "../blog-generator";

describe("extractBlock", () => {
  it("extracts the ARTICLE block terminated by the next known label", () => {
    const raw = `TITRE: Mon titre

META: Courte description

ARTICLE:
Paragraphe un.

Paragraphe deux.

HOOK_VARIANT_1: une accroche alternative`;
    const article = extractBlock(raw, "ARTICLE")?.trim();
    expect(article).toContain("Paragraphe un.");
    expect(article).toContain("Paragraphe deux.");
    expect(article).not.toContain("HOOK_VARIANT_1");
  });

  it("extracts the POST block when suffix follows", () => {
    const raw = `POST:
Accroche forte.
Corps du post.

HOOK_VARIANT_1: autre accroche`;
    const post = extractBlock(raw, "POST")?.trim();
    expect(post).toContain("Accroche forte.");
    expect(post).not.toContain("HOOK_VARIANT_1");
  });
});

describe("parseSuffix", () => {
  it("returns 3 hook variants and 3 follow-up ideas", () => {
    const raw = `content...

HOOK_VARIANT_1: Variante A
HOOK_VARIANT_2: Variante B
HOOK_VARIANT_3: Variante C
FOLLOWUP_1: Idee 1
FOLLOWUP_2: Idee 2
FOLLOWUP_3: Idee 3`;
    const { alternativeHooks, followUpIdeas } = parseSuffix(raw);
    expect(alternativeHooks).toEqual(["Variante A", "Variante B", "Variante C"]);
    expect(followUpIdeas).toEqual(["Idee 1", "Idee 2", "Idee 3"]);
  });

  it("returns empty arrays when suffix is missing (no-voice fallback)", () => {
    const { alternativeHooks, followUpIdeas } = parseSuffix("juste du contenu sans suffixe");
    expect(alternativeHooks).toEqual([]);
    expect(followUpIdeas).toEqual([]);
  });

  it("tolerates partial suffix output", () => {
    const raw = `HOOK_VARIANT_1: uniquement la premiere
FOLLOWUP_1: une idee`;
    const { alternativeHooks, followUpIdeas } = parseSuffix(raw);
    expect(alternativeHooks).toEqual(["uniquement la premiere"]);
    expect(followUpIdeas).toEqual(["une idee"]);
  });
});

describe("parseCarousel", () => {
  it("extracts slides and CTA", () => {
    const raw = `SLIDE 1: Titre du carrousel
SLIDE 2: Deuxieme idee
SLIDE 3: Troisieme idee
CTA: Reservez un appel`;
    const { slides, cta } = parseCarousel(raw);
    expect(slides).toHaveLength(3);
    expect(slides[0]).toBe("Titre du carrousel");
    expect(cta).toBe("Reservez un appel");
  });

  it("returns empty when no SLIDE labels present", () => {
    const { slides, cta } = parseCarousel("random text");
    expect(slides).toEqual([]);
    expect(cta).toBe("");
  });
});

describe("parseThread", () => {
  it("extracts posts in order", () => {
    const raw = `POST 1: Accroche.
POST 2: Argument.
POST 3: Conclusion.`;
    const { posts } = parseThread(raw);
    expect(posts).toEqual(["Accroche.", "Argument.", "Conclusion."]);
  });

  it("skips empty post bodies", () => {
    const raw = `POST 1: premier
POST 2:
POST 3: troisieme`;
    const { posts } = parseThread(raw);
    expect(posts).toEqual(["premier", "troisieme"]);
  });
});
