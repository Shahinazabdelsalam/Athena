import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBlogQueue } from "@/lib/queue";

const FREE_MONTHLY_LIMIT = 5;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const { business, topic, format, pillar } = await request.json();

    if (!business || !topic) {
      return NextResponse.json(
        { error: "Decrivez votre activite et le sujet de l'article" },
        { status: 400 }
      );
    }

    const FORMATS = ["BLOG", "LINKEDIN", "CAROUSEL", "THREAD"] as const;
    type AllowedFormat = (typeof FORMATS)[number];
    const chosenFormat: AllowedFormat = FORMATS.includes(format as AllowedFormat)
      ? (format as AllowedFormat)
      : "LINKEDIN";
    const chosenPillar: string | null = typeof pillar === "string" && pillar.trim() ? pillar.trim() : null;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { brandVoice: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if ((chosenFormat === "CAROUSEL" || chosenFormat === "THREAD") && !user.brandVoice) {
      return NextResponse.json(
        {
          error:
            "Ce format requiert une voix de marque. Configurez-la dans vos parametres avant de continuer.",
          code: "VOICE_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Count posts this calendar month, excluding FAILED (failed generations
    // should not eat into the free quota). We rely on a live COUNT instead
    // of the postsThisMonth counter so deletions and failures self-correct.
    if (user.plan === "FREE") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const countThisMonth = await prisma.post.count({
        where: {
          userId: user.id,
          status: { not: "FAILED" },
          createdAt: { gte: monthStart },
        },
      });

      if (countThisMonth >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Vous avez atteint la limite de ${FREE_MONTHLY_LIMIT} articles gratuits ce mois-ci. Passez au Pro pour des articles illimites !`,
            code: "LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    // Create post and queue job
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        business,
        topic,
        format: chosenFormat,
        pillar: chosenPillar,
        status: "PENDING",
      },
    });

    const job = await getBlogQueue().add("generate-blog", {
      postId: post.id,
      business,
      topic,
      format: chosenFormat,
      pillar: chosenPillar,
      longForm: user.plan === "PRO",
    });

    // Remember business for next time (counter is now derived from post rows).
    await prisma.user.update({
      where: { id: user.id },
      data: { business },
    });

    return NextResponse.json({ postId: post.id, jobId: job.id });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la generation" },
      { status: 500 }
    );
  }
}
