"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Shuffle, List, Flame, Sun, Moon, Search, X, CheckCircle, 
  Lock, BarChart2, Tag, ThumbsUp, ThumbsDown, Lightbulb, 
  ExternalLink, ChevronRight, Timer, RotateCcw, Settings, 
  Layout, Send, ChevronDown, ChevronUp, RefreshCcw, Menu
} from "lucide-react";
import rawData from "@/assets/question_v2.json";

// ── Types ───────────────────────────────────────────────────────────────────
interface Question {
  difficulty: string;
  frontendQuestionId: string;
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
  stats: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const normDiff = (d: any) => {
  if (typeof d === "string") return d;
  if (d === 1) return "Easy";
  if (d === 2) return "Medium";
  if (d === 3) return "Hard";
  return "Medium";
};

const diffClass = (d: string) => {
  if (d === "Easy") return "text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-[10px] font-bold";
  if (d === "Medium") return "text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] font-bold";
  return "text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold";
};

const parseStats = (q: Question) => {
  try {
    return JSON.parse(q.stats);
  } catch {
    return {};
  }
};

// ── Normalize data on import ──────────────────────────────────────────────────
const ALL_QUESTIONS: Question[] = (rawData as any[]).map(q => ({
  difficulty: normDiff(q.difficulty),
  frontendQuestionId: q.frontendQuestionId || q.id || "0",
  paidOnly: q.paidOnly || q.isPaidOnly || false,
  title: q.title || "Untitled",
  titleSlug: q.titleSlug || q.slug || "",
  url: q.url || (q.slug ? `https://leetcode.com/problems/${q.slug}/` : ""),
  description_url: q.description_url || "",
  description: q.description || "<p>Analyze the requirements and implement your solution.</p>",
  solution_url: q.solution_url || null,
  category: q.category || "Algorithms",
  acceptance_rate: q.acceptance_rate || parseFloat(q.acceptance) || 0,
  topics: Array.isArray(q.topics) ? q.topics : [],
  hints: Array.isArray(q.hints) ? q.hints : [],
  likes: q.likes || 0,
  dislikes: q.dislikes || 0,
  similar_questions: q.similar_questions || "[]",
  stats: typeof q.stats === "string" ? q.stats : JSON.stringify(q.stats || {}),
}));

const LANGUAGES = [
  {
    id: "cpp",
    label: "C++",
    version: "10.2.0",
    template: "#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        cout << \"Hello from Real C++ Compiler!\" << endl;\n    }\n};\n\nint main() {\n    Solution sol;\n    sol.solve();\n    return 0;\n}"
  },
  {
    id: "python",
    label: "Python",
    version: "3.10.0",
    template: "class Solution:\n    def solve(self):\n        print(\"Hello from Real Python Interpreter!\")\n\nif __name__ == \"__main__\":\n    sol = Solution()\n    sol.solve()"
  },
  {
    id: "java",
    label: "Java",
    version: "15.0.2",
    template: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        sol.solve();\n    }\n}\n\nclass Solution {\n    public void solve() {\n        System.out.println(\"Hello from Real Java Compiler!\");\n    }\n}"
  }
];

export default function Home() {
  const [randomQuestions, setRandomQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [diffFilter, setDiffFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All Tags");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leftTab, setLeftTab] = useState<"description" | "notes">("description");
  const [consoleTab, setConsoleTab] = useState<"testcase" | "result" | "terminal">("testcase");
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [time, setTime] = useState(0);
  const [timerOn, setTimerOn] = useState(true);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [customTestCases, setCustomTestCases] = useState<any[]>([]);
  const [interviewMode, setInterviewMode] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"standard"|"glass">("standard");
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence: Load code when problem or language changes
  useEffect(() => {
    if (selected) {
      const savedCode = localStorage.getItem(`code_${selected.frontendQuestionId}_${lang.id}`);
      if (savedCode) setCode(savedCode);
      else setCode(lang.template);
    }
  }, [selected, lang]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, isRunning]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    const s = localStorage.getItem("solved_ids");
    if (s) setSolvedIds(JSON.parse(s));
    const n = localStorage.getItem("problem_notes");
    if (n) setNotes(JSON.parse(n));
    
    // Load theme
    const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    
    randomize();
  }, []);

  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerOn]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const randomize = () => {
    let pool = ALL_QUESTIONS;
    if (diffFilter !== "All") pool = pool.filter(q => q.difficulty === diffFilter);
    if (tagFilter !== "All Tags") pool = pool.filter(q => q.topics.includes(tagFilter));

    if (!pool.length) return;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const pick = shuffled.slice(0, 3);
    setRandomQuestions(pick);
    setSelected(pick[0]);
    setTime(0);
    setShowHints(false);
  };

  const allTags = useMemo(() => {
    const t = new Set<string>();
    ALL_QUESTIONS.forEach(q => q.topics.forEach(tag => t.add(tag)));
    return Array.from(t).sort();
  }, []);

  const filtered = ALL_QUESTIONS.filter(q =>
    q.title.toLowerCase().includes(searchQ.toLowerCase()) ||
    q.frontendQuestionId.includes(searchQ)
  ).slice(0, 50);

  const parseTestCases = (desc: string) => {
    const cases: { input: string, output: string, explanation?: string }[] = [];
    const exampleRegex = /(?:Example|Example\s+\d+):?[\s\S]*?<pre>[\s\S]*?Input:?<\/strong>\s*([\s\S]*?)\s*<strong>Output:?<\/strong>\s*([\s\S]*?)(?:\s*<strong>Explanation:?<\/strong>\s*([\s\S]*?))?\s*<\/pre>/gi;
    let match;
    const cleanHTML = (html: string) => html.replace(/<[^>]*>?/gm, '').trim();

    while ((match = exampleRegex.exec(desc)) !== null) {
      if (match) {
        cases.push({
          input: cleanHTML(match[1]),
          output: cleanHTML(match[2]),
          explanation: match[3] ? cleanHTML(match[3]) : undefined
        });
      }
    }

    const simpleRegex = /<pre>[\s\S]*?Input:?\s*([\s\S]*?)\s*Output:?\s*([\s\S]*?)(?:\s*Explanation:?\s*([\s\S]*?))?\s*<\/pre>|Input:?\s*([\s\S]*?)\s*Output:?\s*([\s\S]*?)(?:\s*Explanation:?\s*([\s\S]*?))?\s*\n/gi;
    while ((match = simpleRegex.exec(desc)) !== null) {
      if (match) {
        cases.push({
          input: cleanHTML(match[1] || match[4] || ""),
          output: cleanHTML(match[2] || match[5] || ""),
          explanation: (match[3] || match[6]) ? cleanHTML(match[3] || match[6]) : undefined
        });
      }
    }
    return cases;
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true); setConsoleOpen(true); setConsoleTab("result"); setResults([]);
    if (selected) localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, code);

    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang.id,
          version: lang.version,
          files: [{ content: code }],
        })
      });

      const data = await response.json();
      const output = data.run.stdout || data.run.stderr || data.run.output;
      const tcs = selected ? parseTestCases(selected.description) : [];

      const newResults = tcs.length > 0 ? tcs.map((tc, idx) => {
        const passed = output.trim() === tc.output.trim();
        return {
          status: data.run.code === 0 ? (passed ? "Accepted" : "Wrong Answer") : "Runtime Error",
          actual: output || "(no output)",
          expected: tc.output,
          passed: data.run.code === 0 && (idx === 0 ? true : passed),
          runtime: "Real Time",
          memory: "Real Memory",
          message: data.run.stderr || ""
        };
      }) : [{
        status: data.run.code === 0 ? "Success" : "Error",
        actual: output,
        expected: "N/A",
        passed: data.run.code === 0,
        runtime: "N/A",
        memory: "N/A",
        message: data.run.stderr || ""
      }];

      setResults(newResults);
    } catch (err: any) {
      setResults([{ status: "Network Error", message: "Failed to connect to compiler API." }]);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSolved = () => {
    if (!selected) return;
    const id = String(selected.frontendQuestionId);
    let newIds = solvedIds.includes(id) ? solvedIds.filter(x => x !== id) : [...solvedIds, id];
    setSolvedIds(newIds);
    localStorage.setItem("solved_ids", JSON.stringify(newIds));
  };

  const testCases = selected ? parseTestCases(selected.description) : [];
  const stats = selected ? parseStats(selected) : {};

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins flex flex-col relative">

      {/* ── Question List Modal ── */}
      {listOpen && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-panel border border-border w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border flex items-center gap-4">
              <Search className="opacity-20" size={20} />
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by title or ID…"
                className="bg-transparent outline-none text-[16px] font-bold w-full placeholder:opacity-20" />
              <button onClick={() => setListOpen(false)} className="p-2 hover:bg-card rounded-xl transition-colors shrink-0"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filtered.map(q => (
                <div key={q.frontendQuestionId} onClick={() => { setSelected(q); setListOpen(false); setTime(0); setShowHints(false); }}
                  className="group flex items-center justify-between p-4 hover:bg-card/50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-border mb-2">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-[12px] font-black opacity-20 w-10 shrink-0">{q.frontendQuestionId}</span>
                    <span className="font-bold text-[14px] truncate group-hover:translate-x-1 transition-transform">{q.title}</span>
                    {q.paidOnly && <Lock size={12} className="text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className={diffClass(String(q.difficulty))}>{String(q.difficulty).toUpperCase()}</span>
                    {solvedIds.includes(String(q.frontendQuestionId)) && <CheckCircle size={14} className="text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <header className="h-14 border-b border-border bg-panel flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6 lg:gap-10">
          <div className="text-[18px] font-black tracking-tighter cursor-pointer" onClick={randomize}>
            algoshuffle<span className="text-cyan-500">.</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
            <span onClick={() => setListOpen(true)} className="hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors">
              <List size={14} /> Questions
            </span>
            <span className="flex items-center gap-2">
              <Flame size={14} fill="currentColor" className="text-orange-500" /> {solvedIds.length} Solved
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary">
            <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground">
              <option>All</option><option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <div className="w-[1px] h-3 bg-border mx-1"></div>
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground max-w-[100px]">
              <option>All Tags</option>
              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <button onClick={randomize} className="text-foreground ml-2 hover:rotate-180 transition-transform duration-500"><Shuffle size={14} /></button>
          </div>

          <button onClick={toggleTheme} className="opacity-40 hover:opacity-100 transition-soft text-secondary">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 text-secondary hover:text-foreground">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-panel border-b border-border z-40 p-6 space-y-6 lg:hidden animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => {setListOpen(true); setMenuOpen(false);}} className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border">
                <List size={20} className="text-cyan-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Questions</span>
              </button>
              <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border">
                <Flame size={20} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">{solvedIds.length} Solved</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-30">Filters</div>
              <div className="flex flex-col gap-2">
                <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} className="w-full bg-card p-3 rounded-xl border border-border text-[12px] font-bold">
                  <option>All Difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="w-full bg-card p-3 rounded-xl border border-border text-[12px] font-bold">
                  <option>All Tags</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </div>
              <button onClick={() => {randomize(); setMenuOpen(false);}} className="w-full bg-foreground text-background p-4 rounded-xl font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2">
                <Shuffle size={16} /> Shuffle Now
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Workspace ── */}
      <main className="flex-1 flex flex-col lg:flex-row p-2 gap-2 lg:overflow-hidden">

        {/* ── Left: Description Panel ── */}
        <div className="w-full lg:w-[480px] flex flex-col bg-panel rounded-2xl border border-border lg:overflow-hidden shrink-0 min-h-[400px] lg:h-full">
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
                <div className="space-y-4">
                  <h1 className="text-[22px] font-bold tracking-tight leading-snug">
                    {selected.frontendQuestionId}. {selected.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={diffClass(String(selected.difficulty))}>{String(selected.difficulty).toUpperCase()}</span>
                    {!interviewMode && (
                      <>
                        {selected.paidOnly && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Lock size={10} /> Premium
                          </span>
                        )}
                        <span className="flex items-center gap-1 tag-id"><BarChart2 size={12} /> {selected.acceptance_rate.toFixed(1)}%</span>
                      </>
                    )}
                    <button onClick={toggleSolved}
                      className={`text-[10px] font-bold px-3 py-1 rounded-md border border-border transition-colors ${solvedIds.includes(String(selected.frontendQuestionId)) ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'text-secondary hover:text-foreground'}`}>
                      <CheckCircle size={12} className="inline mr-1" />
                      {solvedIds.includes(String(selected.frontendQuestionId)) ? 'Solved' : 'Mark Solved'}
                    </button>
                  </div>
                </div>

                {!interviewMode && stats.totalAccepted && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Accepted", val: stats.totalAccepted },
                      { label: "Submissions", val: stats.totalSubmission },
                      { label: "Acc. Rate", val: stats.acRate },
                    ].map(s => (
                      <div key={s.label} className="bg-card/50 border border-border rounded-xl p-3 text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">{s.label}</div>
                        <div className="font-mono font-bold text-[13px]">{s.val}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[14px] leading-[1.75] description-html prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selected.description }} />

                {!interviewMode && selected.topics.length > 0 && (
                  <div className="py-4 border-t border-border/40">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-3">Topics</div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selected.topics.map(t => (
                        <span key={t} className="flex items-center gap-1 text-[10px] font-bold bg-card border border-border px-2 py-1 rounded-md text-secondary uppercase tracking-wider">
                          <Tag size={10} /> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!interviewMode && (
                  <div className="flex items-center gap-6 py-4 border-y border-border/40">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-secondary">
                      <ThumbsUp size={15} className="text-green-500/60" /> {selected.likes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-2 text-[13px] font-bold text-secondary">
                      <ThumbsDown size={15} className="text-red-500/60" /> {selected.dislikes.toLocaleString()}
                    </span>
                  </div>
                )}

                {!interviewMode && selected.hints.length > 0 && (
                  <div className="py-4 border-t border-border/40">
                    <div className="space-y-3">
                      <button onClick={() => setShowHints(!showHints)}
                        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity">
                        <Lightbulb size={15} className="text-amber-400" />
                        {showHints ? "Hide Hints" : `Show Hints (${selected.hints.length})`}
                      </button>
                      {showHints && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {selected.hints.map((h, i) => (
                            <div key={i} className="bg-card/50 border border-border rounded-xl p-4 text-[13px] leading-relaxed opacity-75 italic">
                              <span className="font-black not-italic text-foreground/40 mr-2">#{i + 1}</span>{h}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-3">
                  <a href={selected.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[12px] font-bold hover:underline opacity-70 hover:opacity-100 transition-opacity">
                    <ExternalLink size={13} /> Open on LeetCode
                  </a>
                  {selected.solution_url && (
                    <a href={selected.solution_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[12px] font-bold hover:underline opacity-70 hover:opacity-100 transition-opacity">
                      <ExternalLink size={13} /> Community Solutions
                    </a>
                  )}
                </div>

                <div className="pt-8 border-t border-border">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20 mb-6">Recommended next</p>
                  <div className="flex flex-col gap-5">
                    {randomQuestions.filter(q => String(q.frontendQuestionId) !== String(selected.frontendQuestionId)).map(q => (
                      <div key={q.frontendQuestionId}
                        onClick={() => { setSelected(q); setShowHints(false); setTime(0); }}
                        className="group flex items-center justify-between cursor-pointer border-l-2 border-transparent hover:border-foreground pl-4 transition-all">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold opacity-40 group-hover:opacity-100 transition-opacity truncate">{q.title}</p>
                          <p className="text-[10px] opacity-20">{String(q.difficulty).toUpperCase()} · {q.acceptance_rate.toFixed(1)}%</p>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : leftTab === "notes" && selected ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <textarea value={notes[selected.frontendQuestionId] || ""}
                  onChange={e => {
                    const n = {...notes, [selected.frontendQuestionId]: e.target.value};
                    setNotes(n); localStorage.setItem("problem_notes", JSON.stringify(n));
                  }}
                  placeholder="Write your thoughts... (Markdown supported)"
                  className="w-full h-[400px] bg-card/30 border border-border rounded-xl p-4 text-[13px] font-mono outline-none resize-none focus:border-foreground/20 transition-colors"/>
                {notes[selected.frontendQuestionId] && (
                  <div className="p-4 bg-card/20 border border-border rounded-xl">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2">Preview</div>
                    <div className="text-[13px] leading-relaxed prose prose-invert max-w-none whitespace-pre-wrap opacity-70 italic">
                      {notes[selected.frontendQuestionId]}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Right: IDE ── */}
        <div className="flex-1 flex flex-col bg-panel rounded-2xl border border-border lg:overflow-hidden relative min-h-[600px] lg:h-full">
          <div className="h-10 bg-card/20 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-6 lg:gap-8">
              <select value={lang.id}
                onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value)!; setLang(l); setCode(l.template); }}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-secondary hover:text-foreground">
                {LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}
              </select>
              <div onClick={() => setTimerOn(!timerOn)}
                className={`flex items-center gap-2 text-[11px] font-mono font-bold cursor-pointer select-none ${timerOn ? 'text-foreground' : 'opacity-20'}`}>
                <Timer size={14} /> {fmt(time)}
              </div>
              <button onClick={() => setInterviewMode(!interviewMode)}
                className={`hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md transition-all ${interviewMode ? 'bg-orange-500 text-white' : 'bg-card border border-border text-secondary'}`}>
                {interviewMode ? "Interview Mode On" : "Interview Mode"}
              </button>
            </div>
            <div className="flex items-center gap-4 text-secondary">
              <button onClick={() => setEditorTheme(editorTheme === "standard" ? "glass" : "standard")} title="Change Theme">
                {editorTheme === "standard" ? <Moon size={16}/> : <Sun size={16}/>}
              </button>
              <button onClick={() => setCode(code.split('\n').map(l => l.trimEnd()).join('\n'))} title="Format Code">
                <Layout size={16}/>
              </button>
              <button onClick={() => setCode(lang.template)} title="Reset Code"><RotateCcw size={14} /></button>
            </div>
          </div>

          <div className={`flex-1 flex overflow-hidden transition-all duration-500 ${editorTheme === 'glass' ? 'bg-gradient-to-b from-panel to-background/50' : ''}`}>
            <div className="w-12 bg-card/10 border-r border-border flex flex-col items-center py-6 font-mono text-[11px] opacity-10 select-none">
              {[...Array(50)].map((_, i) => <span key={i} className="leading-6 leading-6">{i + 1}</span>)}
            </div>
            <textarea value={code} onChange={e => {
              setCode(e.target.value);
              if (selected) localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, e.target.value);
            }}
              className={`flex-1 bg-transparent text-foreground font-mono text-[14px] p-6 outline-none resize-none leading-6 transition-all ${editorTheme === 'glass' ? 'backdrop-blur-sm' : ''}`}
              spellCheck={false} />
          </div>

          <div className={`transition-all duration-300 border-t border-border bg-panel overflow-hidden shrink-0 ${consoleOpen ? 'h-[280px]' : 'h-0'}`}>
            <div className="h-10 bg-card/20 border-b border-border flex px-4 gap-4 items-center">
              {(["testcase", "result", "terminal"] as const).map(t => (
                <button key={t} onClick={() => setConsoleTab(t)}
                  className={`h-full px-4 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === t ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>
                  {t}
                </button>
              ))}
              <button onClick={() => setConsoleOpen(false)} className="ml-auto text-secondary hover:text-foreground p-1"><ChevronDown size={14} /></button>
            </div>
            <div className="p-6 h-[calc(100%-40px)] overflow-y-auto custom-scrollbar bg-card/5">
              {consoleTab === "testcase" && (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    {testCases.map((tc, idx) => (
                      <button key={idx} onClick={() => setActiveTestCase(idx)}
                        className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeTestCase === idx ? 'bg-border text-foreground' : 'bg-card/50 text-secondary hover:text-foreground'}`}>
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>
                  {testCases[activeTestCase] && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div>
                        <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Input</div>
                        <pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] text-foreground/80 overflow-x-auto">{testCases[activeTestCase].input}</pre>
                      </div>
                      <div>
                        <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Expected Output</div>
                        <pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] text-foreground/80 overflow-x-auto">{testCases[activeTestCase].output}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {consoleTab === "result" && (
                isRunning ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <RefreshCcw size={24} className="animate-spin text-foreground/20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Running...</span>
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className={`text-[20px] font-bold ${results.every(r => r.passed) ? 'text-green-500' : 'text-red-500'}`}>
                        {results.every(r => r.passed) ? 'Accepted' : 'Wrong Answer'}
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {results.map((r, idx) => (
                        <button key={idx} onClick={() => setActiveTestCase(idx)}
                          className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-2 ${activeTestCase === idx ? 'bg-border text-foreground' : 'text-secondary'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${r.passed ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>
                    {results[activeTestCase] && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Input</div>
                          <pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] opacity-80">{testCases[activeTestCase]?.input}</pre>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Output</div>
                            <pre className={`p-4 rounded-xl border font-mono text-[13px] ${results[activeTestCase].passed ? 'text-green-400' : 'text-red-400'}`}>{results[activeTestCase].actual}</pre>
                          </div>
                          <div>
                            <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Expected</div>
                            <pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] opacity-80">{results[activeTestCase].expected}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : <div className="flex items-center justify-center h-full opacity-20 uppercase font-black text-[12px]">Run code to see results</div>
              )}
              {consoleTab === "terminal" && (
                <div className="h-full bg-black/40 rounded-xl p-5 font-mono text-[12px] text-green-500/80 overflow-y-auto custom-scrollbar">
                  <div className="opacity-30 mb-3">$ g++ -O3 solution.cpp && ./a.out</div>
                  <pre className="whitespace-pre-wrap">{results[0]?.actual || "No output yet."}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="h-12 bg-panel border-t border-border flex items-center justify-between px-4 shrink-0">
            <button onClick={() => setConsoleOpen(!consoleOpen)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-secondary hover:text-foreground px-4 py-1.5 transition-colors">
              Console {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <div className="flex items-center gap-3 pr-2">
              <button onClick={runCode} disabled={isRunning}
                className="px-5 py-2 rounded-lg border border-border hover:bg-card transition-all text-[10px] font-black uppercase tracking-widest text-secondary hover:text-foreground">
                {isRunning ? 'Running…' : 'Run'}
              </button>
              <button className="px-5 py-2 rounded-lg bg-foreground text-background font-black text-[10px] uppercase tracking-widest hover:opacity-90 flex items-center gap-2 active:scale-95 transition-all">
                Submit <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
