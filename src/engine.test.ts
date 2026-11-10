import audit from "./data/review-2026-11-10.json";
import source from "./data/MPC-BEZ_otazky_klic.json";
import legacy from "./data/questions.json";
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
    expect(questions.filter((q) => !q.correctAnswerId)).toHaveLength(5);
    expect(questions.filter((q) => q.answerStatus === "verified")).toHaveLength(
      46,
    );
  });
});
describe("testy a hodnocení", () => {
  it("promíchá kopii a zachová ID správné odpovědi", () => {
    const source = questions[10].options;
    const mixed = shuffle(source, () => 0);
    expect(mixed.map((o) => o.id)).not.toEqual(source.map((o) => o.id));
    expect(source[0].id).toBe("1");
    let s = fresh();
    s.active = createSession([questions[10]], "test", true, true);
    s = answer(s, "1");
    expect(s.active?.answers[0].correct).toBe(true);
  });
  it("dvojklik nezapočítá odpověď podruhé", () => {
    let s = fresh();
    s.active = createSession([questions[0]], "test", false, true);
    s = answer(s, "1");
    const duplicate = answer(s, "2");
    expect(duplicate).toBe(s);
    expect(s.progress["bez-01"].attempts).toBe(1);
    expect(s.answers).toHaveLength(1);
  });
  it("přechází po otázkách a dokončí jen jednou", () => {
    let s = fresh();
    s.active = createSession(questions.slice(0, 2), "test", false, false);
    s = answer(s, "1");
    s.active!.index = 1;
    s = answer(s, "2");
    s = finish(s);
    expect(s.active).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].answers).toHaveLength(2);
    expect(finish(s)).toBe(s);
  });
  it("neznámý klíč nevytváří chybu ani interval", () => {
    let s = fresh();
    s.active = createSession([questions[6]], "test", false, true);
    s = answer(s, "1");
    expect(s.answers[0].correct).toBeNull();
    expect(s.progress["bez-07"].attempts).toBe(0);
    expect(s.progress["bez-07"].nextReviewAt).toBeNull();
    expect(stats(s.answers).rate).toBeNull();
  });
  it("odlišuje opakované odpovědi od unikátních otázek", () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) {
      s.active = createSession([questions[0]], "test", false, true);
      s = answer(s, i === 2 ? "2" : "1");
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
    s.overrides["bez-01"] = { ...questions[0], correctAnswerId: "2" };
    s = answer(s, "1");
    expect(s.active?.answers[0].correct).toBe(true);
  });
});
describe("adaptivní opakování", () => {
  const a = (correct: boolean, at: string): Answer => ({
    questionId: "bez-01",
    answerId: "1",
    correct,
    at,
    sessionId: "s",
  });
  it("po chybě zařadí otázku do problémových a zkrátí interval", () => {
    const p = updateProgress(
      emptyProgress("bez-01"),
      a(false, "2026-01-01T12:00:00Z"),
    );
    expect(isProblem(p, Date.parse("2026-01-01T12:00:00Z"))).toBe(true);
    expect(p.nextReviewAt).toBe("2026-01-01T12:10:00.000Z");
  });
  it("správné odpovědi prodlužují interval, zvládnutí vyžaduje tři dny", () => {
    let p = emptyProgress("bez-01");
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
      emptyProgress("bez-01"),
      a(true, "2026-01-01T12:00:00Z"),
    );
    expect(isProblem(p, Date.parse("2026-01-03"))).toBe(true);
  });
});
describe("ukládání a zálohy", () => {
  it("obnoví pořadí, odpověď, nastavení, historii i časový limit", () => {
    let s = fresh();
    s.active = createSession(questions.slice(0, 5), "test", true, false, 10);
    s = answer(s, "2");
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
      overrides: { "bez-01": { ...questions[0], correctAnswerId: "x" } },
    },
  ])("odmítne chybnou strukturu", (data) => {
    expect(() => parseStore(JSON.stringify(data))).toThrow();
  });
  it("import zachová lokálně upravený klíč", () => {
    const s = fresh();
    s.overrides["bez-01"] = {
      ...questions[0],
      correctAnswerId: "2",
      note: "Ověřeno vyučujícím",
    };
    expect(
      parseStore(JSON.stringify(s)).overrides["bez-01"].correctAnswerId,
    ).toBe("2");
  });
});

