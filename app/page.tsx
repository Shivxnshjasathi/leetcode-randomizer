"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Shuffle, List, Flame, Sun, Moon, Search, X, CheckCircle, Home as HomeIcon,
  Lock, BarChart2, Tag, ThumbsUp, ThumbsDown, Lightbulb,
  ExternalLink, ChevronRight, Timer, RotateCcw, Settings,
  Layout, Send, ChevronDown, ChevronUp, RefreshCcw, Menu,
  Code2, User as UserIcon, LogOut, Users, Plus, Link, LayoutGrid,
  Maximize2, Minimize2, Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

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

interface LightweightQuestion {
  frontendQuestionId: string;
  title: string;
  difficulty: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const diffClass = (d: string) => {
  if (d === "Easy") return "text-green-500 bg-green-500/10 px-2 py-0.5 rounded-none text-[10px] font-bold";
  if (d === "Medium") return "text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-none text-[10px] font-bold";
  return "text-red-500 bg-red-500/10 px-2 py-0.5 rounded-none text-[10px] font-bold";
};

const parseStats = (q: Question) => {
  try {
    return JSON.parse(q.stats);
  } catch {
    return {};
  }
};

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
  const [masterList, setMasterList] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Question | null>(null);
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'desc'>('split');
  const [mobileTab, setMobileTab] = useState<'desc' | 'editor' | 'filters'>('desc');
  const [diffFilter, setDiffFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All Tags");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leftTab, setLeftTab] = useState<"description" | "notes" | "editor" | "questions" | "filters">("description");
  const [consoleTab, setConsoleTab] = useState<"testcase" | "result" | "terminal">("testcase");
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [results, setResults] = useState<any[]>([]);
  const [complexity, setComplexity] = useState("O(1)");
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [searchQ, setSearchQ] = useState("");
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean, mode: 'login' | 'signup' }>({ open: false, mode: 'login' });
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [time, setTime] = useState(0);
  const [timerOn, setTimerOn] = useState(true);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [zenMode, setZenMode] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load Data Locally ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/data/question_v2.json');
        const data = await res.json();
        setMasterList(data);
        // Initial random selection
        const randomQ = data[Math.floor(Math.random() * data.length)];
        setSelected(randomQ);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    
    fetchData();

