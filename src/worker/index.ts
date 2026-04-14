import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { generateBlogPost } from "../lib/ai/blog-generator";

const prisma = new PrismaClient();
const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

interface BlogJobData {
  postId: string;
  business: string;
  topic: string;
  longForm: boolean;
}

const worker = new Worker<BlogJobData>(
  "athena-blog-generation",
  async (job) => {
    const { postId, business, topic, longForm } = job.data;

    console.log(`[worker] Processing blog post ${postId}: "${topic}"`);

    await prisma.post.update({
      where: { id: postId },
      data: { status: "PROCESSING" },
    });

    try {
      const result = await generateBlogPost({ business, topic, longForm });

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: "COMPLETED",
          title: result.title,
          content: result.content,
          metaDescription: result.metaDescription,
          wordCount: result.wordCount,
        },
      });

      console.log(
        `[worker] Completed blog post ${postId}: "${result.title}" (${result.wordCount} words)`
      );
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
