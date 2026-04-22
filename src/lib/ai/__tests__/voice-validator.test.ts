import { describe, it, expect } from "vitest";
import { validateAgainstVoice } from "../voice-validator";

const voice = {
  bannedWords: ["revolutionnaire", "liberez", "transformez"],
  mandatoryAnchors: ["chiffre reel"],
};

describe("validateAgainstVoice", () => {
  it("passes when no voice is provided", () => {
    const r = validateAgainstVoice("anything", null);
    expect(r.passed).toBe(true);
    expect(r.bannedHits).toEqual([]);
  });

  it("matches accented banned words via NFD fold", () => {
    const r = validateAgainstVoice("Une approche révolutionnaire pour entrepreneures.", voice);
    expect(r.bannedHits).toContain("revolutionnaire");
    expect(r.passed).toBe(false);
  });

  it("matches case-insensitive and across word boundaries", () => {
    const r = validateAgainstVoice("LIBEREZ votre potentiel", voice);
    expect(r.bannedHits).toContain("liberez");
  });

  it("does not false-positive on substrings", () => {
    const r = validateAgainstVoice("Transformation progressive sans transformez rien.", voice);
    // "transformez" should match, but "transformation" should not trigger "transformez".
    expect(r.bannedHits).toContain("transformez");
    expect(r.bannedHits.length).toBe(1);
  });

  it("detects a numeric anchor with a unit", () => {
    const r = validateAgainstVoice("J'ai economise 30% de mon temps.", voice);
    expect(r.anchorCount).toBeGreaterThan(0);
    expect(r.passed).toBe(true);
  });

  it("fails when mandatory anchor missing and no banned hit", () => {
    const r = validateAgainstVoice("Un texte sans aucun chiffre ni nom propre.", voice);
    expect(r.bannedHits).toEqual([]);
    expect(r.anchorCount).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("counts a year as an anchor", () => {
    const r = validateAgainstVoice("En 2024, beaucoup de choses ont change.", voice);
    expect(r.anchorCount).toBeGreaterThan(0);
  });
});
