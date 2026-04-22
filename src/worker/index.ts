import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { generateContent, type ContentFormat } from "../lib/ai/blog-generator";
import { validateAgainstVoice } from "../lib/ai/voice-validator";
import { sendArticleReadyEmail } from "../lib/email";

const prisma = new PrismaClient();
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

interface BlogJobData {
  postId: string;
  business: string;
  topic: string;
  longForm: boolean;
  format?: ContentFormat;
  pillar?: string | null;
}

const worker = new Worker<BlogJobData>(
  "athena-blog-generation",
  async (job) => {
    const { postId, business, topic, longForm, format, pillar } = job.data;
    const resolvedFormat: ContentFormat = format ?? "LINKEDIN";

    console.log(
      `[worker] Processing ${resolvedFormat} ${postId}: "${topic}"`
    );

    const post = await prisma.post.update({
      where: { id: postId },
      data: { status: "PROCESSING" },
      select: { userId: true },
    });

    const voice = await prisma.brandVoice.findUnique({
      where: { userId: post.userId },
    });

    try {
      const result = await generateContent({
        business,
        topic,
        longForm,
        format: resolvedFormat,
        voice,
        pillar: pillar ?? null,
      });

      // Warn-only voice validation. Flips to retry-once after a week of log review (see plan phase 3).
      if (voice) {
        const check = validateAgainstVoice(result.content, voice);
        if (!check.passed) {
          console.warn(
            `[worker] voice-validator WARN postId=${postId} bannedHits=${JSON.stringify(check.bannedHits)} anchorCount=${check.anchorCount}`
          );
        }
      }

      const completed = await prisma.post.update({
        where: { id: postId },
        data: {
          status: "COMPLETED",
          title: result.title,
          content: result.content,
          metaDescription: result.metaDescription,
          wordCount: result.wordCount,
          charCount: result.charCount,
          pillar: pillar ?? null,
          alternativeHooks: result.alternativeHooks,
          followUpIdeas: result.followUpIdeas,
        },
        include: { user: { select: { email: true, name: true } } },
      });

      console.log(
        `[worker] Completed ${resolvedFormat} ${postId}: "${result.title ?? "(untitled)"}" (${result.wordCount} words, ${result.charCount} chars)`
      );

      try {
        await sendArticleReadyEmail({
          to: completed.user.email,
          name: completed.user.name,
          postId: completed.id,
          title: result.title ?? topic,
          wordCount: result.wordCount,
        });
      } catch (emailErr) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error(`[worker] Email send failed for ${postId}:`, msg);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[worker] Failed blog post ${postId}:`, message);

      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED", error: message },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

worker.on("ready", () => console.log("[worker] Ready and waiting for jobs"));
worker.on("failed", (job, err) =>
  console.error(`[worker] Job ${job?.id} failed:`, err.message)
);

process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
