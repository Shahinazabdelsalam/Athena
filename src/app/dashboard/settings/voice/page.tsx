import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ANCHORS_FR, DEFAULT_BANNED_WORDS_FR } from "@/lib/ai/prompt-layers";
import VoiceForm from "./VoiceForm";
import type { BrandVoiceFormInput } from "./actions";

export default async function VoiceSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const voice = await prisma.brandVoice.findUnique({
    where: { userId: session.user.id },
  });

  const initial: BrandVoiceFormInput | null = voice
    ? {
        soul: voice.soul,
        audience: voice.audience,
        toneRules: voice.toneRules,
        bannedWords: voice.bannedWords,
        mandatoryAnchors: voice.mandatoryAnchors,
        pillars: Array.isArray(voice.pillars)
          ? (voice.pillars as Array<{ name: string; description: string }>)
          : [],
      }
    : null;

  return (
    <div className="flex-1 py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Ma voix de marque</h1>
        <p className="text-sm text-muted mb-8">
          Athena utilise ce profil pour faconner chacun de vos posts. Plus il est precis, plus vos
          contenus se distinguent.
        </p>

        <VoiceForm
          initial={initial}
          defaultAnchors={[...DEFAULT_ANCHORS_FR]}
          defaultBannedWords={[...DEFAULT_BANNED_WORDS_FR]}
          isFirstTime={!voice}
        />
      </div>
    </div>
  );
}
