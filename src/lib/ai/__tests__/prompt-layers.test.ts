import { describe, it, expect } from "vitest";
import { buildSystemBlocks } from "../prompt-layers";

function fakeVoice() {
  return {
    id: "bv1",
    userId: "u1",
    soul: "Coach pour entrepreneures. 10 ans dans la finance.",
    audience: "entrepreneures francaises 30-50 ans",
    toneRules: ["Phrases courtes", "Une idee par ligne"],
    bannedWords: ["revolutionnaire"],
    mandatoryAnchors: ["chiffre reel"],
    pillars: [
      { name: "Expertise", description: "Conseils pratiques" },
      { name: "Coulisses", description: "Parcours et apprentissages" },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("buildSystemBlocks", () => {
  it("emits only the platform layer and the format contract when no voice is provided", () => {
    const blocks = buildSystemBlocks({ format: "BLOG", voice: null });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toContain("Athena");
    expect(blocks[1].text).toContain("TITRE:");
    expect(blocks[1].text).toContain("HOOK_VARIANT_1");
  });

  it("emits 4 blocks when a voice is provided (platform / voice / format / variable)", () => {
    const blocks = buildSystemBlocks({
      format: "LINKEDIN",
      voice: fakeVoice(),
      pillar: "Expertise",
    });
    expect(blocks).toHaveLength(4);
  });

  it("places cache_control on stable layers but not on the variable tail", () => {
    const blocks = buildSystemBlocks({
      format: "LINKEDIN",
      voice: fakeVoice(),
      pillar: "Expertise",
    });
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[2].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[3].cache_control).toBeUndefined();
  });

  it("never uses more than 4 cache markers (Anthropic limit)", () => {
    const blocks = buildSystemBlocks({
      format: "CAROUSEL",
      voice: fakeVoice(),
      pillar: "Expertise",
    });
    const marked = blocks.filter((b) => b.cache_control).length;
    expect(marked).toBeLessThanOrEqual(4);
  });

  it("includes pillar description when the pillar name matches voice.pillars", () => {
    const blocks = buildSystemBlocks({
      format: "BLOG",
      voice: fakeVoice(),
      pillar: "Coulisses",
    });
    const variable = blocks[3].text;
    expect(variable).toContain("Coulisses");
    expect(variable).toContain("Parcours et apprentissages");
  });

  it("includes banned words list in the variable block when set", () => {
    const blocks = buildSystemBlocks({
      format: "BLOG",
      voice: fakeVoice(),
    });
    expect(blocks[3].text).toContain("revolutionnaire");
  });

  it("includes the suffix request in every format contract", () => {
    for (const format of ["BLOG", "LINKEDIN", "CAROUSEL", "THREAD"] as const) {
      const blocks = buildSystemBlocks({ format, voice: null });
      expect(blocks[1].text).toContain("HOOK_VARIANT_1");
      expect(blocks[1].text).toContain("FOLLOWUP_1");
    }
  });
});
