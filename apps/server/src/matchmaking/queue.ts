export interface QueueEntry {
  userId: string;
  teamId: string;
  skillRating: number;
  queuedAt: number;
}

/**
 * In-memory global matchmaking queue for local/dev. In production this
 * belongs in Redis (a sorted set keyed by skillRating) so matchmaking works
 * across multiple server instances; the pairing logic below is written so
 * that swap is a storage change only, not a logic rewrite.
 */
const queue: QueueEntry[] = [];

const INITIAL_BAND = 100;
const BAND_GROWTH_PER_SECOND = 15;

function bandFor(entry: QueueEntry, now: number): number {
  const waitedSeconds = (now - entry.queuedAt) / 1000;
  return INITIAL_BAND + waitedSeconds * BAND_GROWTH_PER_SECOND;
}

/** Attempts to pair a newly-queued entry with the closest compatible skill rating already waiting. */
export function joinQueue(entry: Omit<QueueEntry, "queuedAt">): { matchedWith: QueueEntry } | { waiting: true } {
  const now = Date.now();
  const candidate = { ...entry, queuedAt: now };

  let bestIndex = -1;
  let bestDelta = Infinity;
  queue.forEach((existing, index) => {
    if (existing.userId === entry.userId) return;
    const delta = Math.abs(existing.skillRating - entry.skillRating);
    const allowedBand = Math.max(bandFor(existing, now), INITIAL_BAND);
    if (delta <= allowedBand && delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  });

  if (bestIndex !== -1) {
    const [matchedWith] = queue.splice(bestIndex, 1);
    return { matchedWith };
  }

  queue.push(candidate);
  return { waiting: true };
}

export function leaveQueue(userId: string) {
  const index = queue.findIndex((e) => e.userId === userId);
  if (index !== -1) queue.splice(index, 1);
}

export function queueSize() {
  return queue.length;
}
