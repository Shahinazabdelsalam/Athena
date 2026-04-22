import type { BrandVoice } from "@prisma/client";

export interface VoiceValidationResult {
  bannedHits: string[]; // banned words that appeared in the content
  anchorCount: number; // how many concrete anchors we could detect
  passed: boolean; // true iff no banned hits and >= 1 anchor
}

// Normalise for banned-word matching — strip accents and lowercase so
// "Révolutionnaire" matches a rule written as "revolutionnaire".
function foldFr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function checkBannedWords(content: string, banned: string[]): string[] {
  if (!banned.length) return [];
  const folded = foldFr(content);
  const hits = new Set<string>();
  for (const raw of banned) {
    const needle = foldFr(raw.trim());
    if (!needle) continue;
    // Word boundary on latin letters; tolerate French punctuation around the match.
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i");
    if (re.test(folded)) hits.add(raw);
  }
  return [...hits];
}

// Heuristic anchor detection. We count a post as "anchored" when the body
// contains at least one of:
//   - a number with a unit or percent (42%, 3 000 €, 12 minutes, 5 ans)
//   - an ISO-ish date (2024, 2024-03)
//   - a capitalised proper-noun span of 2+ words (rough signal for a named
//     tool, client, or regulation)
// False positives are OK here — this is a warning signal, not a hard gate.
function countAnchors(content: string): number {
  let count = 0;

  // Trailing \b doesn't work after non-word chars like % or €, so we allow
  // either a word boundary or end-of-text/whitespace after the unit.
  const numberWithUnit = /\b\d[\d\s.,]*\s*(%|€|EUR|euros?|minutes?|heures?|jours?|semaines?|mois|ans?|ms|s)(?=\b|\s|$|\.|,|;|:)/gi;
  count += (content.match(numberWithUnit) || []).length;

  const year = /\b(19|20)\d{2}\b/g;
  count += (content.match(year) || []).length;

  const properNounSpan = /\b[A-ZÀ-Ý][\wÀ-ÿ'’-]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ'’-]+){1,3}\b/g;
  // Skip sentence-initial false positives by requiring at least 3 such spans
  // elsewhere before counting it as real anchoring — cheap way to avoid
  // counting every "Il Est" that starts a paragraph.
  const properHits = content.match(properNounSpan) || [];
  if (properHits.length >= 2) count += Math.floor(properHits.length / 2);

  return count;
}

export function validateAgainstVoice(
  content: string,
  voice: Pick<BrandVoice, "bannedWords" | "mandatoryAnchors"> | null
): VoiceValidationResult {
  if (!voice) {
    return { bannedHits: [], anchorCount: 0, passed: true };
  }
  const bannedHits = checkBannedWords(content, voice.bannedWords);
  const anchorCount = countAnchors(content);
  const requiresAnchor = voice.mandatoryAnchors.length > 0;
  const passed = bannedHits.length === 0 && (!requiresAnchor || anchorCount >= 1);
  return { bannedHits, anchorCount, passed };
}
