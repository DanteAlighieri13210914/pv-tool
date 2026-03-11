// PV Tool — Copyright (c) 2026 DanteAlighieri13210914
// Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md

export interface SrtEntry {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

function parseTimestamp(ts: string): number {
  // Format: HH:MM:SS,mmm or HH:MM:SS.mmm
  const m = ts.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return (
    parseInt(m[1]) * 3600000 +
    parseInt(m[2]) * 60000 +
    parseInt(m[3]) * 1000 +
    parseInt(m[4])
  );
}

export function parseSrt(content: string): SrtEntry[] {
  const entries: SrtEntry[] = [];
  const blocks = content.trim().replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const index = parseInt(lines[0]);
    if (isNaN(index)) continue;

    const timeLine = lines[1];
    const arrowIdx = timeLine.indexOf('-->');
    if (arrowIdx < 0) continue;

    const startMs = parseTimestamp(timeLine.slice(0, arrowIdx));
    const endMs = parseTimestamp(timeLine.slice(arrowIdx + 3));
    const text = lines.slice(2).join('\n');

    entries.push({ index, startMs, endMs, text });
  }

  return entries.sort((a, b) => a.startMs - b.startMs);
}
