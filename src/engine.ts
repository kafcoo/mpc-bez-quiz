import raw from "./data/questions.json";
export type Status = "verified" | "provisional" | "needs_review";
export interface Question {
  id: string;
  originalNumber: number;
  question: string;
  options: { id: string; text: string }[];
  correctAnswerId: string | null;
  explanation: string;
  category: string;
  verificationStatus: Status;
  note?: string;
  expectedTestAnswerId?: string | null;
  reviewedAt?: string;
  sources?: { title: string; url: string }[];
}
export const questions: Question[] = raw as Question[];
export const categories = [...new Set(questions.map((q) => q.category))];
export interface Progress {
  questionId: string;
  attempts: number;
  correct: number;
  incorrect: number;
  consecutiveCorrect: number;
  lastAnsweredAt: string | null;
  nextReviewAt: string | null;
  manuallyFlagged: boolean;
  correctDays: string[];
}
export interface Answer {
  questionId: string;
  answerId: string;
  correct: boolean | null;
  at: string;
  sessionId: string;
}
export interface Session {
  id: string;
  title: string;
  questions: Question[];
  index: number;
  answers: Answer[];
  immediate: boolean;
  startedAt: string;
  deadline: string | null;
}
export interface Result extends Session {
  finishedAt: string;
}
export interface Store {
  version: 1;
  progress: Record<string, Progress>;
  answers: Answer[];
  history: Result[];
  active: Session | null;
  overrides: Record<string, Question>;
  settings: { dark: boolean; shuffle: boolean; excludeUnverified: boolean };
}
export const KEY = "mpc-bez-v1";
export function fresh(): Store {
  return {
    version: 1,
    progress: {},
    answers: [],
    history: [],
    active: null,
    overrides: {},
    settings: { dark: false, shuffle: true, excludeUnverified: false },
  };
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function emptyProgress(id: string): Progress {
  return {
    questionId: id,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    consecutiveCorrect: 0,
    lastAnsweredAt: null,
    nextReviewAt: null,
    manuallyFlagged: false,
    correctDays: [],
  };
}
export function isProblem(p: Progress | undefined, now = Date.now()) {
  return (
    !!p &&
    (p.manuallyFlagged ||
      (p.incorrect > 0 && p.consecutiveCorrect < 3) ||
      (p.attempts >= 3 && p.correct / p.attempts < 0.7) ||
      !!(p.nextReviewAt && Date.parse(p.nextReviewAt) <= now))
  );
}
export function mastered(p: Progress | undefined) {
  return (
    !!p &&
    !p.manuallyFlagged &&
    p.consecutiveCorrect >= 3 &&
    p.correctDays.length >= 3
  );
}
export function updateProgress(p: Progress, a: Answer): Progress {
  if (a.correct === null) return p;
  const consecutive = a.correct ? p.consecutiveCorrect + 1 : 0;
  const days = a.correct
    ? [...new Set([...p.correctDays, a.at.slice(0, 10)])]
    : [];
  const interval = a.correct
    ? [1, 3, 7, 14, 30][Math.min(consecutive - 1, 4)] * 86400000
    : 600000;
  return {
    ...p,
    attempts: p.attempts + 1,
    correct: p.correct + Number(a.correct),
    incorrect: p.incorrect + Number(!a.correct),
    consecutiveCorrect: consecutive,
    lastAnsweredAt: a.at,
    nextReviewAt: new Date(Date.parse(a.at) + interval).toISOString(),
    correctDays: days,
  };
}
export function createSession(
  pool: Question[],
  title: string,
  randomOrder: boolean,
  immediate: boolean,
  minutes = 0,
  count = pool.length,
): Session {
  return {
    id: crypto.randomUUID(),
    title,
    questions: (randomOrder ? shuffle(pool) : pool)
      .slice(0, count)
      .map((q) => ({
        ...q,
        // A historical/test-intent proposal is study material, not a grading key.
        correctAnswerId:
          q.verificationStatus === "verified" ? q.correctAnswerId : null,
        options: shuffle(q.options),
      })),
    index: 0,
    answers: [],
    immediate,
    startedAt: new Date().toISOString(),
    deadline: minutes
      ? new Date(Date.now() + minutes * 60000).toISOString()
      : null,
  };
}
export function answer(
  store: Store,
  answerId: string,
  now = new Date().toISOString(),
): Store {
  const s = store.active;
  if (!s) return store;
  const q = s.questions[s.index];
  if (
    !q ||
    s.answers.some((a) => a.questionId === q.id) ||
    !q.options.some((o) => o.id === answerId)
  )
    return store;
  const a: Answer = {
    questionId: q.id,
    answerId,
    correct: q.correctAnswerId === null ? null : answerId === q.correctAnswerId,
    at: now,
    sessionId: s.id,
  };
  return {
    ...store,
    active: { ...s, answers: [...s.answers, a] },
    answers: [...store.answers, a],
    progress: {
      ...store.progress,
      [q.id]: updateProgress(store.progress[q.id] ?? emptyProgress(q.id), a),
    },
  };
}
export function finish(store: Store): Store {
  if (!store.active) return store;
  return {
    ...store,
    active: null,
    history: [
      { ...store.active, finishedAt: new Date().toISOString() },
      ...store.history,
    ],
  };
}
export function stats(answers: Answer[]) {
  const graded = answers.filter((a) => a.correct !== null);
  return {
    total: answers.length,
    unique: new Set(answers.map((a) => a.questionId)).size,
    graded: graded.length,
    correct: graded.filter((a) => a.correct).length,
    incorrect: graded.filter((a) => !a.correct).length,
    ungraded: answers.length - graded.length,
    rate: graded.length
      ? Math.round(
          (graded.filter((a) => a.correct).length / graded.length) * 100,
        )
      : null,
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 20000;
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown) => v === null || date(v);
const num = (v: unknown) => Number.isInteger(v) && Number(v) >= 0;
const known = (v: unknown) =>
  typeof v === "string" && questions.some((q) => q.id === v);
export function validQuestion(v: unknown): v is Question {
  if (
    !object(v) ||
    !known(v.id) ||
    !str(v.question) ||
    !str(v.explanation) ||
    !str(v.category) ||
    !["verified", "provisional", "needs_review"].includes(
      String(v.verificationStatus),
    )
  )
    return false;
  const original = questions.find((q) => q.id === v.id)!;
  return (
    v.originalNumber === original.originalNumber &&
    v.question === original.question &&
    Array.isArray(v.options) &&
    v.options.length === 3 &&
    new Set(v.options.map((o) => o.id)).size === 3 &&
    v.options.every(
      (o) =>
        object(o) &&
        original.options.some((x) => x.id === o.id && x.text === o.text),
    ) &&
    (v.correctAnswerId === null ||
      v.options.some((o) => o.id === v.correctAnswerId)) &&
    (v.verificationStatus !== "verified" || v.correctAnswerId !== null) &&
    (v.note === undefined || str(v.note)) &&
    (v.expectedTestAnswerId === undefined ||
      v.expectedTestAnswerId === null ||
      v.options.some((o) => o.id === v.expectedTestAnswerId)) &&
    (v.reviewedAt === undefined || date(v.reviewedAt)) &&
    (v.sources === undefined ||
      (Array.isArray(v.sources) &&
        v.sources.length <= 10 &&
        v.sources.every(
          (s) =>
            object(s) &&
            str(s.title) &&
            typeof s.url === "string" &&
            /^https:\/\/[^\s]+$/.test(s.url),
        )))
  );
}
function validAnswer(v: unknown): v is Answer {
  return (
    object(v) &&
    known(v.questionId) &&
    ["a", "b", "c"].includes(String(v.answerId)) &&
    (v.correct === null || typeof v.correct === "boolean") &&
    date(v.at) &&
    str(v.sessionId)
  );
}
function validSession(v: unknown): v is Session {
  if (
    !object(v) ||
    !str(v.id) ||
    !str(v.title) ||
    !Array.isArray(v.questions) ||
    !v.questions.length ||
    v.questions.length > 62 ||
    !v.questions.every(validQuestion) ||
    new Set(v.questions.map((q) => q.id)).size !== v.questions.length ||
    !num(v.index) ||
    Number(v.index) >= v.questions.length ||
    !Array.isArray(v.answers) ||
    !v.answers.every(validAnswer) ||
    new Set(v.answers.map((a) => a.questionId)).size !== v.answers.length ||
    !date(v.startedAt) ||
    !nullableDate(v.deadline) ||
    typeof v.immediate !== "boolean"
  )
    return false;
  const sessionQuestions = v.questions;
  return v.answers.every(
    (a) =>
      a.sessionId === v.id &&
      sessionQuestions.some(
        (q: Question) =>
          q.id === a.questionId &&
          (q.correctAnswerId === null
            ? a.correct === null
            : a.correct === (q.correctAnswerId === a.answerId)),
      ),
  );
}
export function parseStore(text: string): Store {
  const v: unknown = JSON.parse(text);
  if (
    !object(v) ||
    v.version !== 1 ||
    !object(v.progress) ||
    !object(v.overrides) ||
    !Array.isArray(v.answers) ||
    !v.answers.every(validAnswer) ||
    !Array.isArray(v.history) ||
    !v.history.every(
      (h) => object(h) && date(h.finishedAt) && validSession(h),
    ) ||
    (v.active !== null && !validSession(v.active)) ||
    !object(v.settings)
  )
    throw Error("Neplatná struktura nebo verze zálohy.");
  const settings = v.settings;
  if (
    !["dark", "shuffle", "excludeUnverified"].every(
      (k) => typeof settings[k] === "boolean",
    )
  )
    throw Error("Neplatné nastavení zálohy.");
  for (const [id, p] of Object.entries(v.progress)) {
    if (
      !known(id) ||
      !object(p) ||
      p.questionId !== id ||
      ![p.attempts, p.correct, p.incorrect, p.consecutiveCorrect].every(num) ||
      p.attempts !== Number(p.correct) + Number(p.incorrect) ||
      Number(p.consecutiveCorrect) > Number(p.correct) ||
      !nullableDate(p.lastAnsweredAt) ||
      !nullableDate(p.nextReviewAt) ||
      typeof p.manuallyFlagged !== "boolean" ||
      !Array.isArray(p.correctDays) ||
      !p.correctDays.every(date)
    )
      throw Error("Neplatný postup otázky.");
  }
  for (const [id, q] of Object.entries(v.overrides))
    if (!validQuestion(q) || q.id !== id) throw Error("Neplatná úprava klíče.");
  return v as unknown as Store;
}
export function save(
  store: Store,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  storage.setItem(KEY, JSON.stringify(store));
}
export function load(storage: Pick<Storage, "getItem"> = localStorage): Store {
  const text = storage.getItem(KEY);
  return text ? parseStore(text) : fresh();
}
