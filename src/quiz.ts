import type { Country } from "./types";

export type QuizKind = "flag" | "capital" | "map";

export interface Question {
  kind: QuizKind;
  answer: Country;
  options: Country[]; // 4 entries, answer included, shuffled
}

export interface Score {
  correct: number;
  total: number;
  streak: number;
  best: number;
}

const SCORE_KEY = "ktw-quiz-v1";
const KINDS: QuizKind[] = ["flag", "capital", "map"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distractors from the same subregion first, then region, then anywhere —
// nearby countries make the question genuinely test knowledge. For capital
// questions all picked capitals must be distinct.
function distractors(all: Country[], answer: Country, kind: QuizKind): Country[] {
  const pools = [
    all.filter((c) => c !== answer && c.subregion === answer.subregion),
    all.filter((c) => c !== answer && c.region === answer.region),
    all.filter((c) => c !== answer),
  ];
  const out: Country[] = [];
  const capitals = new Set(kind === "capital" ? [answer.capital.en] : []);
  for (const pool of pools.map(shuffle)) {
    for (const c of pool) {
      if (out.length === 3) return out;
      if (out.includes(c)) continue;
      if (kind === "capital" && capitals.has(c.capital.en)) continue;
      capitals.add(c.capital.en);
      out.push(c);
    }
  }
  return out;
}

export function makeQuestion(all: Country[], lastCca3: string | null): Question {
  const kind = pick(KINDS);
  // Capital questions need every option to have a capital.
  const eligible = kind === "capital" ? all.filter((c) => c.capital.en) : all;
  let answer = pick(eligible);
  if (answer.cca3 === lastCca3) answer = pick(eligible);
  const opts = distractors(eligible, answer, kind);
  return { kind, answer, options: shuffle([answer, ...opts]) };
}

export function loadScore(): Score {
  try {
    const s = JSON.parse(localStorage.getItem(SCORE_KEY) ?? "null");
    if (s && typeof s.correct === "number") return s as Score;
  } catch {
    /* start fresh */
  }
  return { correct: 0, total: 0, streak: 0, best: 0 };
}

export function recordAnswer(score: Score, correct: boolean): Score {
  const next: Score = {
    correct: score.correct + (correct ? 1 : 0),
    total: score.total + 1,
    streak: correct ? score.streak + 1 : 0,
    best: score.best,
  };
  next.best = Math.max(next.best, next.streak);
  localStorage.setItem(SCORE_KEY, JSON.stringify(next));
  return next;
}
