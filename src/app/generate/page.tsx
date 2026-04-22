import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GenerateForm from "./GenerateForm";

export default async function GeneratePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      business: true,
      brandVoice: { select: { pillars: true } },
    },
  });

  const pillars = Array.isArray(user?.brandVoice?.pillars)
    ? (user!.brandVoice!.pillars as Array<{ name: string; description: string }>)
    : [];
  const hasVoice = Boolean(user?.brandVoice);

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-2">
          Creer un article
        </h1>
        <p className="text-center text-sm text-muted mb-8">
          Decrivez votre activite et le sujet — Athena s&apos;occupe du reste.
        </p>

        <GenerateForm
          initialBusiness={user?.business ?? ""}
          pillars={pillars.map((p) => p.name).filter(Boolean)}
          hasVoice={hasVoice}
        />
      </div>
    </div>
  );
}
