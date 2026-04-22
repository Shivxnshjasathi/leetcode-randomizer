"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Shuffle, List, Flame, Sun, Moon, Search, X, CheckCircle, 
  Lock, BarChart2, Tag, ThumbsUp, ThumbsDown, Lightbulb, 
  ExternalLink, ChevronRight, Timer, RotateCcw, Settings, 
  Layout, Send, ChevronDown, ChevronUp, RefreshCcw, Menu,
  Code2, User as UserIcon, LogOut, Users, Plus, Link
} from "lucide-react";
import rawData from "@/assets/question_v2.json";
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
  const [editorLayout, setEditorLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [results, setResults] = useState<any[]>([]);
  const [complexity, setComplexity] = useState("O(1)");
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [otherCursors, setOtherCursors] = useState<Record<string, { x: number, y: number, email: string }>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [filterSolvedOnly, setFilterSolvedOnly] = useState(false);
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
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomParticipants, setRoomParticipants] = useState<any[]>([]);
  const [roomModal, setRoomModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [time, setTime] = useState(0);
  const [timerOn, setTimerOn] = useState(true);
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [interviewMode, setInterviewMode] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"standard"|"glass">("standard");
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("solved_ids");
    if (s) setSolvedIds(JSON.parse(s));
    const n = localStorage.getItem("problem_notes");
    if (n) setNotes(JSON.parse(n));
    
    // Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) syncFromSupabase(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) syncFromSupabase(session.user.id);
    });

    // Theme logic...
    const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    randomize();
  }, []);

  // ── Multiplayer Real-time Listener ──
  useEffect(() => {
    if (!roomId) return;

    // Listen for room changes (like shuffling)
    const roomChannel = supabase.channel(`room_${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, 
        payload => {
          const newQId = payload.new.question_id;
          const found = ALL_QUESTIONS.find(q => String(q.frontendQuestionId) === String(newQId));
          if (found) { setSelected(found); setTime(0); }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` }, 
        async () => {
          const { data } = await supabase.from('room_participants').select('*').eq('room_id', roomId);
          if (data) setRoomParticipants(data);
        }
      )
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        setOtherCursors(prev => ({ ...prev, [payload.user]: payload }));
      })
      .subscribe();

    return () => { supabase.removeChannel(roomChannel); };
  }, [roomId]);

  useEffect(() => {
    if (selected) {
      const savedCode = localStorage.getItem(`code_${selected.frontendQuestionId}_${lang.id}`);
      if (savedCode) setCode(savedCode);
      else setCode(lang.template);
    }
  }, [selected, lang]);

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

  const resetCode = () => {
    if (!selected) return;
    const confirm = window.confirm("Reset code to default boilerplate?");
    if (confirm) {
      const boilerplate = `// Solution for ${selected.title}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}`;
      setCode(boilerplate);
      localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, boilerplate);
    }
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

  const createRoom = async () => {
    if (!user || !selected) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('rooms').insert({
      id: code,
      question_id: selected.frontendQuestionId,
      creator_id: user.id
    });
    if (!error) {
      setRoomId(code); setIsCreator(true);
      await supabase.from('room_participants').insert({ room_id: code, user_email: user.email });
      setRoomModal(false);
    }
  };

  const joinRoom = async () => {
    if (!user || !joinCode) return;
    const { data, error } = await supabase.from('rooms').select('*').eq('id', joinCode.toUpperCase()).single();
    if (data) {
      setRoomId(joinCode.toUpperCase()); setIsCreator(false);
      const q = ALL_QUESTIONS.find(x => String(x.frontendQuestionId) === String(data.question_id));
      if (q) setSelected(q);
      await supabase.from('room_participants').insert({ room_id: joinCode.toUpperCase(), user_email: user.email });
      setRoomModal(false);
    }
  };

  const syncToSupabase = async (newSolved: string[], newNotes: Record<string, string>) => {
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      solved_ids: newSolved,
      notes: newNotes,
      updated_at: new Date()
    });
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

    // Sync room if creator shuffles
    if (roomId && isCreator) {
      supabase.from('rooms').update({ question_id: pick[0].frontendQuestionId }).eq('id', roomId).then();
    }
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
    localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, code);
    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang.id, version: lang.version, files: [{ content: code }] })
      });
      const data = await response.json();
      const output = data.run.stdout || data.run.stderr || data.run.output;
      const tcs = parseTestCases(selected.description);
      const newResults = tcs.length > 0 ? tcs.map((tc, idx) => {
        const passed = output.trim().includes(tc.output.trim());
        return {
          status: data.run.code === 0 ? (passed ? "Accepted" : "Wrong Answer") : "Runtime Error",
          actual: output, expected: tc.output, passed: data.run.code === 0 && passed,
          runtime: "Real Time", memory: "Real Memory", message: data.run.stderr || ""
        };
      }) : [{
        status: data.run.code === 0 ? "Success" : "Error",
        actual: output, expected: "N/A", passed: data.run.code === 0,
        runtime: "N/A", memory: "N/A", message: data.run.stderr || ""
      }];
      setResults(newResults);

      // ── Save Submission to Cloud ──
      if (user) {
        await supabase.from('submissions').insert({
          user_id: user.id,
          question_id: selected.frontendQuestionId,
          language: lang.id,
          code: code,
          status: newResults.every(r => r.passed) ? "Accepted" : "Rejected"
        });
      }
    } catch (err) {
      setResults([{ status: "Error", message: "Failed to connect to compiler." }]);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSolved = async () => {
    if (!selected) return;
    const id = String(selected.frontendQuestionId);
    let newIds = solvedIds.includes(id) ? solvedIds.filter(x => x !== id) : [...solvedIds, id];
    setSolvedIds(newIds);
    localStorage.setItem("solved_ids", JSON.stringify(newIds));
    if (user) syncToSupabase(newIds, notes);
    if (roomId && user) {
      await supabase.from('room_participants').update({ is_solved: true, solved_at: new Date() }).eq('room_id', roomId).eq('user_email', user.email);
    }
  };

  const analyzeComplexity = (c: string) => {
    const loops = (c.match(/for|while/g) || []).length;
    const nested = (c.match(/for.*\{[\s\S]*for|while.*\{[\s\S]*while/g) || []).length;
    if (nested > 0) return "O(n²)";
    if (loops > 0) return "O(n)";
    if (c.includes("binary_search") || c.includes("logn")) return "O(log n)";
    return "O(1)";
  };

  useEffect(() => {
    setComplexity(analyzeComplexity(code));
  }, [code]);

  const getAIHint = async () => {
    if (!selected) return;
    setAiLoading(true);
    // Simulating AI Nudge - In production, this calls a Gemini API
    setTimeout(() => {
      const hints = [
        "Think about using a Hash Map to store previously seen values.",
        "Could you use two pointers (left and right) to narrow down the search?",
        "Is there a way to solve this by sorting the array first?",
        "Try breaking the problem down into smaller sub-problems using recursion."
      ];
      setAiHint(hints[Math.floor(Math.random() * hints.length)]);
      setAiLoading(false);
    }, 1500);
  };

  const testCases = selected ? parseTestCases(selected.description) : [];
  const stats = selected ? parseStats(selected) : {};
  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins flex flex-col relative">
      {listOpen && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-panel border border-border w-full max-w-2xl h-[80vh] rounded-3xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Search className="opacity-20" size={20} />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search master list..." className="bg-transparent outline-none font-bold w-full" />
              </div>
              <div className="flex items-center gap-3">
                {filterSolvedOnly && (
                  <span className="text-[9px] font-black uppercase bg-green-500/10 text-green-500 px-2 py-1 rounded-md border border-green-500/20">
                    Solved Only
                  </span>
                )}
                <button onClick={() => {setListOpen(false); setFilterSolvedOnly(false);}} className="p-2 opacity-40 hover:opacity-100 transition-opacity"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filtered
                .filter(q => !filterSolvedOnly || solvedIds.includes(String(q.frontendQuestionId)))
                .map(q => (
                <div key={q.frontendQuestionId} onClick={() => { setSelected(q); setListOpen(false); setTime(0); }} className="flex items-center justify-between p-4 hover:bg-card/50 rounded-2xl cursor-pointer mb-2">
                  <div className="flex items-center gap-4 truncate">
                    <span className="text-[12px] opacity-20 w-10 shrink-0">{q.frontendQuestionId}</span>
                    <span className="font-bold text-[14px] truncate">{q.title}</span>
                  </div>
                  <span className={diffClass(q.difficulty)}>{q.difficulty.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Auth Modal ── */}
      {authModal.open && (
        <div className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[24px] font-black tracking-tighter uppercase">{authModal.mode}</h2>
              <button onClick={() => setAuthModal({ ...authModal, open: false })} className="opacity-20 hover:opacity-100"><X size={20}/></button>
            </div>
            
            <form onSubmit={authModal.mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-1">Email Address</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-4 text-[14px] font-bold outline-none focus:border-cyan-500/50" placeholder="name@company.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-1">Password</label>
                <input type="password" required value={authPass} onChange={e => setAuthPass(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl p-4 text-[14px] font-bold outline-none focus:border-cyan-500/50" placeholder="••••••••" />
              </div>
              
              {authError && <p className="text-[11px] font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{authError}</p>}
              
              <button type="submit" disabled={authLoading}
                className="w-full bg-foreground text-background font-black text-[12px] uppercase tracking-widest p-4 rounded-xl active:scale-95 disabled:opacity-50">
                {authLoading ? "Processing..." : authModal.mode}
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-border text-center">
              <button onClick={() => setAuthModal({ ...authModal, mode: authModal.mode === 'login' ? 'signup' : 'login' })}
                className="text-[11px] font-black uppercase tracking-widest text-secondary hover:text-foreground">
                {authModal.mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Room Modal ── */}
      {roomModal && (
        <div className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[20px] font-black tracking-tighter uppercase">Multiplayer</h2>
              <button onClick={() => setRoomModal(false)} className="opacity-20 hover:opacity-100"><X size={20}/></button>
            </div>
            
            <div className="flex flex-col gap-6">
              <button onClick={createRoom} className="w-full flex items-center justify-center gap-3 p-6 bg-cyan-500 text-white rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                <Plus size={24}/>
                <span className="text-[12px] font-black uppercase tracking-widest">Create New Room</span>
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-20">or join existing</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <div className="space-y-3">
                <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="ENTER ROOM CODE" 
                  className="w-full bg-card border border-border rounded-xl p-4 text-center font-mono font-bold text-[18px] uppercase tracking-[0.3em] outline-none focus:border-cyan-500/50 transition-colors"/>
                <button onClick={joinRoom} className="w-full py-4 bg-foreground text-background rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">
                  Join Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="h-14 border-b border-border bg-panel flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6 lg:gap-10">
          <div className="text-[18px] font-black tracking-tighter cursor-pointer" onClick={randomize}>algoshuffle<span className="text-cyan-500">.</span></div>
          <nav className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
            <span onClick={() => setListOpen(true)} className="hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors"><List size={14} /> Questions</span>
            <span onClick={() => {setListOpen(true); setFilterSolvedOnly(true);}} className="hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors">
              <Flame size={14} fill="currentColor" className="text-cyan-500" /> {solvedIds.length} Solved
            </span>
            <span onClick={() => setRoomModal(true)} className="hover:text-cyan-500 cursor-pointer flex items-center gap-2 transition-colors">
              <Users size={14} /> Rooms
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden lg:flex items-center gap-4 pr-4 border-r border-border">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none">Logged in</span>
                <span className="text-[11px] font-bold truncate max-w-[100px]">{user.user_metadata.user_name || user.email}</span>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-card rounded-lg text-secondary hover:text-red-500 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setAuthModal({ open: true, mode: 'login' })} className="hidden lg:flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95">
              Sign In
            </button>
          )}

          <div className="hidden md:flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary">
            <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} className="bg-transparent outline-none">
              <option>All</option><option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <div className="w-[1px] h-3 bg-border mx-1"></div>
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="bg-transparent outline-none max-w-[100px]">
              <option>All Tags</option>{allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={randomize} className="text-foreground ml-2 hover:rotate-180 transition-transform duration-500"><Shuffle size={14} /></button>
          </div>
          <button onClick={toggleTheme} className="opacity-40 hover:opacity-100 text-secondary">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 text-secondary">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menuOpen && (
          <div className="absolute top-14 left-0 right-0 bg-panel border-b border-border z-40 p-6 space-y-6 lg:hidden">
            {user ? (
              <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-black">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold">{user.email}</span>
                    <span className="text-[10px] opacity-40 uppercase font-black">Cloud Sync On</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-red-500"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={() => {setAuthModal({ open: true, mode: 'login' }); setMenuOpen(false);}} className="w-full flex items-center justify-center gap-2 p-4 bg-foreground text-background rounded-xl text-[12px] font-black uppercase tracking-widest">
                Sign In to Cloud
              </button>
            )}
            
            {user && (
              <button onClick={() => {setRoomModal(true); setMenuOpen(false);}} className="w-full flex items-center justify-center gap-2 p-4 bg-cyan-500 text-white rounded-xl text-[12px] font-black uppercase tracking-widest">
                <Users size={18} /> Multiplayer Room
              </button>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => {setListOpen(true); setFilterSolvedOnly(false); setMenuOpen(false);}} className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border">
                <List size={20} className="text-cyan-500" />
                <span className="text-[10px] font-black">Questions</span>
              </button>
              <button onClick={() => {setListOpen(true); setFilterSolvedOnly(true); setMenuOpen(false);}} className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border">
                <Flame size={20} className="text-cyan-500" />
                <span className="text-[10px] font-black">{solvedIds.length} Solved</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-2 gap-2 overflow-hidden">
        <div className="w-full lg:w-[480px] flex flex-col bg-panel rounded-2xl border border-border overflow-hidden shrink-0 h-full">
          <div className="h-10 flex border-b border-border px-4 items-center bg-card/20">
            {["description", "notes"].map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab as any)} className={`px-4 h-full text-[10px] font-black uppercase tracking-widest ${leftTab === tab ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>{tab}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {leftTab === "description" && selected ? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-[22px] font-bold tracking-tight">{selected.frontendQuestionId}. {selected.title}</h1>
                  <div className="flex items-center gap-3">
                    <span className={diffClass(selected.difficulty)}>{selected.difficulty.toUpperCase()}</span>
                    {!interviewMode && <span className="text-[10px] opacity-40 font-bold">{stats.acRate || '0%'} Accepted</span>}
                    <button onClick={toggleSolved} className={`text-[10px] font-bold px-3 py-1 rounded-md border border-border ${solvedIds.includes(selected.frontendQuestionId) ? 'bg-green-500/10 text-green-500' : ''}`}>{solvedIds.includes(selected.frontendQuestionId) ? 'Solved' : 'Mark Solved'}</button>
                  </div>
                </div>
                <div className="text-[14px] leading-relaxed description-html" dangerouslySetInnerHTML={{ __html: selected.description }} />
                {!interviewMode && selected.hints.length > 0 && (
                  <div className="py-4 border-t border-border/40">
                    <button onClick={() => setShowHints(!showHints)} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:opacity-70"><Lightbulb size={15} className="text-amber-400" />{showHints ? "Hide Hints" : `Show Hints (${selected.hints.length})`}</button>
                    {showHints && <div className="mt-4 space-y-3">{selected.hints.map((h, i) => <div key={i} className="bg-card/50 border border-border rounded-xl p-4 text-[13px] opacity-75 italic">{h}</div>)}</div>}
                  </div>
                )}
              </div>
            ) : leftTab === "notes" && selected ? (
              <textarea value={notes[selected.frontendQuestionId] || ""} onChange={e => {
                const n = {...notes, [selected.frontendQuestionId]: e.target.value};
                setNotes(n); 
                localStorage.setItem("problem_notes", JSON.stringify(n));
                if (user) syncToSupabase(solvedIds, n);
              }} placeholder="Write your thoughts..." className="w-full h-full bg-transparent p-4 outline-none resize-none font-mono text-[13px]" />
            ) : null}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-panel rounded-2xl border border-border overflow-hidden relative h-full">
          <div className="h-10 bg-card/20 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-6">
              <select value={lang.id} onChange={e => { const l = LANGUAGES.find(x => x.id === e.target.value)!; setLang(l); setCode(l.template); }} className="bg-transparent text-[10px] font-black uppercase outline-none">{LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}</select>
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold"><Timer size={14} /> {fmt(time)}</div>
              <div className="flex items-center gap-2 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-black text-cyan-500 uppercase tracking-widest">
                Complexity: {complexity}
              </div>
              <button onClick={() => setInterviewMode(!interviewMode)} className={`text-[10px] font-black uppercase px-3 py-1 rounded-md ${interviewMode ? 'bg-cyan-500 text-white' : 'bg-card border border-border'}`}>{interviewMode ? "Interview On" : "Interview Mode"}</button>
            </div>
            <div className="flex items-center gap-4 text-secondary">
              <button onClick={getAIHint} disabled={aiLoading} className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50">
                <Lightbulb size={12}/> {aiLoading ? "Thinking..." : "AI Hint"}
              </button>
              <button onClick={toggleTheme} className="hover:text-foreground transition-colors">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => setEditorTheme(editorTheme === 'standard' ? 'glass' : 'standard')} className="hover:text-foreground transition-colors">
                <Layout size={16} className={editorTheme === 'glass' ? 'text-cyan-500' : ''} />
              </button>
              <button onClick={resetCode} className="hover:text-red-500 transition-colors">
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
          <div className={`flex-1 flex overflow-hidden ${editorTheme === 'glass' ? 'bg-gradient-to-b from-panel to-background/50 backdrop-blur-sm' : ''}`}>
            <div className="w-12 bg-card/10 border-r border-border flex flex-col items-center py-6 font-mono text-[11px] opacity-10 select-none">{[...Array(50)].map((_, i) => <span key={i} className="leading-6">{i + 1}</span>)}</div>
            <textarea 
              value={code} 
              onKeyUp={e => {
                if (roomId && user) {
                  const target = e.target as HTMLTextAreaElement;
                  const { selectionStart } = target;
                  // Simplified cursor tracking for demo
                  supabase.channel(`room_${roomId}`).send({
                    type: 'broadcast',
                    event: 'cursor',
                    payload: { user: user.id, email: user.email, pos: selectionStart }
                  });
                }
              }}
              onChange={e => { setCode(e.target.value); if (selected) localStorage.setItem(`code_${selected.frontendQuestionId}_${lang.id}`, e.target.value); }} 
              className="flex-1 bg-transparent p-6 outline-none resize-none font-mono text-[14px] leading-6" spellCheck={false} 
            />
            
            {/* ── Other Cursors ── */}
            {Object.values(otherCursors).map((c, i) => (
              <div key={i} className="absolute pointer-events-none flex flex-col items-start gap-1 transition-all duration-100" style={{ left: 100 + (i * 20), top: 100 + (i * 20) }}>
                <div className="w-[2px] h-5 bg-cyan-500 animate-pulse"></div>
                <span className="bg-cyan-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">{c.email.split('@')[0]}</span>
              </div>
            ))}
            
            {/* ── Room Leaderboard Widget ── */}
            {roomId && (
              <div className="absolute top-4 right-4 w-60 bg-panel/80 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right-4 duration-500 z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Live Room</span>
                    <span className="text-[14px] font-mono font-bold tracking-widest">{roomId}</span>
                  </div>
                  <button onClick={() => {setRoomId(null); setRoomParticipants([]);}} className="text-secondary hover:text-red-500 transition-colors"><X size={14}/></button>
                </div>
                
                <div className="space-y-3">
                  {roomParticipants.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-card/50 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${p.is_solved ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-cyan-500 animate-pulse'}`}></div>
                        <span className="text-[11px] font-bold truncate opacity-80">{p.user_email.split('@')[0]}</span>
                      </div>
                      {p.is_solved && (
                        <span className="text-[9px] font-black uppercase text-green-500 whitespace-nowrap">SOLVED</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <button onClick={() => {navigator.clipboard.writeText(roomId);}}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-card border border-border rounded-lg text-[9px] font-black uppercase tracking-widest text-secondary hover:text-foreground transition-all">
                  <Link size={12}/> Copy Invite Code
                </button>
              </div>
            )}

            {/* ── AI Hint Floating Card ── */}
            {aiHint && (
              <div className="absolute top-14 right-6 w-80 bg-cyan-600/20 backdrop-blur-xl text-foreground p-5 rounded-3xl shadow-2xl animate-in slide-in-from-top-8 duration-500 flex flex-col gap-3 border border-cyan-500/30 ring-1 ring-white/10 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-cyan-500 p-1.5 rounded-lg shadow-lg shadow-cyan-500/40 text-white">
                      <Lightbulb size={16} fill="currentColor"/>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">AI Logic Nudge</span>
                  </div>
                  <button onClick={() => setAiHint(null)} className="p-1 hover:bg-foreground/10 rounded-full transition-colors opacity-40 hover:opacity-100">
                    <X size={16}/>
                  </button>
                </div>
                <p className="text-[13px] font-bold leading-relaxed opacity-90">{aiHint}</p>
                <div className="h-1 w-full bg-cyan-500/20 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-cyan-500 w-1/3 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>

          <div className={`transition-all duration-300 border-t border-border bg-panel shrink-0 ${consoleOpen ? 'h-[280px]' : 'h-0'} overflow-hidden`}>
            <div className="h-10 bg-card/20 border-b border-border flex px-4 gap-4 items-center">
              {["testcase", "result", "terminal"].map(t => (
                <button key={t} onClick={() => setConsoleTab(t as any)} className={`h-full px-4 text-[10px] font-black uppercase tracking-widest ${consoleTab === t ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>{t}</button>
              ))}
              <button onClick={() => setConsoleOpen(false)} className="ml-auto text-secondary p-1"><ChevronDown size={14} /></button>
            </div>
            <div className="p-6 h-[calc(100%-40px)] overflow-y-auto custom-scrollbar">
              {consoleTab === "testcase" && (
                <div className="space-y-6">
                  <div className="flex gap-2">{testCases.map((_, idx) => <button key={idx} onClick={() => setActiveTestCase(idx)} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold ${activeTestCase === idx ? 'bg-border text-foreground' : 'bg-card/50 text-secondary'}`}>Case {idx + 1}</button>)}</div>
                  {testCases[activeTestCase] && <div className="space-y-4"><div><div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Input</div><pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px]">{testCases[activeTestCase].input}</pre></div><div><div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Expected</div><pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px]">{testCases[activeTestCase].output}</pre></div></div>}
                </div>
              )}
              {consoleTab === "result" && (
                isRunning ? <div className="flex flex-col items-center justify-center h-full gap-4"><RefreshCcw className="animate-spin opacity-20" size={24} /><span className="text-[10px] font-black uppercase tracking-widest opacity-20">Running...</span></div> : results.length > 0 ? (
                  <div className="space-y-6">
                    <div className={`text-[20px] font-bold ${results.every(r => r.passed) ? 'text-green-500' : 'text-red-500'}`}>{results.every(r => r.passed) ? 'Accepted' : 'Wrong Answer'}</div>
                    <div className="flex gap-2">{results.map((r, idx) => <button key={idx} onClick={() => setActiveTestCase(idx)} className={`px-4 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-2 ${activeTestCase === idx ? 'bg-border text-foreground' : 'text-secondary'}`}><div className={`w-1.5 h-1.5 rounded-full ${r.passed ? 'bg-green-500' : 'bg-red-500'}`}></div>Case {idx + 1}</button>)}</div>
                    {results[activeTestCase] && <div className="space-y-4"><div><div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Input</div><pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px]">{testCases[activeTestCase]?.input}</pre></div><div className="grid grid-cols-2 gap-4"><div><div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Output</div><pre className={`p-4 rounded-xl border font-mono text-[13px] ${results[activeTestCase].passed ? 'text-green-400' : 'text-red-400'}`}>{results[activeTestCase].actual}</pre></div><div><div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Expected</div><pre className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] opacity-80">{results[activeTestCase].expected}</pre></div></div></div>}
                  </div>
                ) : <div className="flex items-center justify-center h-full opacity-20 uppercase font-black text-[12px]">Run code to see results</div>
              )}
              {consoleTab === "terminal" && <div className="h-full bg-black/40 rounded-xl p-5 font-mono text-[12px] text-green-500/80"><pre className="whitespace-pre-wrap">{results[0]?.actual || "No output yet."}</pre></div>}
            </div>
          </div>

          <div className="h-12 bg-panel border-t border-border flex items-center justify-between px-4 shrink-0">
            <button onClick={() => setConsoleOpen(!consoleOpen)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-secondary px-4">Console {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
            <div className="flex gap-3"><button onClick={runCode} disabled={isRunning} className="px-5 py-2 rounded-lg border border-border text-[10px] font-black uppercase text-secondary">Run</button><button className="px-5 py-2 rounded-lg bg-foreground text-background font-black text-[10px] uppercase">Submit</button></div>
          </div>
        </div>
      </main>
    </div>
  );
}
