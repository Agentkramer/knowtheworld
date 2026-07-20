// Shuffled-deck randomization: every country appears once before any repeats.
// Deck order and progress survive reloads via localStorage.

const DECK_KEY = "ktw-deck-v1";
const SEEN_KEY = "ktw-seen-v1";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Deck {
  private order: string[];
  private idx: number; // position of the last dealt card, -1 = fresh deck
  private seen: Set<string>;
  private codes: string[];

  constructor(codes: string[]) {
    this.codes = codes;
    this.order = [];
    this.idx = -1;
    this.seen = new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(DECK_KEY) ?? "null");
      if (
        stored &&
        Array.isArray(stored.order) &&
        stored.order.length === codes.length &&
        stored.order.every((c: string) => codes.includes(c))
      ) {
        this.order = stored.order;
        this.idx = stored.idx;
      }
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null");
      if (Array.isArray(seen)) this.seen = new Set(seen.filter((c) => codes.includes(c)));
    } catch {
      /* corrupted storage — start fresh */
    }
    if (!this.order.length) this.order = shuffle(codes);
  }

  next(): string {
    this.idx++;
    if (this.idx >= this.order.length) {
      this.order = shuffle(this.codes);
      this.idx = 0;
    }
    this.persist();
    return this.order[this.idx];
  }

  markSeen(code: string): void {
    this.seen.add(code);
    if (this.seen.size >= this.codes.length) this.seen = new Set([code]);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...this.seen]));
  }

  get seenCount(): number {
    return this.seen.size;
  }

  get total(): number {
    return this.codes.length;
  }

  private persist(): void {
    localStorage.setItem(DECK_KEY, JSON.stringify({ order: this.order, idx: this.idx }));
  }
}
