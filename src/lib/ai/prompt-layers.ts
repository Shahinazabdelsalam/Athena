import type Anthropic from "@anthropic-ai/sdk";
import type { BrandVoice } from "@prisma/client";

export type ContentFormat = "BLOG" | "LINKEDIN" | "CAROUSEL" | "THREAD";

type SystemBlock = Anthropic.TextBlockParam;

// Layer 1 — immutable Athena rules. Cacheable globally.
const PLATFORM_RULES = `Tu es une redactrice professionnelle pour Athena, plateforme de contenu SEO destinee aux femmes entrepreneures francophones.

Regles plateforme (immuables) :
- Toute la production est en francais. Vouvoiement.
- N'invente jamais un chiffre, une citation ou une source. Si l'outil web_search est disponible, verifie ce que tu avances.
- Respecte a la lettre le format de sortie demande plus bas. Aucun texte hors des balises.
- Phrases courtes. Une idee par ligne. Pas de jargon creux.`;

// Appended after every format contract — reusable suffix block that asks
// the model for 3 hook rewrites and 3 follow-up ideas. Parsed client-side.
export const SUFFIX_REQUEST = `Apres le contenu principal, fournis OBLIGATOIREMENT ces six lignes, une par balise :

HOOK_VARIANT_1: [reformulation alternative de la premiere ligne, meme angle]
HOOK_VARIANT_2: [reformulation alternative, angle different]
HOOK_VARIANT_3: [reformulation alternative, plus directe ou plus personnelle]
FOLLOWUP_1: [idee de post suivant, en 1 phrase]
FOLLOWUP_2: [idee de post suivant, en 1 phrase]
FOLLOWUP_3: [idee de post suivant, en 1 phrase]`;

// Layer 4 — format contracts. Cacheable per format.
const FORMAT_CONTRACTS: Record<ContentFormat, string> = {
  BLOG: `Format : article de blog SEO.
Longueur : respecte la cible donnee dans le message utilisateur.
Structure : titre H1 (dans le champ TITRE), meta description (150-160 caracteres), introduction, 3 a 5 sections H2, conclusion avec appel a l'action.

Format de sortie OBLIGATOIRE :

TITRE: [titre H1 accrocheur, optimise SEO]

META: [meta description, 150-160 caracteres maximum]

ARTICLE:
[article complet en Markdown avec H2, listes, paragraphes]`,

  LINKEDIN: `Format : post LinkedIn unique.
Longueur : 2800 a 3000 caracteres maximum, hashtags inclus.
Structure : accroche premiere ligne (~200 caracteres) qui arrete le scroll, corps en paragraphes courts (1-3 lignes), CTA question ouverte, 3 a 5 hashtags pertinents en fin.
Emojis : 0 a 3 maximum.
Pas de liens externes dans le corps.

Format de sortie OBLIGATOIRE :

POST:
[le post LinkedIn complet, pret a copier-coller, incluant accroche + corps + CTA + hashtags]`,

  CAROUSEL: `Format : carrousel LinkedIn, 7 a 10 slides.
Structure : une idee par slide, phrases courtes. Derniere slide = CTA.

Format de sortie OBLIGATOIRE :

SLIDE 1: [titre accrocheur du carrousel]
SLIDE 2: [idee 1, 1-3 phrases]
SLIDE 3: [idee 2, 1-3 phrases]
... (jusqu'a SLIDE 9 maximum)
CTA: [derniere slide, appel a l'action clair]`,

  THREAD: `Format : thread X/Twitter, 5 a 9 posts.
Structure : premier post = accroche qui arrete le scroll. Chaque post ≤ 280 caracteres. Un argument par post. Dernier post = conclusion ou CTA.

Format de sortie OBLIGATOIRE :

POST 1: [accroche, ≤ 280 caracteres]
POST 2: [argument 1, ≤ 280 caracteres]
...
POST N: [conclusion ou CTA]`,
};

// French defaults used as wizard seed values. Not applied implicitly —
// the wizard copies these into the user's BrandVoice row at onboarding time,
// then the user edits from there.
export const DEFAULT_BANNED_WORDS_FR: readonly string[] = [
  "revolutionnaire",
  "revolutionner",
  "disruptif",
  "liberez",
  "libere",
  "transformez",
  "transformer votre",
  "changer la donne",
  "game-changer",
  "unleash",
  "booster",
  "booste",
];

export const DEFAULT_ANCHORS_FR: readonly string[] = [
  "un chiffre reel (pourcentage, euros, duree)",
  "un exemple concret ou une anecdote vecue",
  "le nom d'un outil, d'une plateforme ou d'une reglementation",
  "un echec ou une erreur que tu as resolue",
];

function soulBlock(voice: BrandVoice): string {
  return `Identite de marque (la voix a respecter) :
${voice.soul.trim()}

Audience : ${voice.audience.trim()}`;
}

function toneBlock(voice: BrandVoice): string {
  if (!voice.toneRules.length) return "";
  return `Regles de ton (a respecter ligne par ligne) :
${voice.toneRules.map((r) => `- ${r}`).join("\n")}`;
}

function pillarBlock(pillar: string | null | undefined, voice: BrandVoice): string {
  if (!pillar) return "";
  const pillars = Array.isArray(voice.pillars) ? (voice.pillars as Array<{ name: string; description: string }>) : [];
  const match = pillars.find((p) => p?.name === pillar);
  if (!match) return `Pilier de contenu : ${pillar}`;
  return `Pilier de contenu : ${match.name}
Angle : ${match.description}`;
}

function anchorsReminder(anchors: string[]): string {
  if (!anchors.length) return "";
  return `Chaque production DOIT contenir au moins un de ces ancrages concrets :
${anchors.map((a) => `- ${a}`).join("\n")}
Si tu ne peux pas en placer un, dis-le dans le contenu plutot que d'inventer.`;
}

function bannedWordsReminder(words: string[]): string {
  if (!words.length) return "";
  return `Vocabulaire interdit (n'utilise JAMAIS ces mots ou variantes) :
${words.map((w) => `- ${w}`).join("\n")}`;
}

// Build the system prompt as an array of cacheable blocks.
// - Up to 4 cache_control markers are allowed per request by Anthropic.
// - We mark layers 1 (platform) and 2+3 (voice) and 4 (format) as cacheable.
// - Layer 5 (pillar + anchors + banned-words) is variable and not cached.
export function buildSystemBlocks(params: {
  format: ContentFormat;
  voice: BrandVoice | null;
  pillar?: string | null;
}): SystemBlock[] {
  const { format, voice, pillar } = params;

  const blocks: SystemBlock[] = [
    { type: "text", text: PLATFORM_RULES, cache_control: { type: "ephemeral" } },
  ];

  if (voice) {
    const voiceText = [soulBlock(voice), toneBlock(voice)].filter(Boolean).join("\n\n");
    blocks.push({ type: "text", text: voiceText, cache_control: { type: "ephemeral" } });
  }

  blocks.push({
    type: "text",
    text: `${FORMAT_CONTRACTS[format]}\n\n${SUFFIX_REQUEST}`,
    cache_control: { type: "ephemeral" },
  });

  if (voice) {
    const variable = [
      pillarBlock(pillar, voice),
      anchorsReminder(voice.mandatoryAnchors),
      bannedWordsReminder(voice.bannedWords),
    ]
      .filter(Boolean)
      .join("\n\n");
    if (variable) blocks.push({ type: "text", text: variable });
  }

  return blocks;
}
