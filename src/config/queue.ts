import { Queue } from "bullmq";
import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

export const redisConnection = new Redis(redisConfig);

redisConnection.on("error", (err: any) => {
  console.error("[Queue Redis] Connection Error:", err);
});

// Define Queue Instances
export const commissionQueue = new Queue("commission-queue", {
  connection: redisConnection as any,
});

export const autoPoolQueue = new Queue("autopool-queue", {
  connection: redisConnection as any,
});

console.log("[Queue Config] BullMQ Queues (commission, autopool) initialized.");
