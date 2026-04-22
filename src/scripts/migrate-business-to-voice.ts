/**
 * One-shot migration helper.
 *
 *   npx tsc -p tsconfig.worker.json
 *   node dist/scripts/migrate-business-to-voice.js --email user@example.com
 *   node dist/scripts/migrate-business-to-voice.js --all
 *
 * For each target user that has a `business` string but no BrandVoice row,
 * ask Claude to draft a BrandVoice from the `business` text, then insert it.
 * The draft is meant for user review — the wizard at /dashboard/settings/voice
 * lets them edit afterwards.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_ANCHORS_FR, DEFAULT_BANNED_WORDS_FR } from "../lib/ai/prompt-layers";

const prisma = new PrismaClient();
const anthropic = new Anthropic();

interface DraftVoice {
  soul: string;
  audience: string;
  toneRules: string[];
  bannedWords: string[];
  mandatoryAnchors: string[];
  pillars: { name: string; description: string }[];
}

const DRAFT_MODEL = process.env.ANTHROPIC_MODEL_BLOG || "claude-sonnet-4-6";

const DRAFT_SYSTEM_PROMPT = `Tu aides a migrer des profils d'utilisatrices d'Athena (generateur de contenu SEO pour femmes entrepreneures francophones) vers un nouveau modele de voix de marque structure.

A partir d'une phrase decrivant leur activite, tu produis un BROUILLON de profil en JSON strict. Ce brouillon sera revu par l'utilisatrice avant validation — donc reste factuel, ne complete pas ce que tu ne sais pas, et privilegie des valeurs breves et editables.

Tu retournes UNIQUEMENT du JSON valide, sans texte autour, respectant ce schema :

{
  "soul": string,                  // 2-4 phrases en francais decrivant l'identite
  "audience": string,              // 1 phrase, description de l'audience cible
  "toneRules": string[],           // 3-5 regles de ton concretes
  "bannedWords": string[],         // vocabulaire a eviter
  "mandatoryAnchors": string[],    // elements concrets obligatoires par post
  "pillars": [                     // 2-3 piliers de contenu
    { "name": string, "description": string }
  ]
}`;

async function draftVoice(businessText: string): Promise<DraftVoice> {
  const response = await anthropic.messages.create({
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Activite de l'utilisatrice :\n\n${businessText}\n\nProduis le JSON de brouillon.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) {
    throw new Error(`Draft response did not contain JSON: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<DraftVoice>;

  return {
    soul: parsed.soul?.trim() || businessText.slice(0, 280),
    audience: parsed.audience?.trim() || "femmes entrepreneures francophones",
    toneRules: Array.isArray(parsed.toneRules) ? parsed.toneRules.filter(Boolean) : [],
    bannedWords: Array.isArray(parsed.bannedWords) && parsed.bannedWords.length
      ? parsed.bannedWords
      : [...DEFAULT_BANNED_WORDS_FR],
    mandatoryAnchors: Array.isArray(parsed.mandatoryAnchors) && parsed.mandatoryAnchors.length
      ? parsed.mandatoryAnchors
      : [...DEFAULT_ANCHORS_FR],
    pillars:
      Array.isArray(parsed.pillars) && parsed.pillars.length >= 2
        ? parsed.pillars
        : [
            { name: "Expertise", description: "Conseils pratiques issus de votre metier" },
            { name: "Coulisses", description: "Votre parcours et vos apprentissages" },
          ],
  };
}

async function migrateUser(userId: string, business: string, dryRun: boolean): Promise<void> {
  console.log(`[migrate] drafting voice for user ${userId} (business: ${business.slice(0, 60)}...)`);
  const draft = await draftVoice(business);

  if (dryRun) {
    console.log(`[migrate] DRY RUN — draft for ${userId}:`);
    console.log(JSON.stringify(draft, null, 2));
    return;
  }

  await prisma.brandVoice.create({
    data: {
      userId,
      soul: draft.soul,
      audience: draft.audience,
      toneRules: draft.toneRules,
      bannedWords: draft.bannedWords,
      mandatoryAnchors: draft.mandatoryAnchors,
      pillars: draft.pillars,
    },
  });
  console.log(`[migrate] inserted BrandVoice for ${userId}`);
}

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith("--email"))?.split("=")[1] ?? (args[args.indexOf("--email") + 1] ?? null);
  const all = args.includes("--all");
  const dryRun = args.includes("--dry-run");

  if (!emailArg && !all) {
    console.error("Usage: --email <email> | --all  [--dry-run]");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: {
      business: { not: null },
      brandVoice: null,
      ...(emailArg ? { email: emailArg } : {}),
    },
    select: { id: true, email: true, business: true },
  });

  if (!users.length) {
    console.log("[migrate] no users match the criteria (already migrated or no business text)");
    return;
  }

  console.log(`[migrate] ${users.length} user(s) to process (dryRun=${dryRun})`);
  for (const u of users) {
    if (!u.business) continue;
    try {
      await migrateUser(u.id, u.business, dryRun);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[migrate] FAILED ${u.email}:`, msg);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