    const s = localStorage.getItem("solved_ids");
    if (s) setSolvedIds(JSON.parse(s));
    const n = localStorage.getItem("problem_notes");
    if (n) setNotes(JSON.parse(n));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) syncFromSupabase(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) syncFromSupabase(session.user.id);
    });

    const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (selected) {
      const savedCode = localStorage.getItem(`code_${selected.frontendQuestionId}_${lang.id}`);
      if (savedCode) setCode(savedCode);
      else setCode(lang.template);
    }
  }, [selected, lang]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    if (error) setAuthError(error.message);
    else setAuthModal({ ...authModal, open: false });
    setAuthLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError("");
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPass });
    if (error) setAuthError(error.message);
    else setAuthError("Success! Check your email for a confirmation link.");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const syncFromSupabase = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      if (data.solved_ids) setSolvedIds(data.solved_ids);
      if (data.notes) setNotes(data.notes);
    }
  };

  const randomize = (overrideTag?: string) => {
    if (masterList.length === 0) return;
    
    const tagToUse = overrideTag || tagFilter;
    let filtered = masterList;
    
    if (diffFilter !== "All") {
      filtered = filtered.filter(q => q.difficulty === diffFilter);
    }
    
    if (tagToUse !== "All Tags") {
      filtered = filtered.filter(q => 
        (q.topics?.includes(tagToUse)) || 
        (q.category === tagToUse)
      );
    }
    
    if (filtered.length === 0) return;
    
    const randomQ = filtered[Math.floor(Math.random() * filtered.length)];
    setSelected(randomQ);
    setTime(0);
    setShowHints(false);
  };

  const parseTestCases = (desc: string) => {
    const cases: { input: string, output: string }[] = [];
    const exampleRegex = /Example\s+\d+:[\s\S]*?<pre>[\s\S]*?Input:?\s*([\s\S]*?)\s*Output:?\s*([\s\S]*?)(?:\s*Explanation:?[\s\S]*?)?<\/pre>/gi;
    let match;
    const cleanHTML = (html: string) => html.replace(/<[^>]*>?/gm, '').trim();
    while ((match = exampleRegex.exec(desc)) !== null) {
      cases.push({ input: cleanHTML(match[1]), output: cleanHTML(match[2]) });
    }
    return cases;
  };

  const runCode = async () => {
    if (isRunning || !selected) return;
    setIsRunning(true); setConsoleOpen(true); setConsoleTab("result"); setResults([]);
    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang.id, version: lang.version, files: [{ content: code }] })
      });
      const data = await response.json();
      
      if (!data.run) {
        setResults([{ status: "Error", actual: data.message || "Failed to execute code on the server. Please try a different language or check your syntax." }]);
        return;
      }

      const output = data.run.stdout || data.run.stderr || data.run.output || "";
      const tcs = parseTestCases(selected.description);
      const newResults = tcs.length > 0 ? tcs.map((tc, idx) => {
        const passed = output.trim().includes(tc.output.trim());
        return { status: data.run.code === 0 && passed ? "Accepted" : "Wrong Answer", actual: output, expected: tc.output, passed: data.run.code === 0 && passed };
      }) : [{ status: data.run.code === 0 ? "Success" : "Error", actual: output, passed: data.run.code === 0 }];
      setResults(newResults);
    } catch (err) {
      console.error("Compiler error:", err);
      setResults([{ status: "Network Error", actual: "Failed to connect to the compilation server. Please check your internet connection or try again later." }]);
    } finally { setIsRunning(false); }
  };

  const toggleSolved = async () => {
    if (!selected) return;
    const id = String(selected.frontendQuestionId);
    let newIds = solvedIds.includes(id) ? solvedIds.filter(x => x !== id) : [...solvedIds, id];
    setSolvedIds(newIds);
    localStorage.setItem("solved_ids", JSON.stringify(newIds));
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, solved_ids: newIds, notes: notes, updated_at: new Date() });
    }
  };

  const getAIHint = async () => {
    if (!selected) return;
    setAiLoading(true);
    setTimeout(() => {
      const hints = ["Think about using a Hash Map.", "Try two pointers.", "Sort the array first.", "Break it down with recursion."];
      setAiHint(hints[Math.floor(Math.random() * hints.length)]);
      setAiLoading(false);
    }, 1500);
  };

  const stats = selected ? parseStats(selected) : {};
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const allTags = ["Array", "String", "Hash Table", "Dynamic Programming", "Math", "Sorting", "Greedy", "Depth-First Search", "Binary Search", "Tree"];
  
  // ── Fuzzy Search Implementation ──
  const filteredQuestions = useMemo(() => {
    if (!searchQ) return masterList;
    const query = searchQ.toLowerCase();
    return masterList.filter(q => 
      q.title.toLowerCase().includes(query) || 
      q.frontendQuestionId.toLowerCase().includes(query)
    ).sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aStarts = aTitle.startsWith(query);
      const bStarts = bTitle.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [searchQ, masterList]);

  return (
    <div className={`min-h-screen bg-background text-foreground font-poppins flex flex-col relative overflow-hidden h-[100dvh] ${zenMode ? 'zen-mode' : ''}`}>
      {/* ── Modals ── */}
      {/* Modals Removed - Integrated into Tabs */}

      {authModal.open && (
        <div className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border w-full max-md rounded-none shadow-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[24px] font-black uppercase tracking-tighter">{authModal.mode}</h2>
              <button onClick={() => setAuthModal({ ...authModal, open: false })}><X size={20} /></button>
            </div>
            <form onSubmit={authModal.mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-card border border-border rounded-none p-4 font-bold outline-none" placeholder="Email" />
              <input type="password" required value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-card border border-border rounded-none p-4 font-bold outline-none" placeholder="Password" />
              <button type="submit" className="w-full bg-foreground text-background font-black uppercase tracking-widest p-4 rounded-none active:scale-95">{authModal.mode}</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      {!zenMode && (
        <header className="h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b border-border bg-panel flex items-center justify-between px-6 shrink-0 z-50 sticky top-0 transition-all duration-500">
          <div className="flex items-center gap-6">
            <div className="text-[18px] font-black tracking-tighter cursor-pointer" onClick={() => randomize()}>algoshuffle<span className="text-cyan-500">.</span></div>
            <nav className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-secondary">
              <span onClick={() => setLeftTab('questions')} className={`hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors ${leftTab === 'questions' ? 'text-foreground font-black' : ''}`}><List size={14} /> Questions</span>
            </nav>
          </div>

          {/* Layout switcher removed from desktop header as requested */}
          <div className="hidden">
            <button onClick={() => setLayoutMode('desc')} className={`px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'desc' ? 'bg-cyan-500 text-white shadow-lg' : 'text-secondary hover:text-foreground'}`}>Problem</button>
            <button onClick={() => setLayoutMode('split')} className={`px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'split' ? 'bg-cyan-500 text-white shadow-lg' : 'text-secondary hover:text-foreground'}`}>Split</button>
            <button onClick={() => setLayoutMode('editor')} className={`px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-widest transition-all ${layoutMode === 'editor' ? 'bg-cyan-500 text-white shadow-lg' : 'text-secondary hover:text-foreground'}`}>Editor</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="lg:hidden text-secondary">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>

            {user ? (
              <div className="hidden lg:flex items-center gap-4">
                <div className="flex flex-col items-end"><span className="text-[10px] font-black uppercase tracking-widest">{user.email?.split('@')[0]}</span><span className="text-[8px] opacity-40 font-black">PRO ACCOUNT</span></div>
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-none flex items-center justify-center text-cyan-500 font-black">{user.email?.[0].toUpperCase()}</div>
                <button onClick={handleLogout} className="p-2 text-secondary hover:text-red-500"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="hidden lg:block px-6 py-2 bg-foreground text-background rounded-none text-[10px] font-black uppercase tracking-widest">Sign In</button>
            )}

            <div className="hidden lg:flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest text-secondary">
              <select value={diffFilter} onChange={e => {setDiffFilter(e.target.value); randomize();}} className="bg-transparent outline-none"><option>All</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
              <button onClick={() => randomize()} className="text-foreground ml-2 hover:rotate-180 transition-transform duration-500"><Shuffle size={14} /></button>
            </div>
          </div>
        </header>
      )}

      {/* Mobile Menu Overlay Removed - Content moved to Filters Tab */}

      {/* Mobile Segmented Control Removed as Editor is now a tab */}

      <main className="flex-1 flex overflow-hidden relative lg:pb-0">
        {/* ── Left Panel (Description) ── */}
        <div className={`flex flex-col border-r border-border bg-panel transition-all duration-500 ease-in-out 
          ${mobileTab !== 'desc' ? 'hidden lg:flex' : 'flex w-full lg:w-1/2'} 
          ${layoutMode === 'editor' ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : layoutMode === 'desc' ? 'lg:flex-1' : 'lg:w-1/2'}`}>
          <div className="h-10 flex border-b border-border px-4 items-center bg-card/20 shrink-0 overflow-x-auto no-scrollbar">
            {["description", "notes", "editor"].map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab as any)} className={`px-4 h-full whitespace-nowrap text-[10px] font-black uppercase tracking-widest ${leftTab === tab ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'} ${tab === 'editor' ? 'lg:hidden' : ''}`}>{tab}</button>
            ))}
          </div>
          <div className={`flex-1 overflow-y-auto custom-scrollbar relative pb-32 ${['editor', 'filters', 'questions'].includes(leftTab) ? 'p-0' : 'p-8'}`}>
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-card rounded-lg w-3/4"></div>
                <div className="h-4 bg-card rounded w-full"></div>
                <div className="h-4 bg-card rounded w-5/6"></div>
              </div>
            ) : leftTab === "description" && selected ? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-[22px] font-bold tracking-tight">{selected.frontendQuestionId}. {selected.title}</h1>
                  <div className="flex items-center gap-3"><span className={diffClass(selected.difficulty)}>{selected.difficulty.toUpperCase()}</span>{!interviewMode && <span className="text-[10px] opacity-40 font-bold">{stats.acRate || '0%'} Accepted</span>}<button onClick={toggleSolved} className={`text-[10px] font-bold px-3 py-1 rounded-md border border-border ${solvedIds.includes(String(selected.frontendQuestionId)) ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}`}>{solvedIds.includes(String(selected.frontendQuestionId)) ? 'Solved' : 'Mark Solved'}</button></div>
                  
                  {/* ── Topic Tags ── */}
                  {selected.topics && selected.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selected.topics.map((t, i) => (
                        <button key={i} onClick={() => { setTagFilter(t); randomize(t); }} className="flex items-center gap-1.5 px-3 py-1 bg-card/50 border border-border rounded-none text-[10px] font-black uppercase tracking-widest text-secondary/80 hover:bg-cyan-500/10 hover:border-cyan-500/30 group transition-all">
                          <Tag size={10} className="text-cyan-500 group-hover:scale-125 transition-transform" />
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[14px] leading-relaxed description-html" dangerouslySetInnerHTML={{ __html: selected.description }} />
                {!interviewMode && selected.hints && selected.hints.length > 0 && (
                  <div className="py-4 border-t border-border/40">
                    <button onClick={() => setShowHints(!showHints)} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:opacity-70"><Lightbulb size={15} className="text-amber-400" />{showHints ? "Hide Hints" : `Show Hints (${selected.hints.length})`}</button>
                    {showHints && <div className="mt-4 space-y-3">{selected.hints.map((h, i) => <div key={i} className="bg-card/50 border border-border rounded-xl p-4 text-[13px] opacity-75 italic">{h}</div>)}</div>}
                  </div>
                )}

                {/* ── Resources & Similar Questions ── */}
                <div className="pt-8 space-y-6 border-t border-border/40">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Resources</h3>
                    <div className="flex flex-wrap gap-3">
                      <a href={selected.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-none text-[11px] font-bold hover:bg-border transition-colors"><ExternalLink size={14} className="text-cyan-500" /> LeetCode Original</a>
                      {selected.solution_url && (
                        <a href={selected.solution_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-none text-[11px] font-bold hover:bg-border transition-colors"><CheckCircle size={14} className="text-green-500" /> Official Solution</a>
                      )}
                    </div>
                  </div>

                  {selected.similar_questions && selected.similar_questions !== "[]" && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Similar Questions</h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const similar = JSON.parse(selected.similar_questions);
                            return similar.map((q: any, i: number) => (
                              <button 
                                key={i} 
                                onClick={() => {
                                  const found = masterList.find(x => x.title === q.title);
                                  if (found) {
                                    setSelected(found);
                                    setLeftTab('description');
                                    setTime(0);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }
                                }}
                                className="px-3 py-1.5 bg-card/50 border border-border rounded-none text-[11px] font-bold opacity-70 flex items-center gap-2 italic hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:opacity-100 transition-all"
                              >
                                <Link size={12} className="text-cyan-500" /> {q.title}
                              </button>
                            ));
                          } catch { return null; }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : leftTab === "notes" && selected ? (
              <textarea 
                value={notes[selected.frontendQuestionId] || ""} 
                onChange={e => {
                  const newNotes = { ...notes, [selected.frontendQuestionId]: e.target.value };
                  setNotes(newNotes);
                  localStorage.setItem("problem_notes", JSON.stringify(newNotes));
                  if (user) {
                    supabase.from('profiles').upsert({ id: user.id, notes: newNotes, updated_at: new Date() }).then();
                  }
                }} 
                placeholder="Write your logic, patterns, or thoughts here..." 
                className="w-full h-full bg-transparent outline-none resize-none font-mono text-[14px] leading-relaxed opacity-80" 
              />
            ) : leftTab === "editor" && selected ? (
              <div className="flex flex-col h-full bg-background">
                <div className="flex items-center justify-between p-4 border-b border-border bg-card/10">
                   <select value={lang.id} onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value)!; setLang(l); setCode(l.template); }} className="bg-transparent text-[11px] font-black uppercase outline-none">{LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}</select>
                   <div className="flex items-center gap-4">
                      <button onClick={getAIHint} disabled={aiLoading} className="flex items-center gap-2 px-2 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-none text-[10px] font-black uppercase hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50"><Lightbulb size={12}/> {aiLoading ? "..." : "AI"}</button>
                      <div className="flex items-center gap-2 text-[11px] font-mono font-bold"><Timer size={14} /> {fmt(time)}</div>
                   </div>
                </div>
                <textarea 
                  value={code} 
                  onChange={e => { setCode(e.target.value); if (selected) localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, e.target.value); }} 
                  className="flex-1 bg-transparent p-6 outline-none resize-none font-mono text-[14px] leading-6 pb-20" 
                  spellCheck={false} 
                />
                <div className="h-14 bg-panel border-t border-border flex items-center justify-between px-6 shrink-0 z-50">
                   <button onClick={() => setConsoleOpen(!consoleOpen)} className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary">Console {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
                   <div className="flex gap-3">
                      <button onClick={runCode} disabled={isRunning} className="px-5 py-2 rounded-none border border-border text-[10px] font-black uppercase">Run Code</button>
                   </div>
                </div>
                {consoleOpen && (
                  <div className="fixed inset-x-0 bottom-20 h-64 bg-panel border-t border-border z-[60] overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Console Output</span>
                      <button onClick={() => setConsoleOpen(false)}><X size={16} /></button>
                    </div>
                    {results.length > 0 ? (
                      <div className="space-y-4">
                        {results.map((r, idx) => (
                          <div key={idx} className="p-4 bg-card rounded-none border border-border">
                            <div className={`text-[15px] font-bold mb-1 ${r.passed ? 'text-green-500' : 'text-red-500'}`}>{r.status}</div>
                            <pre className="font-mono text-[12px] opacity-70 whitespace-pre-wrap">{r.actual}</pre>
                          </div>
                        ))}
                      </div>
                    ) : <div className="h-full flex items-center justify-center opacity-20 text-[10px] font-black uppercase tracking-widest">No results yet</div>}
                  </div>
                )}
              </div>
            ) : leftTab === "questions" ? (
              <div className="animate-in fade-in duration-500">
                <div className="p-6 border-b border-border flex items-center gap-4 bg-background sticky top-0 z-10 backdrop-blur-md">
                  <Search className="text-secondary opacity-40" size={20} />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search ID or title..." className="bg-transparent outline-none font-bold w-full text-[15px]" />
                </div>
                <div className="p-2">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                      <RefreshCcw className="animate-spin text-secondary" size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Syncing Vault...</span>
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-[10px] font-black uppercase tracking-widest">No matches found</div>
                  ) : (
                    <div className="space-y-0">
                      {filteredQuestions.map(q => (
                        <div key={q.frontendQuestionId} onClick={() => { setSelected(q); setLeftTab('description'); setSearchQ(""); setTime(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center justify-between p-4 hover:bg-card rounded-none cursor-pointer group transition-all">
                          <div className="flex items-center gap-4 truncate">
                            <span className="text-[11px] font-mono opacity-20 group-hover:opacity-100 transition-all w-10 shrink-0">{q.frontendQuestionId}</span>
                            <span className="font-bold text-[14px] truncate">{q.title}</span>
                          </div>
                          <span className={diffClass(q.difficulty)}>{q.difficulty.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : leftTab === "filters" ? (
              <div className="flex flex-col bg-background p-6 space-y-10">
                <div className="space-y-8">
                   <div className="space-y-4">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">Difficulty</h3>
                      <div className="flex flex-wrap gap-2">
                        {["All", "Easy", "Medium", "Hard"].map(d => (
                          <button key={d} onClick={() => { setDiffFilter(d); randomize(); }} className={`px-6 py-2 rounded-none text-[10px] font-black uppercase tracking-widest border transition-all ${diffFilter === d ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-transparent border-border opacity-60 hover:opacity-100 hover:bg-card'}`}>{d}</button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {["All Tags", ...allTags].map(tag => (
                          <button key={tag} onClick={() => { setTagFilter(tag); randomize(tag); }} className={`px-4 py-2 rounded-none text-[9px] font-black uppercase tracking-widest border transition-all ${tagFilter === tag ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-transparent border-border opacity-50 hover:opacity-100 hover:bg-card'}`}>{tag}</button>
                        ))}
                      </div>
                   </div>

                   <div className="pt-8 border-t border-border/50 space-y-6">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2">Account</h3>
                      {user ? (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-none bg-cyan-500 flex items-center justify-center text-white font-black text-[15px]">{user.email?.[0].toUpperCase()}</div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black tracking-tight">{user.email?.split('@')[0]}</span>
                              <span className="text-[8px] opacity-40 uppercase font-black tracking-widest">Pro Member</span>
                            </div>
                          </div>
                          <button onClick={handleLogout} className="w-full py-2 border border-red-500/30 text-red-500 rounded-none font-black uppercase tracking-widest text-[9px] hover:bg-red-50 transition-all text-center">Logout from Device</button>
                        </div>
                      ) : (
                        <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="w-full py-3 border border-foreground rounded-none font-black uppercase tracking-widest text-[10px] hover:bg-foreground hover:text-background transition-all">Sign In to Sync</button>
                      )}
                      
                      <a href="https://leetcode-randomizer-nine.vercel.app/" target="_blank" rel="noreferrer" className="w-full py-3 border border-cyan-500/30 bg-cyan-500/5 text-cyan-500 rounded-none font-black uppercase tracking-widest text-[10px] hover:bg-cyan-500 hover:text-white transition-all text-center flex items-center justify-center gap-2">
                        <Maximize2 size={14} /> Try on Desktop
                      </a>
                   </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Right Panel (Editor) ── */}
        <div className={`flex flex-col bg-background transition-all duration-500 ease-in-out
          ${mobileTab !== 'editor' ? 'hidden lg:flex' : 'flex w-full lg:w-1/2'}
          ${layoutMode === 'desc' ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none' : layoutMode === 'editor' ? 'lg:flex-1' : 'lg:w-1/2'}`}>
          <div className="h-10 bg-card/20 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-3 lg:gap-6">
              <select value={lang.id} onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value)!; setLang(l); setCode(l.template); }} className="bg-transparent text-[10px] font-black uppercase outline-none">{LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}</select>
              <div className="flex items-center gap-2 text-[10px] lg:text-[11px] font-mono font-bold"><Timer size={14} /> {fmt(time)}</div>
              <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-none text-[9px] font-black text-cyan-500 uppercase tracking-widest">{complexity}</div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={getAIHint} disabled={aiLoading} className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-none text-[10px] font-black uppercase hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50"><Lightbulb size={12}/> {aiLoading ? "..." : "AI"}</button>
              <button onClick={() => setZenMode(!zenMode)} className="hidden lg:flex items-center gap-2 p-1.5 hover:bg-card rounded-none transition-colors text-secondary hover:text-cyan-500">
                {zenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              <div className="w-12 bg-card/10 border-r border-border flex flex-col items-center py-6 font-mono text-[11px] opacity-10 select-none">{[...Array(50)].map((_, i) => <span key={i} className="leading-6">{i + 1}</span>)}</div>
              <textarea value={code} onChange={e => { setCode(e.target.value); if (selected) localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, e.target.value); }} className="flex-1 bg-transparent p-6 outline-none resize-none font-mono text-[14px] leading-6 pb-32" spellCheck={false} />
            </div>

            <div className={`transition-all duration-300 border-t border-border bg-panel shrink-0 ${consoleOpen ? 'h-[280px] lg:h-[280px]' : 'h-0'} overflow-hidden`}>
              <div className="h-10 bg-card/20 border-b border-border flex px-4 gap-4 items-center">{["result", "terminal"].map(t => (<button key={t} onClick={() => setConsoleTab(t as any)} className={`h-full px-4 text-[10px] font-black uppercase tracking-widest ${consoleTab === t ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>{t}</button>))}<button onClick={() => setConsoleOpen(false)} className="ml-auto text-secondary"><ChevronDown size={14} /></button></div>
              <div className="p-6 h-[calc(100%-40px)] overflow-y-auto pb-32">
                {results.length > 0 ? (<div className="space-y-4">{results.map((r, idx) => (<div key={idx} className="p-4 bg-card rounded-none border border-border"><div className={`text-[16px] font-bold mb-2 ${r.passed ? 'text-green-500' : 'text-red-500'}`}>{r.status}</div><pre className="font-mono text-[12px] opacity-70 whitespace-pre-wrap">{r.actual}</pre></div>))}</div>) : <div className="flex items-center justify-center h-full opacity-20 uppercase font-black text-[12px]">No output yet</div>}
              </div>
            </div>

            <div className="h-12 bg-panel border-t border-border flex items-center justify-between px-4 shrink-0">
              <button onClick={() => setConsoleOpen(!consoleOpen)} className="flex items-center gap-2 text-[10px] font-black uppercase text-secondary px-4">Console {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
              <div className="flex gap-3"><button onClick={runCode} disabled={isRunning} className="px-5 py-2 rounded-none border border-border text-[10px] font-black uppercase">Run Code</button></div>
            </div>
          </div>
        </div>
        {/* Filters Panel Removed - Integrated into Tabs */}
      </main>

      {/* ── Floating Action Button (Mobile) ── */}
      {!zenMode && leftTab === "description" && (
        <button 
          onClick={() => randomize()} 
          className="fixed bottom-26 right-6 w-14 h-14 bg-cyan-500 text-white rounded-none shadow-2xl shadow-cyan-500/20 flex items-center justify-center active:scale-95 transition-all z-[100] group"
        >
          <Shuffle size={22} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      )}

      {/* ── Native Bottom Navigation (Mobile) ── */}
      {!zenMode && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] border-t border-border bg-background flex items-center justify-around px-4 shrink-0 z-40 shadow-[0_-10px_40_rgba(0,0,0,0.3)] transition-all duration-500">
          <button onClick={() => { 
            setLeftTab('description'); 
            setMobileTab('desc');
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
          }} className="flex flex-col items-center gap-1 text-secondary hover:text-cyan-500 transition-colors">
            <HomeIcon size={22} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Home</span>
          </button>
          <button onClick={() => { setMobileTab('desc'); setLeftTab('questions'); }} className={`flex flex-col items-center gap-1 ${mobileTab === 'desc' && leftTab === 'questions' ? 'text-cyan-500' : 'text-secondary'}`}>
            <List size={22} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Questions</span>
          </button>
          <button onClick={() => { setMobileTab('desc'); setLeftTab('filters'); }} className={`flex flex-col items-center gap-1 ${mobileTab === 'desc' && leftTab === 'filters' ? 'text-cyan-500' : 'text-secondary'}`}>
            <Filter size={22} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Filters</span>
          </button>
        </div>
      )}
      {/* ── Global AI Hint Pop-up ── */}
      {aiHint && (
        <div className="fixed top-20 right-4 left-4 lg:left-auto lg:right-8 lg:w-96 bg-panel/95 backdrop-blur-2xl p-6 rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-cyan-500/50 z-[200] animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-3 text-cyan-400">
              <Lightbulb size={20} fill="currentColor" className="animate-pulse" />
              <span className="text-[12px] font-black uppercase tracking-widest">Intelligent Hint</span>
            </div>
            <button onClick={() => setAiHint(null)} className="p-1 hover:bg-card transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="text-[14px] font-bold leading-relaxed opacity-90">
            {aiHint}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setAiHint(null)} className="px-4 py-1.5 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600 transition-all">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
