"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface BrandVoiceFormInput {
  soul: string;
  audience: string;
  toneRules: string[];
  bannedWords: string[];
  mandatoryAnchors: string[];
  pillars: { name: string; description: string }[];
}

export type SaveBrandVoiceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveBrandVoice(input: BrandVoiceFormInput): Promise<SaveBrandVoiceResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Non autorise" };
  }

  const soul = input.soul.trim();
  const audience = input.audience.trim();
  if (!soul || !audience) {
    return { ok: false, error: "L'identite et l'audience sont obligatoires." };
  }

  const toneRules = input.toneRules.map((r) => r.trim()).filter(Boolean);
  const bannedWords = input.bannedWords.map((w) => w.trim()).filter(Boolean);
  const mandatoryAnchors = input.mandatoryAnchors.map((a) => a.trim()).filter(Boolean);
  const pillars = input.pillars
    .map((p) => ({ name: p.name.trim(), description: p.description.trim() }))
    .filter((p) => p.name && p.description);

  if (pillars.length < 2) {
    return { ok: false, error: "Definissez au moins 2 piliers de contenu." };
  }

  await prisma.brandVoice.upsert({
    where: { userId: session.user.id },
    update: { soul, audience, toneRules, bannedWords, mandatoryAnchors, pillars },
    create: {
      userId: session.user.id,
      soul,
      audience,
      toneRules,
      bannedWords,
      mandatoryAnchors,
      pillars,
    },
  });

  revalidatePath("/dashboard/settings/voice");
  revalidatePath("/generate");
  return { ok: true };
}
