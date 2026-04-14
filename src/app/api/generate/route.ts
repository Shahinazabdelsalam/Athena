import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBlogQueue } from "@/lib/queue";

const FREE_MONTHLY_LIMIT = 3;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const { business, topic } = await request.json();

    if (!business || !topic) {
      return NextResponse.json(
        { error: "Decrivez votre activite et le sujet de l'article" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Reset monthly counter if new month
    const now = new Date();
    const resetDate = new Date(user.monthResetAt);
    if (
      now.getMonth() !== resetDate.getMonth() ||
      now.getFullYear() !== resetDate.getFullYear()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { postsThisMonth: 0, monthResetAt: now },
      });
      user.postsThisMonth = 0;
    }

    // Check free tier limit
    if (user.plan === "FREE" && user.postsThisMonth >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: `Vous avez atteint la limite de ${FREE_MONTHLY_LIMIT} articles gratuits ce mois-ci. Passez au Pro pour des articles illimites !`,
          code: "LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    // Create post and queue job
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        business,
        topic,
        status: "PENDING",
      },
    });

    const job = await getBlogQueue().add("generate-blog", {
      postId: post.id,
      business,
      topic,
      longForm: user.plan === "PRO",
    });

    // Increment monthly counter
    await prisma.user.update({
      where: { id: user.id },
      data: { postsThisMonth: { increment: 1 } },
    });

    return NextResponse.json({ postId: post.id, jobId: job.id });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la generation" },
      { status: 500 }
    );
  }
}
