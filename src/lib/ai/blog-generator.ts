import Anthropic from "@anthropic-ai/sdk";
import type { BrandVoice } from "@prisma/client";
import { buildSystemBlocks, type ContentFormat } from "./prompt-layers";

const anthropic = new Anthropic();

export type { ContentFormat } from "./prompt-layers";

// Model per task — override in .env to trade quality vs cost.
// LinkedIn posts are short, so Haiku is the cheap default; blog articles
// are longer/SEO-critical, so Sonnet. Bump to claude-opus-4-7 for max quality.
const MODEL_BY_FORMAT: Record<ContentFormat, string> = {
  LINKEDIN: process.env.ANTHROPIC_MODEL_LINKEDIN || "claude-haiku-4-5",
  BLOG: process.env.ANTHROPIC_MODEL_BLOG || "claude-sonnet-4-6",
  CAROUSEL: process.env.ANTHROPIC_MODEL_LINKEDIN || "claude-haiku-4-5",
  THREAD: process.env.ANTHROPIC_MODEL_LINKEDIN || "claude-haiku-4-5",
};

interface ContentInput {
  business: string;
  topic: string;
  longForm: boolean;
  format: ContentFormat;
  voice?: BrandVoice | null;
  pillar?: string | null;
}

export interface ContentOutput {
  title: string | null;
  metaDescription: string | null;
  content: string;
  wordCount: number;
  charCount: number;
  alternativeHooks: string[];
  followUpIdeas: string[];
}

// Legacy hardcoded prompts — used when the user has no BrandVoice row.
// Do not edit without also updating the no-voice-fallback integration test.
const BLOG_SYSTEM_PROMPT = `Tu es une redactrice de blog professionnelle specialisee dans le contenu SEO optimise pour les femmes entrepreneures francophones. Tu ecris dans un ton chaleureux, professionnel et accessible. Toute ta production doit etre en francais.

Avant d'ecrire, utilise l'outil web_search pour trouver des informations recentes, des statistiques et des exemples concrets lies au sujet. Privilegie les sources francophones.

Regles importantes :
- Utilise "vous" (vouvoiement) pour t'adresser aux lectrices
- Ecris des phrases claires et courtes
- Donne des conseils pratiques et actionnables
- Integre naturellement les donnees trouvees lors de ta recherche
- Optimise naturellement pour le SEO sans bourrage de mots-cles

Format de reponse OBLIGATOIRE (respecte exactement ce format) :

TITRE: [titre accrocheur optimise SEO]

META: [meta description de 150-160 caracteres maximum]

ARTICLE:
[article complet en Markdown avec titres H2, listes, et paragraphes]`;

const LINKEDIN_SYSTEM_PROMPT = `Tu es une redactrice LinkedIn professionnelle specialisee dans le contenu pour les femmes entrepreneures francophones. Tu ecris dans un ton chaleureux, authentique et engageant. Toute ta production doit etre en francais.

Avant d'ecrire, utilise l'outil web_search pour trouver des informations recentes, des statistiques ou des tendances actuelles sur le sujet. Privilegie les sources francophones.

Regles OBLIGATOIRES pour le post LinkedIn :
- Longueur : entre 2800 et 3000 caracteres MAXIMUM (hashtags inclus)
- Accroche : la premiere ligne (~200 caracteres) doit arreter le scroll. Pose une question, partage une statistique surprenante, ou raconte un moment.
- Structure : courts paragraphes de 1 a 3 lignes, separes par une ligne vide. Aucun mur de texte.
- Ton : vouvoiement, chaleureux mais professionnel. Partage une perspective, pas une lecon.
- Pas de liens externes dans le corps du post (LinkedIn penalise).
- Emojis : 0 a 3 maximum, utilises avec parcimonie.
- Termine par un appel a l'engagement (question ouverte aux lectrices).
- Ajoute 3 a 5 hashtags pertinents a la fin, separes par des espaces.
- Integre naturellement le mot-cle principal du sujet dans l'accroche et au moins deux fois dans le corps.

Format de reponse OBLIGATOIRE (respecte exactement ce format, rien d'autre) :

POST:
[le post LinkedIn complet, pret a copier-coller, incluant accroche + corps + CTA + hashtags]`;

