import { Queue } from "bullmq";
import { getRedis } from "./redis";

let _queue: Queue | null = null;

export function getBlogQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("athena-blog-generation", {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }
  return _queue;
}
