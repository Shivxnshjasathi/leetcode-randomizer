"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shuffle, ExternalLink, Sun, Moon,
  RotateCcw, Timer, CheckCircle, Flame,
  ChevronRight, Settings, Terminal as TerminalIcon, Send,
  ChevronDown, List, ChevronUp, RefreshCcw, X,
  Search, BarChart2, Lock, Lightbulb, Tag, ThumbsUp, ThumbsDown
} from "lucide-react";
import rawData from "../assets/question_v2.json";

// ─── Rich V2 Schema (User Provided) ──────────────────────────────────────────
interface Question {
  difficulty: "Easy" | "Medium" | "Hard" | number;
  frontendQuestionId: string | number;
  paidOnly: boolean;
  title: string;
  titleSlug: string;
  url: string;
  description_url: string;
  description: string;
  solution_url: string | null;
  category: string;
  acceptance_rate: number;
  topics: string[];
  hints: string[];
  likes: number;
  dislikes: number;
  similar_questions: string;
  stats: string; // JSON string or object
}

// ── Safe helpers ──────────────────────────────────────────────────────────────
const normDiff = (d: any): "Easy" | "Medium" | "Hard" => {
  if (typeof d === "number") {
    return d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard";
  }
  const s = String(d).trim();
  if (s === "Easy" || s === "Medium" || s === "Hard") return s;
  return "Medium";
};

const diffClass = (d: string) => {
  const s = d.toLowerCase();
  return s === "easy" ? "tag-easy" : s === "medium" ? "tag-medium" : "tag-hard";
};

// ── Normalize data on import ──────────────────────────────────────────────────
const ALL_QUESTIONS: Question[] = (rawData as any[]).map(q => ({
  difficulty:          normDiff(q.difficulty),
  frontendQuestionId:  q.frontendQuestionId || q.id || "0",
  paidOnly:            q.paidOnly || q.isPaidOnly || false,
  title:               q.title || "Untitled",
  titleSlug:           q.titleSlug || q.slug || "",
  url:                 q.url || (q.slug ? `https://leetcode.com/problems/${q.slug}/` : ""),
  description_url:     q.description_url || "",
  description:         q.description || "<p>Analyze the requirements and implement your solution.</p>",
  solution_url:        q.solution_url || null,
  category:            q.category || "Algorithms",
  acceptance_rate:     q.acceptance_rate || parseFloat(q.acceptance) || 0,
  topics:              Array.isArray(q.topics) ? q.topics : [],
  hints:               Array.isArray(q.hints) ? q.hints : [],
  likes:               q.likes || 0,
  dislikes:            q.dislikes || 0,
  similar_questions:   q.similar_questions || "[]",
  stats:               typeof q.stats === "string" ? q.stats : JSON.stringify(q.stats || {}),
}));

