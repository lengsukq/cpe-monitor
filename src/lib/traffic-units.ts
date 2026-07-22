const BYTES_PER_MEBIBYTE = 1024 * 1024;
const BITS_PER_MEGABIT = 1_000_000;

export function computeCounterDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
): number {
  if (current === null || current === undefined || !Number.isFinite(current) || current < 0) return 0;
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return 0;
  if (current < previous) return 0;
  return current - previous;
}

export function bitsPerSecondFromByteDelta(deltaBytes: number, elapsedSeconds: number): number {
  if (!Number.isFinite(deltaBytes) || !Number.isFinite(elapsedSeconds)) return 0;
  if (deltaBytes <= 0 || elapsedSeconds <= 0) return 0;
  return (deltaBytes * 8) / elapsedSeconds;
}

export function bitsPerSecondBetweenTimestamps(
  deltaBytes: number,
  currentTimestampMs: number | null,
  previousTimestampMs: number | null,
): number {
  if (currentTimestampMs === null || previousTimestampMs === null) return 0;
  return bitsPerSecondFromByteDelta(
    deltaBytes,
    (currentTimestampMs - previousTimestampMs) / 1000,
  );
}

export function bytesPerSecondToBitsPerSecond(bytesPerSecond: number): number {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return 0;
  return bytesPerSecond * 8;
}

export function bitsPerSecondToMegabits(bitsPerSecond: number): number {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return 0;
  return bitsPerSecond / BITS_PER_MEGABIT;
}

export function bytesToMebibytes(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  return bytes / BYTES_PER_MEBIBYTE;
}
