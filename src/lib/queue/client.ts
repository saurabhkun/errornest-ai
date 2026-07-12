import { db } from "@/lib/db/client";

/**
 * Enqueues an event for background processing.
 * Does not block the HTTP ingestion route response.
 * Runs synchronously in test environments for test predictability.
 */
export async function enqueueEventProcessing(eventId: string, retryCount = 0): Promise<void> {
  const processTask = async () => {
    try {
      // Find the event
      const event = await db.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        console.error(`Event ${eventId} not found for queue processing.`);
        return;
      }

      // Update event to indicate processing has started/completed
      // Note: Grouping and fingerprinting logic is out-of-scope for M3 and will be implemented in M4.
      await db.event.update({
        where: { id: eventId },
        data: {
          processedAt: new Date(),
          processingError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error processing event ${eventId} (attempt ${retryCount + 1}):`, error);

      // Record the error in the event record
      await db.event
        .update({
          where: { id: eventId },
          data: {
            processingError: message,
          },
        })
        .catch((e) => console.error("Failed to write processing error:", e));

      // Retry queue job with exponential backoff (max 3 total attempts)
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000;
        if (process.env.NODE_ENV === "test") {
          // In test mode, execute retry immediately to not block tests
          await enqueueEventProcessing(eventId, retryCount + 1);
        } else {
          setTimeout(() => {
            enqueueEventProcessing(eventId, retryCount + 1).catch(console.error);
          }, delay);
        }
      }
    }
  };

  if (process.env.NODE_ENV === "test") {
    // Run synchronously to ensure predictable test asserts
    await processTask();
  } else {
    // Fire-and-forget in Next.js backend environment
    processTask().catch((err) => {
      console.error("Queue process background failure:", err);
    });
  }
}
