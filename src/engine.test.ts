import { describe, it, expect } from "vitest";
import {
  questions,
  shuffle,
  fresh,
  createSession,
  answer,
  finish,
  stats,
  isProblem,
  mastered,
  emptyProgress,
  updateProgress,
  parseStore,
  save,
  load,
  type Answer,
} from "./engine";
describe("původní databáze", () => {
  it("má 62 úplných otázek s unikátními a platnými ID", () => {
    expect(questions).toHaveLength(62);
    expect(new Set(questions.map((q) => q.id)).size).toBe(62);
    questions.forEach((q, i) => {
      expect(q.originalNumber).toBe(i + 1);
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(3);
      expect(q.question.length).toBeGreaterThan(10);
      expect(q.explanation.length).toBeGreaterThan(20);
      if (q.correctAnswerId)
        expect(q.options.some((o) => o.id === q.correctAnswerId)).toBe(true);
    });
  });
  it("zachovává zalomené třetí odpovědi a oddělené otázky", () => {
    expect(questions[9].options[2].text).toContain(
      "osobou schopnou vyhodnotit možná rizika",
    );
    expect(questions[10].question).toBe(
      "Jmenovité napětí trojfázové rozvodné sítě nn v ČR je",
    );
    expect(questions[17].options[2].text).toContain("bezpečnost a zdraví osob");
    expect(questions[32].question).toBe("Práce podle pokynů je práce");
    expect(questions[38].question.startsWith("První číslice")).toBe(true);
  });
  it("nevnucuje klíč sporným otázkám", () => {
    expect(questions.filter((q) => !q.correctAnswerId)).toHaveLength(9);
    expect(
      questions.filter((q) => q.verificationStatus === "verified"),
    ).toHaveLength(25);
  });
});
describe("testy a hodnocení", () => {
  it("promíchá kopii a zachová ID správné odpovědi", () => {
    const source = questions[10].options;
    const mixed = shuffle(source, () => 0);
    expect(mixed.map((o) => o.id)).not.toEqual(source.map((o) => o.id));
    expect(source[0].id).toBe("a");
    let s = fresh();
    s.active = createSession([questions[10]], "test", true, true);
    s = answer(s, "a");
    expect(s.active?.answers[0].correct).toBe(true);
  });
  it("dvojklik nezapočítá odpověď podruhé", () => {
    let s = fresh();
    s.active = createSession([questions[0]], "test", false, true);
    s = answer(s, "a");
    const duplicate = answer(s, "b");
    expect(duplicate).toBe(s);
    expect(s.progress.q1.attempts).toBe(1);
    expect(s.answers).toHaveLength(1);
  });
  it("přechází po otázkách a dokončí jen jednou", () => {
    let s = fresh();
    s.active = createSession(questions.slice(0, 2), "test", false, false);
    s = answer(s, "a");
    s.active!.index = 1;
    s = answer(s, "b");
    s = finish(s);
    expect(s.active).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].answers).toHaveLength(2);
    expect(finish(s)).toBe(s);
  });
  it("neznámý klíč nevytváří chybu ani interval", () => {
    let s = fresh();
    s.active = createSession([questions[6]], "test", false, true);
    s = answer(s, "a");
    expect(s.answers[0].correct).toBeNull();
    expect(s.progress.q7.attempts).toBe(0);
    expect(s.progress.q7.nextReviewAt).toBeNull();
    expect(stats(s.answers).rate).toBeNull();
  });
  it("odlišuje opakované odpovědi od unikátních otázek", () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) {
      s.active = createSession([questions[0]], "test", false, true);
      s = answer(s, i === 2 ? "b" : "a");
      s = finish(s);
    }
    expect(stats(s.answers)).toMatchObject({
      total: 3,
      unique: 1,
      correct: 2,
      incorrect: 1,
      rate: 67,
    });
  });
  it("probíhající test si uchová klíč po editaci databáze", () => {
    let s = fresh();
    s.active = createSession([questions[0]], "test", false, true);
    s.overrides.q1 = { ...questions[0], correctAnswerId: "b" };
    s = answer(s, "a");
    expect(s.active?.answers[0].correct).toBe(true);
  });
});
describe("adaptivní opakování", () => {
  const a = (correct: boolean, at: string): Answer => ({
    questionId: "q1",
    answerId: "a",
    correct,
    at,
    sessionId: "s",
  });
  it("po chybě zařadí otázku do problémových a zkrátí interval", () => {
    const p = updateProgress(
      emptyProgress("q1"),
      a(false, "2026-01-01T12:00:00Z"),
    );
    expect(isProblem(p, Date.parse("2026-01-01T12:00:00Z"))).toBe(true);
    expect(p.nextReviewAt).toBe("2026-01-01T12:10:00.000Z");
  });
  it("správné odpovědi prodlužují interval, zvládnutí vyžaduje tři dny", () => {
    let p = emptyProgress("q1");
    for (let i = 0; i < 3; i++)
      p = updateProgress(p, a(true, "2026-01-01T12:00:00Z"));
    expect(mastered(p)).toBe(false);
    p = updateProgress(p, a(true, "2026-01-02T12:00:00Z"));
    p = updateProgress(p, a(true, "2026-01-03T12:00:00Z"));
    expect(mastered(p)).toBe(true);
    expect(mastered({ ...p, manuallyFlagged: true })).toBe(false);
    expect(isProblem({ ...p, manuallyFlagged: true })).toBe(true);
  });
  it("splatné otázky se vrací i po zvládnutí", () => {
    const p = updateProgress(
      emptyProgress("q1"),
      a(true, "2026-01-01T12:00:00Z"),
    );
    expect(isProblem(p, Date.parse("2026-01-03"))).toBe(true);
  });
});
describe("ukládání a zálohy", () => {
  it("obnoví pořadí, odpověď, nastavení, historii i časový limit", () => {
    let s = fresh();
    s.active = createSession(questions.slice(0, 5), "test", true, false, 10);
    s = answer(s, "b");
    s.settings.dark = true;
    let data = "";
    const storage = {
      setItem: (_k: string, v: string) => {
        data = v;
      },
      getItem: () => data,
    };
    save(s, storage);
    expect(load(storage)).toEqual(s);
    expect(parseStore(JSON.stringify(s))).toEqual(s);
  });
  it("propaguje nedostupné úložiště", () => {
    expect(() =>
      save(fresh(), {
        setItem: () => {
          throw Error("QuotaExceededError");
        },
      }),
    ).toThrow();
  });
  it.each([
    { version: 2 },
    { ...fresh(), settings: { dark: "false" } },
    { ...fresh(), answers: [{ questionId: "q999" }] },
    { ...fresh(), progress: { q1: { attempts: -1 } } },
    { ...fresh(), active: { questions: [] } },
    {
      ...fresh(),
      overrides: { q1: { ...questions[0], correctAnswerId: "x" } },
    },
  ])("odmítne chybnou strukturu", (data) => {
    expect(() => parseStore(JSON.stringify(data))).toThrow();
  });
  it("import zachová lokálně upravený klíč", () => {
    const s = fresh();
    s.overrides.q1 = {
      ...questions[0],
      correctAnswerId: "b",
      note: "Ověřeno vyučujícím",
    };
    expect(parseStore(JSON.stringify(s)).overrides.q1.correctAnswerId).toBe(
      "b",
    );
  });
});
