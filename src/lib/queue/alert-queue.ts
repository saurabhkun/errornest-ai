import { redis } from "@/lib/redis";

export interface EmailJobData {
  userId: string;
  userEmail: string;
  userName: string;
  type: "NEW_ISSUE" | "REGRESSION" | "SPIKE";
  projectName: string;
  issueId?: string;
  issueTitle?: string;
  level?: string;
  message?: string;
  environmentName?: string;
  thresholdCount?: number;
  thresholdWindowSeconds?: number;
  eventCount?: number;
}

export interface IQueue<T> {
  add(data: T): Promise<void>;
  process(handler: (data: T) => Promise<void>): void;
}

class InMemoryQueue<T> implements IQueue<T> {
  private jobs: T[] = [];
  private isProcessing = false;
  private handler: ((data: T) => Promise<void>) | null = null;

  async add(data: T): Promise<void> {
    this.jobs.push(data);
    this.triggerProcessing();
  }

  process(handler: (data: T) => Promise<void>): void {
    this.handler = handler;
    this.triggerProcessing();
  }

  private triggerProcessing() {
    if (this.isProcessing || !this.handler || this.jobs.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Use setImmediate to defer processing to the next tick of the event loop
    const runner = async () => {
      while (this.jobs.length > 0 && this.handler) {
        const job = this.jobs.shift();
        if (job) {
          try {
            await this.handler(job);
          } catch (error) {
            console.error("InMemoryQueue job processing failure:", error);
          }
        }
      }
      this.isProcessing = false;
    };

    if (typeof setImmediate !== "undefined") {
      setImmediate(runner);
    } else {
      setTimeout(runner, 0);
    }
  }
}

class RedisAlertQueue implements IQueue<EmailJobData> {
  private queueKey = "queue:alert_emails";
  private inMemoryFallback = new InMemoryQueue<EmailJobData>();
  private handler: ((data: EmailJobData) => Promise<void>) | null = null;
  private isPolling = false;

  async add(data: EmailJobData): Promise<void> {
    if (redis) {
      try {
        const payload = JSON.stringify(data);
        await redis.rpush(this.queueKey, payload);
        this.startPolling();
        return;
      } catch (error) {
        console.error("Upstash Redis alert queue add failed, using memory:", error);
      }
    }
    await this.inMemoryFallback.add(data);
  }

  process(handler: (data: EmailJobData) => Promise<void>): void {
    this.handler = handler;
    this.inMemoryFallback.process(handler);
    this.startPolling();
  }

  private startPolling() {
    if (this.isPolling || !this.handler || !redis) return;
    this.isPolling = true;

    const poll = async () => {
      if (!this.handler || !redis) {
        this.isPolling = false;
        return;
      }
      try {
        const rawJob = await redis.lpop(this.queueKey);
        if (rawJob) {
          const data = (typeof rawJob === "string" ? JSON.parse(rawJob) : rawJob) as EmailJobData;
          try {
            await this.handler(data);
          } catch (error) {
            console.error("Redis queue job execution failure:", error);
          }
          // Process next job immediately
          setTimeout(poll, 0);
        } else {
          // No job, poll again in 2 seconds
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error("Redis queue lpop failure, retry in 5s:", error);
        setTimeout(poll, 5000);
      }
    };

    poll();
  }
}

export const alertEmailQueue = new RedisAlertQueue();
