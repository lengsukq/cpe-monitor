import { eventBus, type CpeEvent } from '@/lib/event-bus';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: CpeEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // Client disconnected
        }
      };

      // Send initial connection event
      send({
        type: 'connection',
        payload: { status: 'connected' },
        timestamp: new Date().toISOString(),
      });

      // Subscribe to event bus
      eventBus.on('message', send);

      // Heartbeat every 30s to keep connection alive
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Client disconnected
        }
      }, 30_000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      eventBus.removeAllListeners('message');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