function resolveSystem(input: ContentInput): string | Anthropic.TextBlockParam[] {
  if (input.voice) {
    return buildSystemBlocks({
      format: input.format,
      voice: input.voice,
      pillar: input.pillar,
    });
  }
  // Fallback: users without a BrandVoice row keep the original behaviour.
  if (input.format === "LINKEDIN") return LINKEDIN_SYSTEM_PROMPT;
  if (input.format === "BLOG") return BLOG_SYSTEM_PROMPT;
  // CAROUSEL/THREAD require a BrandVoice until the UI surfaces them formally.
  throw new Error(`Format ${input.format} requires a BrandVoice profile.`);
}

export async function generateContent(input: ContentInput): Promise<ContentOutput> {
  switch (input.format) {
    case "LINKEDIN":
      return generateLinkedInPost(input);
    case "BLOG":
      return generateBlogPost(input);
    case "CAROUSEL":
      return generateCarousel(input);
    case "THREAD":
      return generateThread(input);
  }
}

async function generateLinkedInPost(input: ContentInput): Promise<ContentOutput> {
  const text = await callClaude({
    model: MODEL_BY_FORMAT.LINKEDIN,
    system: resolveSystem(input),
    maxTokens: 2048,
    userMessage: `Mon activite : ${input.business}

Sujet du post : ${input.topic}

Recherche des informations recentes sur ce sujet, puis ecris un post LinkedIn en francais qui respecte strictement toutes les regles (2800-3000 caracteres maximum, hashtags compris).`,
  });

  const post = extractBlock(text, "POST") || text.trim();
  let finalPost = post;

  // Enforce hard limit of 3000 chars; trim on paragraph boundary if needed.
  if (finalPost.length > 3000) {
    finalPost = trimToLimit(finalPost, 3000);
  }

  const firstLine = finalPost.split("\n").find((l) => l.trim().length > 0) || "";
  const title = firstLine.slice(0, 120).trim() || null;
  const { alternativeHooks, followUpIdeas } = parseSuffix(text);

  return {
    title,
    metaDescription: null,
    content: finalPost,
    wordCount: finalPost.split(/\s+/).filter(Boolean).length,
    charCount: finalPost.length,
    alternativeHooks,
    followUpIdeas,
  };
}

async function generateBlogPost(input: ContentInput): Promise<ContentOutput> {
  const targetLength = input.longForm ? "2000" : "800";

  const text = await callClaude({
    model: MODEL_BY_FORMAT.BLOG,
    system: resolveSystem(input),
    maxTokens: input.longForm ? 4096 : 2048,
    userMessage: `Mon activite : ${input.business}

Sujet de l'article : ${input.topic}

Recherche d'abord des informations recentes sur ce sujet, puis ecris un article de blog SEO complet en francais d'environ ${targetLength} mots. Inclus :
1. Un titre (H1) engageant et optimise pour les moteurs de recherche francophones
2. Une meta description (max 160 caracteres)
3. L'article complet avec :
   - Une introduction engageante
   - 3 a 5 sections avec des titres H2
   - Des conseils pratiques et actionnables
   - Une conclusion avec un appel a l'action`,
  });

  const title = extractBlock(text, "TITRE")?.split("\n")[0].trim() || "Article sans titre";
  const metaDescription = extractBlock(text, "META")?.split("\n")[0].trim() || "";
  const content = extractBlock(text, "ARTICLE")?.trim() || text;
  const { alternativeHooks, followUpIdeas } = parseSuffix(text);

  return {
    title,
    metaDescription,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    charCount: content.length,
    alternativeHooks,
    followUpIdeas,
  };
}

async function generateCarousel(input: ContentInput): Promise<ContentOutput> {
  const text = await callClaude({
    model: MODEL_BY_FORMAT.CAROUSEL,
    system: resolveSystem(input),
    maxTokens: 2048,
    userMessage: `Mon activite : ${input.business}

Sujet du carrousel : ${input.topic}

Ecris un carrousel LinkedIn de 7 a 10 slides en respectant strictement le format de sortie demande.`,
  });

  const { slides, cta } = parseCarousel(text);
  const blocks = slides.map((s, i) => `### Slide ${i + 1}\n\n${s}`);
  if (cta) blocks.push(`### CTA\n\n${cta}`);
  const content = blocks.join("\n\n---\n\n") || text.trim();
  const title = slides[0]?.split("\n")[0].slice(0, 120).trim() || null;
  const { alternativeHooks, followUpIdeas } = parseSuffix(text);

  return {
    title,
    metaDescription: null,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    charCount: content.length,
    alternativeHooks,
    followUpIdeas,
  };
}