describe("JSON jako autoritativní databáze", () => {
  it("dokončí všech 62 otázek: 55 hodnocených a 7 bez hodnocení", () => {
    let s = fresh();
    s.active = createSession(questions, "Kompletní test", true, false);
    const order = s.active.questions.map((q) => q.id);
    for (let index = 0; index < 62; index++) {
      s.active!.index = index;
      const q = s.active!.questions[index];
      s = answer(s, q.correctAnswerId ?? q.options[0].id);
    }
    s = finish(s);
    expect(stats(s.answers)).toMatchObject({
      total: 62,
      unique: 62,
      graded: 55,
      correct: 55,
      incorrect: 0,
      ungraded: 7,
      rate: 100,
    });
    expect(s.history[0].questions.map((q) => q.id)).toEqual(order);
    expect(parseStore(JSON.stringify(s))).toEqual(s);
  });
  it("přesně zachová všech 62 otázek, možnosti, ID, klíče i stavy", () => {
    for (const [i, q] of questions.entries()) {
      const original = source.questions[i];
      expect(q.id).toBe(original.id);
      expect(q.question).toBe(original.question);
      expect(q.options).toEqual(original.options);
      expect(q.correctAnswerId).toBe(original.correctAnswerId);
      expect(q.answerStatus).toBe(original.answerStatus);
      expect(q.answerNote).toBe(original.answerNote);
      expect(q.sources?.map((s) => s.url)).toEqual(original.sources);
    }
  });
  it("hodnotí všechny předběžné varianty podle dodaného ID", () => {
    for (const q of questions.filter((q) =>
      q.answerStatus.startsWith("provisional"),
    )) {
      let s = fresh();
      s.active = createSession([q], "test", false, true);
      s = answer(s, q.correctAnswerId!);
      expect(s.answers[0].correct).toBe(true);
      expect(s.progress[q.id].attempts).toBe(1);
      expect(parseStore(JSON.stringify(s))).toEqual(s);
    }
  });
  it("needs_review blokuje hodnocení i při neprázdném klíči", () => {
    let s = fresh();
    s.active = createSession(
      [{ ...questions[6], correctAnswerId: "1" }],
      "test",
      false,
      true,
    );
    s = answer(s, "1");
    expect(s.answers[0].correct).toBeNull();
    expect(s.progress[questions[6].id].attempts).toBe(0);
    expect(parseStore(JSON.stringify(s))).toEqual(s);
  });
  it.each(["1", "2", "3"])(
    "ID %s funguje na libovolné pozici po změně klíče",
    (key) => {
      for (let offset = 0; offset < 3; offset++) {
        let s = fresh();
        s.active = createSession(
          [{ ...questions[0], correctAnswerId: key }],
          "test",
          false,
          true,
        );
        const opts = questions[0].options;
        s.active.questions[0].options = [
          ...opts.slice(offset),
          ...opts.slice(0, offset),
        ];
        s = answer(s, key);
        expect(s.answers[0].correct).toBe(true);
        s = fresh();
        s.active = createSession(
          [{ ...questions[0], correctAnswerId: key }],
          "test",
          false,
          true,
        );
        s = answer(s, opts.find((o) => o.id !== key)!.id);
        expect(s.answers[0].correct).toBe(false);
      }
    },
  );
  it("odmítne nebezpečný odkaz ze zálohy", () => {
    const s = fresh();
    s.overrides[questions[0].id] = {
      ...questions[0],
      sources: [{ title: "Zdroj", url: "javascript:alert(1)" }],
    };
    expect(() => parseStore(JSON.stringify(s))).toThrow();
  });
});
describe("migrace předchozího postupu", () => {
  it("převede ID, uchová statistiky, historii, aktivní pořadí i lokální změny", () => {
    const at = "2026-11-01T12:00:00Z";
    const a = {
      questionId: "q1",
      answerId: "a",
      correct: true,
      at,
      sessionId: "old",
    };
    const active = {
      id: "old",
      title: "Starší test",
      questions: [
        {
          ...legacy[0],
          options: [
            legacy[0].options[2],
            legacy[0].options[0],
            legacy[0].options[1],
          ],
        },
      ],
      index: 0,
      answers: [a],
      immediate: true,
      startedAt: at,
      deadline: null,
    };
    const old = {
      version: 1,
      progress: {
        q1: {
          ...emptyProgress("q1"),
          attempts: 1,
          correct: 1,
          consecutiveCorrect: 1,
          lastAnsweredAt: at,
          correctDays: [at.slice(0, 10)],
        },
      },
      answers: [a],
      active,
      history: [{ ...active, finishedAt: at }],
      overrides: { q1: { ...legacy[0], correctAnswerId: "b" } },
      settings: { dark: true, shuffle: false, excludeUnverified: false },
    };
    const migrated = parseStore(JSON.stringify(old));
    expect(migrated.version).toBe(2);
    expect(migrated.progress["bez-01"].correct).toBe(1);
    expect(migrated.answers[0]).toMatchObject({
      questionId: "bez-01",
      answerId: "1",
      correct: true,
    });
    expect(migrated.history[0].questions[0].correctAnswerId).toBe("1");
    expect(migrated.active?.questions[0].options.map((o) => o.id)).toEqual([
      "3",
      "1",
      "2",
    ]);
    expect(migrated.overrides["bez-01"].correctAnswerId).toBe("2");
    expect(migrated.settings.dark).toBe(true);
    expect(parseStore(JSON.stringify(migrated))).toEqual(migrated);
  });
});

