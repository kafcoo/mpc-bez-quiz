import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  Clock,
  Download,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Moon,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Sun,
  Target,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  answer,
  categories,
  createSession,
  emptyProgress,
  finish,
  fresh,
  isProblem,
  load,
  mastered,
  parseStore,
  questions,
  save,
  stats,
  type Question,
  type Result,
  type Store,
} from "./engine";
const groups = [
  [1, 12],
  [13, 24],
  [25, 36],
  [37, 48],
  [49, 62],
];
const fmt = (v: number | null) => (v === null ? "—" : `${v} %`);
const statusText = {
  verified: "Doloženo zdrojem",
  provisional: "Pracovní návrh",
  needs_review: "K ověření",
};
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initial() {
  try {
    return { store: load(), error: "" };
  } catch {
    return {
      store: fresh(),
      error:
        "Uložená data se nepodařilo načíst. Původní záznam zůstává v úložišti; stáhněte ho v Nastavení před nahrazením.",
    };
  }
}
export default function App() {
  const [boot] = useState(initial);
  const [store, setStore] = useState<Store>(boot.store);
  const [error, setError] = useState(boot.error);
  const [blocked, setBlocked] = useState(!!boot.error);
  const [page, setPage] = useState("home");
  const [config, setConfig] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState("all");
  const [filter, setFilter] = useState("all");
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [count, setCount] = useState(10);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [immediate, setImmediate] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const all = questions.map((q) => store.overrides[q.id] ?? q);
  const summary = stats(store.answers);
  const problems = all.filter((q) => isProblem(store.progress[q.id]));
  const masteredCount = all.filter((q) =>
    mastered(store.progress[q.id]),
  ).length;
  const active = store.active;
  const q = active?.questions[active.index];
  const selected = active?.answers.find((a) => a.questionId === q?.id);
  const activeStats = stats(active?.answers ?? []);
  useEffect(() => {
    document.documentElement.dataset.theme = store.settings.dark
      ? "dark"
      : "light";
    if (blocked) return;
    try {
      save(store);
      setError("");
    } catch {
      setError(
        "Postup nelze uložit. Úložiště je plné nebo nedostupné. Exportujte si zálohu.",
      );
    }
  }, [store, blocked]);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (store.active?.deadline && Date.parse(store.active.deadline) <= clock) {
      setResult({ ...store.active, finishedAt: new Date().toISOString() });
      setStore((s) => finish(s));
      setPage("result");
    }
  }, [clock, store.active]);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
  }, [page, active?.index]);
  useEffect(() => {
    if (!config && !editing) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>('[role="dialog"]');
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]',
        ) ?? [],
      );
    controls()[0]?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfig(null);
        setEditing(null);
      }
      if (event.key === "Tab") {
        const items = controls();
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [config, !!editing]);
  function choose(id: string) {
    setStore((s) =>
      s.active?.deadline && Date.parse(s.active.deadline) <= Date.now()
        ? s
        : answer(s, id),
    );
  }
  function next() {
    if (!active || !selected) return;
    if (active.index === active.questions.length - 1) {
      setResult({ ...active, finishedAt: new Date().toISOString() });
      setStore((s) => finish(s));
      setPage("result");
    } else
      setStore((s) =>
        s.active
          ? { ...s, active: { ...s.active, index: s.active.index + 1 } }
          : s,
      );
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        page !== "quiz" ||
        !q ||
        /INPUT|SELECT|TEXTAREA|BUTTON/.test(
          (e.target as HTMLElement).tagName,
        ) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        choose(q.options[Number(e.key) - 1].id);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function flag(id: string) {
    setStore((s) => ({
      ...s,
      progress: {
        ...s.progress,
        [id]: {
          ...(s.progress[id] ?? emptyProgress(id)),
          manuallyFlagged: !s.progress[id]?.manuallyFlagged,
        },
      },
    }));
  }
  function openConfig(mode: string) {
    setConfig(mode);
    setNotice("");
    setCategory("");
    setTopics([]);
    setImmediate(mode !== "random");
  }
  function start() {
    let pool = all;
    if (config === "group")
      pool = category
        ? all.filter((q) => q.category === category)
        : all.filter((q) => q.originalNumber >= from && q.originalNumber <= to);
    if (config === "problems")
      pool = problems.sort(
        (a, b) =>
          (store.progress[b.id]?.incorrect ?? 0) -
          (store.progress[a.id]?.incorrect ?? 0),
      );
    if (config === "random" && topics.length)
      pool = pool.filter((q) => topics.includes(q.category));
    if (store.settings.excludeUnverified)
      pool = pool.filter(
        (q) => q.verificationStatus === "verified" && q.correctAnswerId,
      );
    if (!pool.length) {
      setNotice(
        "Výběr neobsahuje žádné otázky. Upravte filtry nebo přidejte obtížné otázky.",
      );
      return;
    }
    if (
      active &&
      !window.confirm(
        "Nahradit rozpracovaný test? Dosavadní odpovědi ve statistikách zůstanou.",
      )
    )
      return;
    const titles: Record<string, string> = {
      full: "Kompletní test",
      group: "Výběr skupiny",
      problems: "Problémové otázky",
      random: "Náhodný test",
    };
    setStore((s) => ({
      ...s,
      active: createSession(
        pool,
        titles[config!],
        config === "random" || s.settings.shuffle,
        immediate,
        config === "random" ? minutes : 0,
        config === "random" ? count : pool.length,
      ),
    }));
    setConfig(null);
    setPage("quiz");
  }
  const nav = [
    { id: "home", label: "Přehled", icon: LayoutDashboard },
    { id: "study", label: "Přehled otázek", icon: BookOpen },
    { id: "stats", label: "Moje výsledky", icon: ChartNoAxesCombined },
    { id: "settings", label: "Nastavení", icon: Settings },
  ];
  const visible = all.filter(
    (q) =>
      (!query ||
        [q.question, ...q.options.map((o) => o.text)]
          .join(" ")
          .toLocaleLowerCase("cs")
          .includes(query.toLocaleLowerCase("cs"))) &&
      (!category || q.category === category) &&
      (range === "all" ||
        (q.originalNumber >= groups[Number(range)][0] &&
          q.originalNumber <= groups[Number(range)][1])) &&
      (filter === "all" ||
        (filter === "problems" && isProblem(store.progress[q.id])) ||
        (filter === "mastered" && mastered(store.progress[q.id])) ||
        (filter === "unseen" &&
          !store.answers.some((a) => a.questionId === q.id)) ||
        (filter === "review" && q.verificationStatus !== "verified")),
  );
  const renderStatus = (question: Question) => (
    <span className={`badge ${question.verificationStatus}`}>
      {statusText[question.verificationStatus]}
    </span>
  );
  const questionDetails = (question: Question) => (
    <div className="explanation">
      <strong>
        {question.correctAnswerId
          ? `${question.verificationStatus === "verified" ? "Doložená odpověď" : "Podmíněný testový návrh"}: ${question.options.find((o) => o.id === question.correctAnswerId)?.text}`
          : "Klíč není určen · bez hodnocení"}
      </strong>
      {question.expectedTestAnswerId &&
        question.verificationStatus !== "verified" && (
          <p className="audit-intent">
            Pravděpodobný záměr sady 2022: původní možnost{" "}
            {question.expectedTestAnswerId.toUpperCase()} —{" "}
            {
              question.options.find(
                (o) => o.id === question.expectedTestAnswerId,
              )?.text
            }
            . Tento návrh se v nových testech nehodnotí.
          </p>
        )}
      <p>{question.explanation}</p>
      <small>{question.note}</small>
      {question.sources && (
        <div className="question-sources">
          <strong>
            Zdroje kontroly ·{" "}
            {question.reviewedAt &&
              new Date(question.reviewedAt).toLocaleDateString("cs-CZ")}
          </strong>
          <ul>
            {question.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          aria-label="MPC-BEZ · přehled"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          <span className="brand-mark">
            <Zap size={23} fill="currentColor" />
          </span>
          <span>
            MPC-BEZ<small>STUDIJNÍ PRŮVODCE</small>
          </span>
        </a>
        <div className="course-label">TVŮJ STUDIJNÍ PROSTOR</div>
        <nav aria-label="Hlavní navigace">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              className={page === n.id ? "active" : ""}
              onClick={() => {
                setPage(n.id);
                setCategory("");
              }}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "study" && <span className="nav-count">62</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={20} />
            <div>
              Jen ty a tvůj pokrok
              <small>Bez registrace. Uloženo v prohlížeči.</small>
            </div>
          </div>
          <button
            className="theme-button"
            onClick={() =>
              setStore((s) => ({
                ...s,
                settings: { ...s.settings, dark: !s.settings.dark },
              }))
            }
          >
            {store.settings.dark ? <Sun size={18} /> : <Moon size={18} />}{" "}
            {store.settings.dark ? "Světlý režim" : "Tmavý režim"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Bezpečnost v elektrotechnice{" "}
            <span className="muted">
              /{" "}
              {nav.find((n) => n.id === page)?.label ??
                (page === "quiz" ? "Procvičování" : "Výsledek testu")}
            </span>
          </span>
          <span className="top-pill">
            <span className="dot" /> Uč se vlastním tempem
          </span>
        </header>
        <main>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {page === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    MALÝ KROK DNES. VĚTŠÍ JISTOTA U TESTU.
                  </div>
                  <h1 ref={heading} tabIndex={-1}>
                    Bezpečně k zápočtu<span className="green">.</span>
                  </h1>
                  <p>
                    Všech 62 otázek. Vlastní tempo. Příprava, která dává smysl.
                  </p>
                </div>
                <span className="semester">
                  MPC-BEZ <span>2022 · sada otázek</span>
                </span>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <GraduationCap size={15} /> TVOJE PŘÍPRAVA ZAČÍNÁ TADY
                  </span>
                  <h2>
                    Trochu procvičování.
                    <br />O hodně víc jistoty.
                  </h2>
                  <p>
                    Procházej otázky, uč se z chyb a vrať se k tomu,
                    <br className="desktop" /> co potřebuješ ještě doladit.
                  </p>
                  <button
                    className="primary light"
                    onClick={() =>
                      active ? setPage("quiz") : openConfig("full")
                    }
                  >
                    {active ? "Pokračovat v testu" : "Pustit se do učení"}
                    <ArrowRight size={18} />
                  </button>
                  <small>
                    {active
                      ? `${active.answers.length} z ${active.questions.length} otázek zodpovězeno`
                      : "Bez časového tlaku. Postup se ukládá automaticky."}
                  </small>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="float-label label-top">
                    <Check size={15} /> Každá otázka se počítá
                  </div>
                  <div className="shield-illustration">
                    <ShieldCheck size={116} strokeWidth={1.15} />
                  </div>
                  <div className="float-label label-bottom">
                    <Zap size={16} fill="currentColor" /> Znalosti, které
                    chrání.
                  </div>
                  <span className="spark s1">+</span>
                  <span className="spark s2">+</span>
                </div>
              </section>
              <section className="stats-grid" aria-label="Tvůj pokrok">
                <Stat
                  icon={<BookOpen />}
                  value={`${summary.unique} / 62`}
                  label="Prozkoumaných otázek"
                />
                <Stat
                  icon={<Target />}
                  value={fmt(summary.rate)}
                  label="Celková úspěšnost"
                />
                <Stat
                  icon={<Flag />}
                  value={String(problems.length)}
                  label="K opakování"
                  tone="orange"
                />
                <Stat
                  icon={<ShieldCheck />}
                  value={String(masteredCount)}
                  label="Zvládnutých otázek"
                />
              </section>
              <div className="section-title">
                <div>
                  <h2>Jak se dnes budeš učit?</h2>
                  <p>Vyber si režim, který ti právě sedí.</p>
                </div>
                <span>04 REŽIMY PŘÍPRAVY</span>
              </div>
              <section className="mode-grid">
                {[
                  {
                    id: "full",
                    icon: BookOpen,
                    title: "Kompletní test",
                    desc: "Projdi si celou sadu a zjisti, jak na tom jsi.",
                    tag: "62 otázek",
                    tone: "green",
                  },
                  {
                    id: "group",
                    icon: SlidersHorizontal,
                    title: "Výběr skupiny",
                    desc: "Menší porce učení. Vyber si rozsah nebo téma.",
                    tag: "Podle tebe",
                    tone: "blue",
                  },
                  {
                    id: "problems",
                    icon: RotateCcw,
                    title: "Problémové otázky",
                    desc: "Zaměř se na chyby a upevni si nejisté znalosti.",
                    tag: `${problems.length} k opakování`,
                    tone: "orange",
                  },
                  {
                    id: "random",
                    icon: Shuffle,
                    title: "Náhodný test",
                    desc: "Vyzkoušej si test nanečisto. Pokaždé trochu jinak.",
                    tag: "10–62 otázek",
                    tone: "purple",
                  },
                ].map((m) => (
                  <button
                    className={`mode-card ${m.tone}`}
                    key={m.id}
                    onClick={() => openConfig(m.id)}
                  >
                    <div className="mode-top">
                      <span className="icon-box">
                        <m.icon size={23} />
                      </span>
                      <span className="badge">{m.tag}</span>
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.desc}</p>
                    <span className="mode-link">
                      {m.id === "group"
                        ? "Vybrat otázky"
                        : m.id === "problems"
                          ? "Zopakovat si"
                          : m.id === "random"
                            ? "Nastavit test"
                            : "Začít procvičovat"}{" "}
                      <ArrowRight size={17} />
                    </span>
                  </button>
                ))}
              </section>
              <section className="bottom-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <h3>Malé skupiny, velký pokrok</h3>
                    <button
                      className="text-button"
                      onClick={() => openConfig("group")}
                    >
                      Všechny skupiny <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="group-list">
                    {groups.map(([a, b]) => {
                      const s = stats(
                        store.answers.filter((x) => {
                          const n = Number(x.questionId.slice(1));
                          return n >= a && n <= b;
                        }),
                      );
                      return (
                        <button
                          className="group-row"
                          key={a}
                          onClick={() => {
                            setFrom(a);
                            setTo(b);
                            openConfig("group");
                          }}
                        >
                          <span className="group-number">
                            {String(
                              groups.findIndex((g) => g[0] === a) + 1,
                            ).padStart(2, "0")}
                          </span>
                          <span>
                            <strong>
                              Otázky {a}–{b}
                            </strong>
                            <small>{b - a + 1} otázek</small>
                          </span>
                          <div className="mini-progress">
                            <i style={{ width: `${s.rate ?? 0}%` }} />
                          </div>
                          <span>{fmt(s.rate)}</span>
                          <ArrowRight size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="tip-panel">
                  <span className="icon-box">
                    <Zap size={22} />
                  </span>
                  <span className="eyebrow">UČ SE CHYTŘEJI</span>
                  <h3>
                    Chyba je začátek
                    <br />
                    dobré odpovědi.
                  </h3>
                  <p>
                    Otázky, ve kterých chybuješ, se vracejí dřív. U těch
                    zvládnutých se interval postupně prodlužuje.
                  </p>
                  <span className="tip-foot">
                    <Clock size={16} /> Krátce a pravidelně funguje nejlépe.
                  </span>
                </div>
              </section>
              <div className="source-note">
                <ShieldCheck size={18} />
                <span>
                  Vycházíme ze sady otázek 2022. Klíč není oficiální; pracovní a
                  sporné odpovědi jsou označené.{" "}
                  {
                    all.filter((q) => q.verificationStatus === "needs_review")
                      .length
                  }{" "}
                  otázek čeká na ověření.
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    setPage("study");
                    setFilter("review");
                  }}
                >
                  Prohlédnout <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {page === "quiz" && active && q && (
            <div className="quiz-wrap">
              <button className="text-button" onClick={() => setPage("home")}>
                <ChevronLeft size={16} /> Uložit a zpět na přehled
              </button>
              <div className="section-title">
                <h1 ref={heading} tabIndex={-1}>
                  {active.title}
                </h1>
                {active.deadline && (
                  <span className="timer">
                    <Clock size={17} />
                    {Math.max(
                      0,
                      Math.floor((Date.parse(active.deadline) - clock) / 60000),
                    )}
                    :
                    {String(
                      Math.max(
                        0,
                        Math.floor(
                          (Date.parse(active.deadline) - clock) / 1000,
                        ) % 60,
                      ),
                    ).padStart(2, "0")}
                  </span>
                )}
              </div>
              <div className="quiz-progress">
                <span>
                  Otázka {active.index + 1} z {active.questions.length}
                </span>
                <span>
                  {active.immediate
                    ? `${activeStats.correct} správně · ${activeStats.incorrect} chybně · ${activeStats.ungraded} nehodnoceno`
                    : `${active.answers.length} zodpovězeno · vyhodnocení na konci`}
                </span>
              </div>
              {active.questions.some((question) => !question.reviewedAt) && (
                <p className="alert">
                  Tento rozpracovaný test vznikl před kontrolou klíče z 8. 11.
                  2026 a zachovává původní klíč. Pro aktuální zdroje a hodnocení
                  zahaj nový test.
                </p>
              )}
              <progress
                max={active.questions.length}
                value={active.answers.length}
              />
              <article className="question-card">
                <div className="question-meta">
                  <span>
                    #{q.originalNumber} · {q.category}
                  </span>
                  {renderStatus(q)}
                  <button
                    aria-label="Označit jako obtížnou"
                    aria-pressed={!!store.progress[q.id]?.manuallyFlagged}
                    className={
                      store.progress[q.id]?.manuallyFlagged
                        ? "flag marked"
                        : "flag"
                    }
                    onClick={() => flag(q.id)}
                  >
                    <Flag size={19} />
                  </button>
                </div>
                <h2>{q.question}</h2>
                <div className="answers">
                  {q.options.map((o, i) => {
                    const reveal = !!selected && active.immediate;
                    return (
                      <button
                        key={o.id}
                        disabled={!!selected}
                        className={`answer ${selected?.answerId === o.id ? "chosen" : ""} ${reveal && q.correctAnswerId === o.id ? "correct" : ""} ${reveal && selected.correct === false && selected.answerId === o.id ? "incorrect" : ""}`}
                        onClick={() => choose(o.id)}
                      >
                        <span className="answer-key">{i + 1}</span>
                        {o.text}
                        {reveal && q.correctAnswerId === o.id && (
                          <Check size={20} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div aria-live="polite">
                  {selected && active.immediate && (
                    <div
                      className={`feedback ${selected.correct === false ? "bad" : selected.correct === null ? "neutral" : ""}`}
                    >
                      <strong>
                        {selected.correct === null
                          ? "Uloženo bez hodnocení"
                          : selected.correct
                            ? "Správná odpověď podle klíče"
                            : "Tentokrát to nevyšlo"}
                      </strong>
                      {questionDetails(q)}
                    </div>
                  )}
                  {selected && !active.immediate && (
                    <p className="muted">
                      Odpověď uložena. Vyhodnocení se zobrazí po dokončení.
                    </p>
                  )}
                </div>
                <div className="question-footer">
                  <small>Klávesy 1–3 · Enter pro pokračování</small>
                  <button
                    className="primary"
                    disabled={!selected}
                    onClick={next}
                  >
                    {active.index === active.questions.length - 1
                      ? "Dokončit test"
                      : "Další otázka"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </article>
              <p className="muted quiz-note">
                {q.verificationStatus === "provisional"
                  ? "Podmíněný nebo historický návrh: v nových testech se nezapočítává do úspěšnosti."
                  : q.correctAnswerId === null
                    ? "Tato otázka nemá určený klíč a nezapočítá se do úspěšnosti."
                    : "Klíč slouží pro studium a není oficiálním klíčem vyučujícího."}
              </p>
            </div>
          )}
          {page === "result" && result && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DALŠÍ KROK ZA TEBOU</div>
                  <h1 ref={heading} tabIndex={-1}>
                    Hotovo. Každý pokus posouvá.
                  </h1>
                  <p>
                    {result.title} ·{" "}
                    {new Date(result.finishedAt).toLocaleString("cs-CZ")}
                  </p>
                </div>
              </div>
              <ResultSummary result={result} />
              <div className="actions">
                <button className="primary" onClick={() => setPage("home")}>
                  Zpět na přehled <ArrowRight size={17} />
                </button>
                <button onClick={() => openConfig("problems")}>
                  Procvičit problémové otázky
                </button>
              </div>
              <h2>Rozbor odpovědí</h2>
              {result.questions.map((question) => {
                const a = result.answers.find(
                  (a) => a.questionId === question.id,
                );
                return (
                  <article className="study-card" key={question.id}>
                    <div className="question-meta">
                      <span>#{question.originalNumber}</span>
                      {renderStatus(question)}
                      <span>
                        {!a
                          ? "Nezodpovězeno"
                          : a.correct === null
                            ? "Nehodnoceno"
                            : a.correct
                              ? "Správně"
                              : "Chybně"}
                      </span>
                    </div>
                    <h3>{question.question}</h3>
                    {a && (
                      <p>
                        Tvoje odpověď:{" "}
                        {
                          question.options.find((o) => o.id === a.answerId)
                            ?.text
                        }
                      </p>
                    )}
                    {questionDetails(question)}
                  </article>
                );
              })}
            </>
          )}
          {page === "study" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ZNALOSTI NA JEDNOM MÍSTĚ</div>
                  <h1 ref={heading} tabIndex={-1}>
                    Přehled otázek
                  </h1>
                  <p>
                    Původní znění všech 62 otázek. Odpovědi odkrývej vlastním
                    tempem.
                  </p>
                </div>
                <button onClick={() => setShowKey(!showKey)}>
                  <BookOpen size={17} />
                  {showKey ? "Skrýt odpovědi" : "Ukázat odpovědi"}
                </button>
              </div>
              <div className="filters">
                <input
                  aria-label="Vyhledat otázku"
                  placeholder="Hledat v otázkách a odpovědích…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Téma"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Všechna témata</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Skupina"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="all">Všechny skupiny</option>
                  {groups.map(([a, b], i) => (
                    <option key={a} value={i}>
                      {a}–{b}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Stav zvládnutí"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Všechny stavy</option>
                  <option value="problems">Problémové</option>
                  <option value="mastered">Zvládnuté</option>
                  <option value="unseen">Neprozkoumané</option>
                  <option value="review">K potvrzení / revizi</option>
                </select>
              </div>
              <p className="muted">Zobrazeno {visible.length} z 62 otázek</p>
              {!visible.length && (
                <div className="empty">Žádné otázky neodpovídají filtrům.</div>
              )}
              {visible.map((question) => (
                <article className="study-card" key={question.id}>
                  <div className="question-meta">
                    <span>
                      #{question.originalNumber} · {question.category}
                    </span>
                    {renderStatus(question)}
                    <button
                      className={
                        store.progress[question.id]?.manuallyFlagged
                          ? "flag marked"
                          : "flag"
                      }
                      aria-label={`Obtížná otázka ${question.originalNumber}`}
                      aria-pressed={
                        !!store.progress[question.id]?.manuallyFlagged
                      }
                      onClick={() => flag(question.id)}
                    >
                      <Flag size={17} />
                    </button>
                  </div>
                  <h3>{question.question}</h3>
                  <ul className="study-options">
                    {question.options.map((o) => (
                      <li
                        key={o.id}
                        className={
                          showKey && question.correctAnswerId === o.id
                            ? question.verificationStatus === "verified"
                              ? "key-correct"
                              : "key-provisional"
                            : ""
                        }
                      >
                        <span>{o.id.toUpperCase()}</span>
                        {o.text}
                        {showKey &&
                          question.verificationStatus === "verified" &&
                          question.correctAnswerId === o.id && (
                            <Check size={16} />
                          )}
                      </li>
                    ))}
                  </ul>
                  {showKey && questionDetails(question)}
                  <div className="study-bottom">
                    <small>
                      {store.progress[question.id]?.attempts ?? 0} hodnocených
                      pokusů ·{" "}
                      {fmt(
                        stats(
                          store.answers.filter(
                            (a) => a.questionId === question.id,
                          ),
                        ).rate,
                      )}
                    </small>
                    <button
                      className="text-button"
                      onClick={() => setEditing({ ...question })}
                    >
                      Upravit lokální klíč
                    </button>
                  </div>
                </article>
              ))}
            </>
          )}
          {page === "stats" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">TVŮJ POKROK V ČÍSLECH</div>
                  <h1 ref={heading} tabIndex={-1}>
                    Moje výsledky
                  </h1>
                  <p>
                    Každý pokus se počítá. Úspěšnost vychází pouze z hodnocených
                    odpovědí.
                  </p>
                </div>
              </div>
              <section className="stats-grid">
                <Stat
                  icon={<BookOpen />}
                  value={String(summary.total)}
                  label={`${summary.unique} unikátních otázek`}
                />
                <Stat
                  icon={<Target />}
                  value={fmt(summary.rate)}
                  label={`${summary.graded} hodnocených odpovědí`}
                />
                <Stat
                  icon={<Flag />}
                  value={String(problems.length)}
                  label="Problémových otázek"
                  tone="orange"
                />
                <Stat
                  icon={<ShieldCheck />}
                  value={String(masteredCount)}
                  label="Zvládnuto ve 3 různých dnech"
                />
              </section>
              <div className="panel">
                <h2>Vývoj úspěšnosti</h2>
                {store.history.some((h) => stats(h.answers).rate !== null) ? (
                  <div
                    className="chart"
                    aria-label="Úspěšnost posledních 14 testů"
                  >
                    {store.history
                      .slice(0, 14)
                      .reverse()
                      .map((h, i) => {
                        const s = stats(h.answers);
                        return (
                          <div className="chart-column" key={h.id}>
                            <span>{fmt(s.rate)}</span>
                            <div className="chart-track">
                              <i style={{ height: `${s.rate ?? 0}%` }} />
                            </div>
                            <small>{i + 1}. test</small>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="empty">
                    Dokonči první hodnocený test a sleduj svůj pokrok.
                  </div>
                )}
              </div>
              <div className="bottom-grid">
                <div className="panel">
                  <h3>Úspěšnost podle skupin</h3>
                  {groups.map(([a, b]) => (
                    <div className="group-row" key={a}>
                      <span>
                        Otázky {a}–{b}
                      </span>
                      <strong>
                        {fmt(
                          stats(
                            store.answers.filter(
                              (x) =>
                                +x.questionId.slice(1) >= a &&
                                +x.questionId.slice(1) <= b,
                            ),
                          ).rate,
                        )}
                      </strong>
                    </div>
                  ))}
                  <p className="muted">
                    {summary.ungraded} odpovědí bez klíče je uloženo bez
                    hodnocení.
                  </p>
                </div>
                <div className="panel">
                  <h3>Nejčastější chyby</h3>
                  {Object.values(store.progress)
                    .filter((p) => p.incorrect > 0)
                    .sort((a, b) => b.incorrect - a.incorrect)
                    .slice(0, 5)
                    .map((p) => (
                      <button
                        className="mistake"
                        key={p.questionId}
                        onClick={() => {
                          setQuery(
                            all.find((q) => q.id === p.questionId)!.question,
                          );
                          setCategory("");
                          setRange("all");
                          setFilter("all");
                          setPage("study");
                        }}
                      >
                        <span>
                          #{p.questionId.slice(1)}{" "}
                          {all.find((q) => q.id === p.questionId)?.question}
                        </span>
                        <b>{p.incorrect}×</b>
                      </button>
                    ))}
                  {!Object.values(store.progress).some((p) => p.incorrect) && (
                    <p className="muted">Zatím tu žádné chyby nejsou.</p>
                  )}
                </div>
              </div>
              <h2>Historie testů</h2>
              {!store.history.length && (
                <div className="empty">Tvé dokončené testy najdeš tady.</div>
              )}
              {store.history.map((h) => (
                <button
                  className="history-row"
                  key={h.id}
                  onClick={() => {
                    setResult(h);
                    setPage("result");
                  }}
                >
                  <span>
                    <strong>{h.title}</strong>
                    <small>
                      {new Date(h.finishedAt).toLocaleString("cs-CZ")} ·{" "}
                      {h.answers.length}/{h.questions.length} odpovědí
                    </small>
                  </span>
                  <b>{fmt(stats(h.answers).rate)}</b>
                  <ArrowRight size={18} />
                </button>
              ))}
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">VŠECHNO POD KONTROLOU</div>
                  <h1 ref={heading} tabIndex={-1}>
                    Nastavení
                  </h1>
                  <p>
                    Tvá data zůstávají v tomto prohlížeči. Zálohou je přeneseš
                    na jiné zařízení.
                  </p>
                </div>
              </div>
              <section className="panel settings-panel">
                <h2>Procvičování</h2>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={store.settings.dark}
                    onChange={(e) =>
                      setStore((s) => ({
                        ...s,
                        settings: { ...s.settings, dark: e.target.checked },
                      }))
                    }
                  />
                  Tmavý režim
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={store.settings.shuffle}
                    onChange={(e) =>
                      setStore((s) => ({
                        ...s,
                        settings: { ...s.settings, shuffle: e.target.checked },
                      }))
                    }
                  />
                  Náhodné pořadí otázek
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={store.settings.excludeUnverified}
                    onChange={(e) =>
                      setStore((s) => ({
                        ...s,
                        settings: {
                          ...s.settings,
                          excludeUnverified: e.target.checked,
                        },
                      }))
                    }
                  />
                  Do nových testů zařadit jen odborně posouzené odpovědi
                </label>
                <p className="muted">
                  V nových testech se hodnotí jen doložené odpovědi. Ostatní
                  otázky lze zahrnout pro studium bez vlivu na skóre. Odpovědi
                  se promíchávají vždy.
                </p>
              </section>
              <section className="panel settings-panel">
                <h2>Zálohy a databáze</h2>
                <div className="actions">
                  <button
                    onClick={() => download("mpc-bez-postup.json", store)}
                  >
                    <Download size={17} />
                    Exportovat postup
                  </button>
                  <button onClick={() => upload.current?.click()}>
                    <Upload size={17} />
                    Importovat postup
                  </button>
                  <button
                    onClick={() =>
                      download("mpc-bez-otazky.json", {
                        version: 1,
                        questions: all,
                      })
                    }
                  >
                    <Download size={17} />
                    Exportovat otázky
                  </button>
                </div>
                <input
                  hidden
                  ref={upload}
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      if (file.size > 20_000_000)
                        throw Error("Záloha je příliš velká.");
                      const imported = parseStore(await file.text());
                      if (
                        window.confirm(
                          "Import nahradí současný postup i lokální úpravy klíče. Pokračovat?",
                        )
                      ) {
                        setStore(imported);
                        setBlocked(false);
                        setNotice("Záloha byla úspěšně obnovena.");
                      }
                    } catch (err) {
                      setNotice(
                        err instanceof Error
                          ? err.message
                          : "Import se nepodařil.",
                      );
                    }
                  }}
                />
                {blocked && (
                  <button
                    onClick={() =>
                      download(
                        "mpc-bez-puvodni-zaznam.json",
                        localStorage.getItem("mpc-bez-v1"),
                      )
                    }
                  >
                    Stáhnout původní nečitelný záznam
                  </button>
                )}
                <p role="status">{notice}</p>
              </section>
              <section className="panel settings-panel">
                <h2>Jak funguje klíč a opakování?</h2>
                <p>
                  Zdrojový dokument z roku 2022 neobsahuje oficiální klíč.
                  Kontrola 8. 11. 2026 porovnala všech 62 otázek se zdroji.
                  „Doloženo zdrojem“ má 47 položek. U 11 je návrh podmíněný nebo
                  historický; 4 otázky jsou sporné. Posledních 15 se v nových
                  testech nehodnotí. Odhad testového záměru je oddělen od
                  hodnotícího klíče. Nejde o oficiální klíč ani potvrzení
                  aktuálnosti všech norem.
                </p>
                <p>
                  <a
                    className="text-button"
                    href="https://github.com/kafcoo/mpc-bez-quiz/blob/main/docs/kontrola-otazek.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Podrobná kontrola všech 62 otázek a její meze ↗
                  </a>
                </p>
                <p>
                  Klíč, vysvětlení a poznámku můžeš upravit u každé otázky v
                  přehledu. Úprava platí jen pro tvůj prohlížeč a pro nové
                  testy; starší výsledky zachovají původní klíč.
                </p>
                <p>
                  Po chybě se otázka vrátí za 10 minut. Po správných odpovědích
                  se interval prodlužuje na 1, 3, 7, 14 a 30 dní. Zvládnutí
                  vyžaduje alespoň tři správné odpovědi za sebou ve třech
                  různých dnech. Ruční označení obtížnosti má přednost.
                </p>
              </section>
              <section className="panel settings-panel">
                <h2>Začít znovu</h2>
                <p>
                  Reset vymaže statistiky, historii, obtížné otázky a
                  rozpracovaný test. Lokální klíč a nastavení zachová.
                </p>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Opravdu vymazat veškerý postup? Tuto akci nelze vrátit.",
                      )
                    ) {
                      setStore((s) => ({
                        ...fresh(),
                        overrides: s.overrides,
                        settings: s.settings,
                      }));
                      setBlocked(false);
                      setNotice("Statistiky byly vymazány.");
                    }
                  }}
                >
                  <RotateCcw size={17} />
                  Resetovat statistiky
                </button>
              </section>
            </>
          )}
          <footer>
            <span>
              MPC-BEZ <span className="muted">· Učení, které má smysl.</span>
            </span>
            <span>
              62 otázek <span className="footer-dot">·</span> Bez registrace{" "}
              <span className="footer-dot">·</span> Tvým tempem
            </span>
          </footer>
        </main>
      </div>
      {config && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfig(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-title"
          >
            <button
              autoFocus
              className="modal-close"
              aria-label="Zavřít nastavení testu"
              onClick={() => setConfig(null)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">PŘIPRAV SI SVÉ UČENÍ</div>
            <h2 id="config-title">
              {config === "full"
                ? "Kompletní test"
                : config === "group"
                  ? "Výběr skupiny"
                  : config === "problems"
                    ? "Problémové otázky"
                    : "Náhodný test"}
            </h2>
            {config === "group" && (
              <>
                <div className="group-pills">
                  {groups.map(([a, b]) => (
                    <button
                      className={
                        from === a && to === b && !category ? "selected" : ""
                      }
                      key={a}
                      onClick={() => {
                        setFrom(a);
                        setTo(b);
                        setCategory("");
                      }}
                    >
                      {a}–{b}
                      <small>
                        {b - a + 1} otázek ·{" "}
                        {fmt(
                          stats(
                            store.answers.filter(
                              (x) =>
                                +x.questionId.slice(1) >= a &&
                                +x.questionId.slice(1) <= b,
                            ),
                          ).rate,
                        )}
                      </small>
                    </button>
                  ))}
                </div>
                <div className="range-input">
                  <label>
                    Od otázky
                    <input
                      type="number"
                      min={1}
                      max={62}
                      value={from}
                      onChange={(e) => {
                        setFrom(Number(e.target.value));
                        setCategory("");
                      }}
                    />
                  </label>
                  <label>
                    Do otázky
                    <input
                      type="number"
                      min={from}
                      max={62}
                      value={to}
                      onChange={(e) => {
                        setTo(Number(e.target.value));
                        setCategory("");
                      }}
                    />
                  </label>
                </div>
                <label>
                  nebo podle tématu
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Vlastní interval</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {config === "problems" && (
              <p>
                {problems.length} otázek k opakování: chybné, ručně označené
                nebo splatné podle rozvrhu opakování.
              </p>
            )}
            {config === "full" && (
              <p>
                Všech 62 otázek, promíchané odpovědi a automatické ukládání po
                každé odpovědi.
              </p>
            )}
            {config === "random" && (
              <>
                <label>
                  Počet otázek
                  <select
                    value={count}
                    onChange={(e) => setCount(+e.target.value)}
                  >
                    {[10, 20, 30, 62].map((n) => (
                      <option key={n} value={n}>
                        {n === 62 ? "Všechny" : n}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>Tematické skupiny · prázdný výběr = všechny</legend>
                  {categories.map((c) => (
                    <label className="check-row" key={c}>
                      <input
                        type="checkbox"
                        checked={topics.includes(c)}
                        onChange={() =>
                          setTopics((t) =>
                            t.includes(c)
                              ? t.filter((x) => x !== c)
                              : [...t, c],
                          )
                        }
                      />
                      {c}
                    </label>
                  ))}
                </fieldset>
                <label>
                  Časový limit v minutách · 0 = bez limitu
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={minutes}
                    onChange={(e) =>
                      setMinutes(Math.max(0, Math.min(180, +e.target.value)))
                    }
                  />
                </label>
                <p className="muted">
                  Pokud filtry nabídnou méně otázek, test použije všechny
                  dostupné. Čas běží i při zavřené stránce.
                </p>
              </>
            )}
            <label className="check-row">
              <input
                type="checkbox"
                checked={immediate}
                onChange={(e) => setImmediate(e.target.checked)}
              />
              Okamžité vyhodnocení po odpovědi
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={store.settings.shuffle}
                onChange={(e) =>
                  setStore((s) => ({
                    ...s,
                    settings: { ...s.settings, shuffle: e.target.checked },
                  }))
                }
              />
              Náhodné pořadí {config === "random" && "(v náhodném testu vždy)"}
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={store.settings.excludeUnverified}
                onChange={(e) =>
                  setStore((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      excludeUnverified: e.target.checked,
                    },
                  }))
                }
              />
              Pouze odborně posouzené odpovědi
            </label>
            <p className="muted">
              Žádný klíč není oficiální. Podmíněné a sporné otázky se v nových
              testech nehodnotí.
            </p>
            {notice && (
              <p role="alert" className="alert">
                {notice}
              </p>
            )}
            <button
              className="primary wide"
              disabled={
                config === "group" &&
                !category &&
                (from < 1 ||
                  to > 62 ||
                  from > to ||
                  !Number.isInteger(from) ||
                  !Number.isInteger(to))
              }
              onClick={start}
            >
              <Play size={17} />
              Spustit{" "}
              {config === "random" && !immediate ? "simulaci" : "procvičování"}
            </button>
          </section>
        </div>
      )}
      {editing && (
        <div className="modal-overlay">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            onSubmit={(e) => {
              e.preventDefault();
              setStore((s) => ({
                ...s,
                overrides: { ...s.overrides, [editing.id]: editing },
              }));
              setEditing(null);
            }}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Zavřít editor"
              onClick={() => setEditing(null)}
            >
              <X size={20} />
            </button>
            <h2 id="edit-title">
              Lokální klíč · otázka {editing.originalNumber}
            </h2>
            <p>{editing.question}</p>
            <label>
              Správná odpověď
              <select
                autoFocus
                value={editing.correctAnswerId ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    correctAnswerId: e.target.value || null,
                    verificationStatus: e.target.value
                      ? editing.verificationStatus
                      : "needs_review",
                  })
                }
              >
                <option value="">Neurčena · nehodnotit</option>
                {editing.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id.toUpperCase()}: {o.text}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stav ověření
              <select
                value={editing.verificationStatus}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    verificationStatus: e.target
                      .value as Question["verificationStatus"],
                  })
                }
              >
                <option value="needs_review">K ověření</option>
                <option value="provisional">Pracovní návrh</option>
                <option value="verified" disabled={!editing.correctAnswerId}>
                  Posouzeno / lokálně ověřeno
                </option>
              </select>
            </label>
            <label>
              Vysvětlení
              <textarea
                required
                value={editing.explanation}
                onChange={(e) =>
                  setEditing({ ...editing, explanation: e.target.value })
                }
              />
            </label>
            <label>
              Poznámka a zdroj ověření
              <textarea
                value={editing.note ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, note: e.target.value })
                }
              />
            </label>
            <p className="muted">
              Změna platí pro tento prohlížeč a nové testy. Na spolužáky se
              nepřenese.
            </p>
            <button className="primary wide">Uložit lokální změnu</button>
          </form>
        </div>
      )}
    </div>
  );
}
function Stat({
  icon,
  value,
  label,
  tone = "green",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
function ResultSummary({ result }: { result: Result }) {
  const s = stats(result.answers);
  return (
    <div className="stats-grid">
      <Stat
        icon={<Target />}
        value={fmt(s.rate)}
        label="Úspěšnost dle použitého klíče"
      />
      <Stat
        icon={<Check />}
        value={String(s.correct)}
        label="Správných odpovědí"
      />
      <Stat
        icon={<X />}
        value={String(s.incorrect)}
        label="Chybných odpovědí"
        tone="orange"
      />
      <Stat
        icon={<BookOpen />}
        value={String(result.questions.length - s.graded)}
        label="Nehodnoceno / nezodpovězeno"
      />
    </div>
  );
}
