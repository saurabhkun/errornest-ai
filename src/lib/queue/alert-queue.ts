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

export const alertEmailQueue = new InMemoryQueue<EmailJobData>();