describe("revize 10. 11. 2026", () => {
  it("nemění původní texty ani jednu ze 186 možností", () => {
    for (const [i, q] of questions.entries()) {
      expect(q.question).toBe(legacy[i].question);
      expect(q.options.map((o) => o.text)).toEqual(
        legacy[i].options.map((o) => o.text),
      );
    }
  });
  it("má právě jednu dohledatelnou kontrolu pro každou otázku", () => {
    expect(audit.entries).toHaveLength(62);
    expect(new Set(audit.entries.map((e) => e.questionId)).size).toBe(62);
    for (const q of questions) {
      const e = audit.entries.find((e) => e.questionId === q.id)!;
      expect(q.correctAnswerId).toBe(e.correctAnswerId);
      expect(q.answerStatus).toBe(e.answerStatus);
      expect(q.reviewedAt).toBe("2026-11-10");
      expect(q.sources?.length).toBeGreaterThan(0);
      for (const s of q.sources!)
        expect(new URL(s.url).protocol).toBe("https:");
    }
  });
  it.each([
    [20, "3"],
    [60, "2"],
  ] as const)(
    "otázka %s odděluje navrženou změnu od výsledku ověření",
    (number, proposal) => {
      const q = questions[number - 1];
      expect(q.correctAnswerId).toBe(proposal);
      expect(q.sourceSupportedAnswerId).toBe("1");
      expect(q.answerStatus).toBe("needs_review");
      for (const option of q.options) {
        let s = fresh();
        s.active = createSession([q], "test", false, true);
        s = answer(s, option.id);
        expect(s.answers[0].correct).toBeNull();
        expect(s.progress[q.id].attempts).toBe(0);
        expect(parseStore(JSON.stringify(s))).toEqual(s);
      }
    },
  );
  it("revize nepřepočítá dokončené ani rozpracované testy z minulé verze", () => {
    let s = fresh();
    const q = {
      ...questions[19],
      answerStatus: "provisional" as const,
      correctAnswerId: "1",
      keyRevision: undefined,
      sourceSupportedAnswerId: undefined,
      reviewVerdict: undefined,
      reviewedAt: undefined,
    };
    s.active = createSession([q], "Původní test", false, true);
    s = answer(s, "1");
    const before = parseStore(JSON.stringify(s));
    expect(before.answers[0].correct).toBe(true);
    expect(before.active?.questions[0].correctAnswerId).toBe("1");
    s = finish(before);
    expect(parseStore(JSON.stringify(s)).history[0].answers[0].correct).toBe(
      true,
    );
    s.active = createSession([questions[19]], "Nový test", false, true);
    s = answer(s, "3");
    expect(s.answers.at(-1)?.correct).toBeNull();
    expect(s.progress[questions[19].id].attempts).toBe(1);
  });
});