const LANGUAGES = [
  { id: "js",  label: "JavaScript", template: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar solve = function(nums, target) {\n    // your solution here\n};" },
  { id: "py",  label: "Python3",    template: "class Solution:\n    def solve(self) -> None:\n        # your solution here\n        pass" },
  { id: "cpp", label: "C++",        template: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // your solution here\n    }\n};" },
  { id: "kt",  label: "Kotlin",     template: "class Solution {\n    fun solve() {\n        // your solution here\n    }\n}" }
];

export default function Home() {
  const [randomQuestions, setRandomQuestions] = useState<Question[]>([]);
  const [selected,        setSelected]        = useState<Question | null>(null);
  const [diffFilter,      setDiffFilter]      = useState("All");
  const [theme,           setTheme]           = useState<"dark"|"light">("dark");
  const [leftTab,         setLeftTab]         = useState<"description"|"notes">("description");
  const [consoleTab,      setConsoleTab]      = useState<"testcase"|"result"|"terminal">("testcase");
  const [lang,            setLang]            = useState(LANGUAGES[0]);
  const [code,            setCode]            = useState(LANGUAGES[0].template);
  const [rawLogs,         setRawLogs]         = useState("");
  const [isRunning,       setIsRunning]       = useState(false);
  const [consoleOpen,     setConsoleOpen]     = useState(false);
  const [listOpen,        setListOpen]        = useState(false);
  const [showHints,       setShowHints]       = useState(false);
  const [searchQ,         setSearchQ]         = useState("");
  const [solvedIds,       setSolvedIds]       = useState<string[]>([]);
  const [notes,           setNotes]           = useState<Record<string, string>>({});
  const [time,            setTime]            = useState(0);
  const [timerOn,         setTimerOn]         = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const parseStats = (q: Question) => {
    try {
      return JSON.parse(q.stats);
    } catch {
      return {};
    }
  };

  // ── init ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const t = saved || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    setSolvedIds(JSON.parse(localStorage.getItem("solved_ids") || "[]"));
    setNotes(JSON.parse(localStorage.getItem("problem_notes") || "{}"));

    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
    const pick = shuffled.slice(0, 3);
    setRandomQuestions(pick);
    setSelected(pick[0]);
  }, []);

  // ── timer ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerOn) timerRef.current = setInterval(() => setTime(p => p + 1), 1000);
    else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerOn]);

  // ── actions ───────────────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const n = theme === "dark" ? "light" : "dark";
    setTheme(n);
    localStorage.setItem("theme", n);
    document.documentElement.classList.toggle("dark", n === "dark");
  };

  const randomize = () => {
    let pool = ALL_QUESTIONS;
    if (diffFilter !== "All") pool = pool.filter(q => q.difficulty === diffFilter);
    if (!pool.length) return;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const pick = shuffled.slice(0, 3);
    setRandomQuestions(pick);
    setSelected(pick[0]);
    setTime(0); setRawLogs(""); setConsoleOpen(false); setShowHints(false);
  };

  const runCode = () => {
    setIsRunning(true); setConsoleOpen(true); setConsoleTab("result"); setRawLogs("");
    setTimeout(() => {
      const lines = code.split('\n');
      let out = "";
      lines.forEach(l => {
        const m = l.match(/(?:console\.log|print|println|cout\s*<<)\s*\(?["'](.+?)["']\)?/);
        if (m?.[1]) out += (out ? "\n" : "") + m[1];
      });
      setRawLogs(out || "Execution Success.");
      setIsRunning(false);
    }, 1200);
  };

  const toggleSolved = () => {
    if (!selected) return;
    const id = String(selected.frontendQuestionId);
    const next = solvedIds.includes(id) ? solvedIds.filter(i => i !== id) : [...solvedIds, id];
    setSolvedIds(next);
    localStorage.setItem("solved_ids", JSON.stringify(next));
  };

  const filtered = ALL_QUESTIONS.filter(q =>
    q.title.toLowerCase().includes(searchQ.toLowerCase()) ||
    String(q.frontendQuestionId).includes(searchQ)
  );

  const stats = selected ? parseStats(selected) : {};

  return (
    <div className="h-screen bg-background text-foreground font-poppins flex flex-col overflow-hidden relative">

      {/* ── Question List Modal ── */}
      {listOpen && (
        <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-md p-4 md:p-12 animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto h-full flex flex-col bg-panel border border-border rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex items-center gap-4">
              <Search size={18} className="text-secondary shrink-0" />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by title or ID…"
                className="bg-transparent outline-none text-[16px] font-bold w-full placeholder:opacity-20" />
              <button onClick={() => setListOpen(false)} className="p-2 hover:bg-card rounded-xl transition-colors shrink-0"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filtered.map(q => (
                <div key={q.frontendQuestionId}
                  onClick={() => { setSelected(q); setListOpen(false); setShowHints(false); }}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-card cursor-pointer transition-all border border-transparent hover:border-border group">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-[12px] font-black opacity-20 w-10 shrink-0">{q.frontendQuestionId}</span>
                    <span className="font-bold text-[14px] truncate group-hover:translate-x-1 transition-transform">{q.title}</span>
                    {q.paidOnly && <Lock size={12} className="text-amber-500 shrink-0"/>}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className={diffClass(String(q.difficulty))}>{String(q.difficulty).toUpperCase()}</span>
                    {solvedIds.includes(String(q.frontendQuestionId)) && <CheckCircle size={14} className="text-green-500"/>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <header className="h-12 border-b border-border bg-panel flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-10">
          <div className="text-[17px] font-bold tracking-tighter cursor-pointer" onClick={randomize}>
            randomizer<span className="opacity-30">.</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
            <span onClick={() => setListOpen(true)} className="hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors">
              <List size={14}/> Questions
            </span>
            <span className="flex items-center gap-2">
              <Flame size={14} fill="currentColor" className="text-orange-500"/> {solvedIds.length} Solved
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary">
            <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground">
              <option>All</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <button onClick={randomize} className="text-foreground"><Shuffle size={14} /></button>
          </div>
          <button onClick={toggleTheme} className="opacity-40 hover:opacity-100 transition-soft text-secondary">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 gap-2">

        {/* ── Left: Description Panel ── */}
        <div className="w-full lg:w-[480px] flex flex-col bg-panel rounded-2xl border border-border overflow-hidden shrink-0">
          <div className="h-10 flex border-b border-border px-4 items-center bg-card/20 shrink-0">
            {["description", "notes"].map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab as any)}
                className={`px-4 h-full text-[10px] font-black uppercase tracking-widest transition-all ${leftTab === tab ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {leftTab === "description" && selected ? (
              <div className="space-y-8">

                {/* Title + Badges */}
                <div className="space-y-4">
                  <h1 className="text-[22px] font-bold tracking-tight leading-snug">
                    {selected.frontendQuestionId}. {selected.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={diffClass(String(selected.difficulty))}>{String(selected.difficulty).toUpperCase()}</span>
                    {selected.paidOnly && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        <Lock size={10}/> Premium
                      </span>
                    )}
                    <span className="flex items-center gap-1 tag-id"><BarChart2 size={12}/> {selected.acceptance_rate.toFixed(1)}%</span>
                    <button onClick={toggleSolved}
                      className={`text-[10px] font-bold px-3 py-1 rounded-md border border-border transition-colors ${solvedIds.includes(String(selected.frontendQuestionId)) ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'text-secondary hover:text-foreground'}`}>
                      <CheckCircle size={12} className="inline mr-1"/>
                      {solvedIds.includes(String(selected.frontendQuestionId)) ? 'Solved' : 'Mark Solved'}
                    </button>
                  </div>
                </div>

                {/* Stats Row */}
                {stats.totalAccepted && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Accepted",    val: stats.totalAccepted },
                      { label: "Submissions", val: stats.totalSubmission },
                      { label: "Acc. Rate",   val: stats.acRate },
                    ].map(s => (
                      <div key={s.label} className="bg-card/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">{s.label}</div>
                        <div className="font-mono font-bold text-[13px]">{s.val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* HTML Description */}
                <div className="text-[14px] leading-[1.75] description-html prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selected.description }} />

                {/* Topics */}
                {selected.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selected.topics.map(t => (
                      <span key={t} className="flex items-center gap-1 text-[10px] font-bold bg-card border border-border px-2 py-1 rounded-md text-secondary uppercase tracking-wider">
                        <Tag size={10}/> {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Likes / Dislikes */}
                <div className="flex items-center gap-6 py-4 border-y border-border/40">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-secondary">
                    <ThumbsUp size={15} className="text-green-500/60"/> {selected.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-2 text-[13px] font-bold text-secondary">
                    <ThumbsDown size={15} className="text-red-500/60"/> {selected.dislikes.toLocaleString()}
                  </span>
                </div>

                {/* Hints */}
                {selected.hints.length > 0 && (
                  <div className="space-y-3">
                    <button onClick={() => setShowHints(!showHints)}
                      className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity">
                      <Lightbulb size={15} className="text-amber-400"/>
                      {showHints ? "Hide Hints" : `Show Hints (${selected.hints.length})`}
                    </button>
                    {showHints && (
                      <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {selected.hints.map((h,i) => (
                          <div key={i} className="bg-card/50 border border-border rounded-xl p-4 text-[13px] leading-relaxed opacity-75 italic">
                            <span className="font-black not-italic text-foreground/40 mr-2">#{i+1}</span>{h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Links */}
                <div className="pt-4 border-t border-border space-y-3">
                  <a href={selected.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] font-bold hover:underline opacity-70 hover:opacity-100 transition-opacity">
                    <ExternalLink size={13}/> Open on LeetCode
                  </a>
                  {selected.solution_url && (
                    <a href={selected.solution_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[12px] font-bold hover:underline opacity-70 hover:opacity-100 transition-opacity">
                      <ExternalLink size={13}/> Community Solutions
                    </a>
                  )}
                </div>

                {/* Recommended Next */}
                <div className="pt-8 border-t border-border">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20 mb-6">Recommended next</p>
                  <div className="flex flex-col gap-5">
                    {randomQuestions.filter(q => String(q.frontendQuestionId) !== String(selected.frontendQuestionId)).map(q => (
                      <div key={q.frontendQuestionId}
                        onClick={() => { setSelected(q); setShowHints(false); }}
                        className="group flex items-center justify-between cursor-pointer border-l-2 border-transparent hover:border-foreground pl-4 transition-all">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold opacity-40 group-hover:opacity-100 transition-opacity truncate">{q.title}</p>
                          <p className="text-[10px] opacity-20">{String(q.difficulty).toUpperCase()} · {q.acceptance_rate.toFixed(1)}%</p>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-all shrink-0"/>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : leftTab === "notes" && selected ? (
              <textarea
                value={notes[String(selected.frontendQuestionId)] || ""}
                onChange={e => {
                  const n = { ...notes, [String(selected.frontendQuestionId)]: e.target.value };
                  setNotes(n); localStorage.setItem("problem_notes", JSON.stringify(n));
                }}
                placeholder="Your notes…"
                className="w-full h-full bg-transparent border-none text-[14px] font-mono leading-relaxed outline-none resize-none opacity-60 focus:opacity-100 transition-opacity"
              />
            ) : null}
          </div>
        </div>

        {/* ── Right: IDE ── */}
        <div className="flex-1 flex flex-col bg-panel rounded-2xl border border-border overflow-hidden relative">

          {/* Editor Header */}
          <div className="h-10 bg-card/20 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-8">
              <select value={lang.id}
                onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value)!; setLang(l); setCode(l.template); }}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-secondary hover:text-foreground">
                {LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}
              </select>
              <div onClick={() => setTimerOn(!timerOn)}
                className={`flex items-center gap-2 text-[11px] font-mono font-bold cursor-pointer select-none ${timerOn ? 'text-foreground' : 'opacity-20'}`}>
                <Timer size={14}/> {fmt(time)}
              </div>
            </div>
            <div className="flex items-center gap-4 text-secondary">
              <button onClick={() => setCode(lang.template)} className="hover:text-foreground transition-colors"><RotateCcw size={14}/></button>
              <button className="hover:text-foreground"><Settings size={16}/></button>
            </div>
          </div>

          {/* Code Area */}
          <div className="flex-1 flex overflow-hidden">
            <div className="w-12 bg-card/10 border-r border-border flex flex-col items-center py-6 font-mono text-[11px] opacity-10 select-none">
              {[...Array(50)].map((_,i) => <span key={i} className="leading-6">{i+1}</span>)}
            </div>
            <textarea value={code} onChange={e => setCode(e.target.value)}
              className="flex-1 bg-transparent text-foreground font-mono text-[14px] p-6 outline-none resize-none leading-6"
              spellCheck={false}/>
          </div>

          {/* Console */}
          <div className={`transition-all duration-300 border-t border-border bg-panel overflow-hidden shrink-0 ${consoleOpen ? 'h-[280px]' : 'h-0'}`}>
            <div className="h-10 bg-card/20 border-b border-border flex px-4 gap-4 items-center">
              {(["testcase", "result", "terminal"] as const).map(t => (
                <button key={t} onClick={() => setConsoleTab(t)}
                  className={`h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === t ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>
                  {t}
                </button>
              ))}
              <button onClick={() => setConsoleOpen(false)} className="ml-auto text-secondary hover:text-foreground"><ChevronDown size={14}/></button>
            </div>
            <div className="p-6 h-[calc(100%-40px)] overflow-y-auto custom-scrollbar">
              {consoleTab === "testcase" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-widest"><TerminalIcon size={14}/> Input</div>
                  <div className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] opacity-60">data = mock_set_01</div>
                </div>
              )}
              {consoleTab === "result" && (
                isRunning
                  ? <div className="flex items-center justify-center h-20"><RefreshCcw size={20} className="animate-spin opacity-20"/></div>
                  : <div className="space-y-4">
                      <div className={`text-[18px] font-bold ${rawLogs ? 'text-green-500' : 'text-amber-500'}`}>
                        {rawLogs ? 'Accepted' : 'Pending'}
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 bg-card/50 p-4 rounded-xl border border-border">
                          <div className="text-[10px] font-black opacity-20 uppercase tracking-widest mb-1">Runtime</div>
                          <div className="font-mono text-[13px] opacity-60">{rawLogs ? '0 ms' : '--'}</div>
                        </div>
                        <div className="flex-1 bg-card/50 p-4 rounded-xl border border-border">
                          <div className="text-[10px] font-black opacity-20 uppercase tracking-widest mb-1">Memory</div>
                          <div className="font-mono text-[13px] opacity-60">{rawLogs ? '~40 MB' : '--'}</div>
                        </div>
                      </div>
                    </div>
              )}
              {consoleTab === "terminal" && (
                <div className="h-full bg-black/40 rounded-xl p-5 border border-white/5 font-mono text-[12px] text-green-500/80 overflow-y-auto">
                  <div className="opacity-30 mb-3">$ system.exec /stdout</div>
                  <pre className="whitespace-pre-wrap">{rawLogs || "No output."}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="h-12 bg-panel border-t border-border flex items-center justify-between px-4 shrink-0">
            <button onClick={() => setConsoleOpen(!consoleOpen)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-secondary hover:text-foreground px-4 py-1.5 transition-colors">
              Console {consoleOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
            </button>
            <div className="flex items-center gap-3 pr-2">
              <button onClick={runCode} disabled={isRunning}
                className="px-5 py-2 rounded-lg border border-border hover:bg-card transition-all text-[10px] font-black uppercase tracking-widest text-secondary hover:text-foreground">
                {isRunning ? 'Running…' : 'Run'}
              </button>
              <button className="px-5 py-2 rounded-lg bg-foreground text-background font-black text-[10px] uppercase tracking-widest hover:opacity-90 flex items-center gap-2 active:scale-95 transition-all">
                Submit <Send size={14}/>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