async function generateThread(input: ContentInput): Promise<ContentOutput> {
  const text = await callClaude({
    model: MODEL_BY_FORMAT.THREAD,
    system: resolveSystem(input),
    maxTokens: 2048,
    userMessage: `Mon activite : ${input.business}

Sujet du thread : ${input.topic}

Ecris un thread X de 5 a 9 posts en respectant strictement le format de sortie demande. Chaque POST N doit faire au maximum 280 caracteres.`,
  });

  const { posts } = parseThread(text);
  const blocks = posts.map((p, i) => `**Post ${i + 1}**\n\n${p}`);
  const content = blocks.join("\n\n---\n\n") || text.trim();
  const title = posts[0]?.slice(0, 120).trim() || null;
  const { alternativeHooks, followUpIdeas } = parseSuffix(text);

  return {
    title,
    metaDescription: null,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    charCount: content.length,
    alternativeHooks,
    followUpIdeas,
  };
}

export function parseCarousel(text: string): { slides: string[]; cta: string } {
  const slides: string[] = [];
  // Only consume horizontal whitespace after the colon so the newline before
  // the next SLIDE/CTA stays intact for the lookahead terminator.
  const slideRe = /SLIDE\s+(\d+)\s*:[ \t]*([\s\S]*?)(?=\n\s*(?:SLIDE\s+\d+|CTA)\s*:|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = slideRe.exec(text)) !== null) {
    const body = m[2].trim();
    if (body) slides.push(body);
  }
  const ctaMatch = text.match(/CTA\s*:[ \t]*([\s\S]*?)$/i);
  const cta = ctaMatch?.[1].trim() || "";
  return { slides, cta };
}

export function parseThread(text: string): { posts: string[] } {
  const posts: string[] = [];
  const postRe = /POST\s+(\d+)\s*:[ \t]*([\s\S]*?)(?=\n\s*POST\s+\d+\s*:|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = postRe.exec(text)) !== null) {
    const body = m[2].trim();
    if (body) posts.push(body);
  }
  return { posts };
}

async function callClaude({
  model,
  system,
  maxTokens,
  userMessage,
}: {
  model: string;
  system: string | Anthropic.TextBlockParam[];
  maxTokens: number;
  userMessage: string;
}): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  // Agentic loop in case web_search hits server-side iteration pause.
  for (let i = 0; i < 4; i++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages,
    });

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);
    return textBlocks.join("\n").trim();
  }

  throw new Error("Claude response did not complete within retry budget");
}

export function extractBlock(text: string, label: string): string | null {
  // Matches "LABEL:" followed by content until next known label or EOF.
  const regex = new RegExp(
    `${label}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:TITRE|META|ARTICLE|POST|HOOK_VARIANT_\\d+|FOLLOWUP_\\d+|SLIDE\\s+\\d+|CTA|POST\\s+\\d+):|$)`,
    "i"
  );
  const match = text.match(regex);
  return match?.[1] ?? null;
}

export function parseSuffix(text: string): { alternativeHooks: string[]; followUpIdeas: string[] } {
  const alternativeHooks: string[] = [];
  const followUpIdeas: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const hook = text.match(new RegExp(`HOOK_VARIANT_${i}\\s*:\\s*(.+)`, "i"))?.[1].trim();
    if (hook) alternativeHooks.push(hook);
    const follow = text.match(new RegExp(`FOLLOWUP_${i}\\s*:\\s*(.+)`, "i"))?.[1].trim();
    if (follow) followUpIdeas.push(follow);
  }
  return { alternativeHooks, followUpIdeas };
}

function trimToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const truncated = text.slice(0, limit);
  // Prefer cutting on a paragraph break to avoid losing hashtags mid-word.
  const lastBreak = truncated.lastIndexOf("\n\n");
  if (lastBreak > limit * 0.7) return truncated.slice(0, lastBreak).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace > 0 ? lastSpace : limit).trim();
}

// Legacy alias for callers still importing generateBlogPost.
export { generateContent as generateBlogPost };
