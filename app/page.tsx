"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Shuffle, ExternalLink, Sun, Moon, Code, Play, 
  RotateCcw, Timer, CheckCircle, Flame, History, ChevronRight,
  Settings, Terminal, Send, ChevronDown, List, BookOpen, MessageSquare,
  AlertCircle, Clock, Database, ChevronUp, RefreshCcw, TerminalSquare
} from "lucide-react";

interface Question {
  id: number;
  title: string;
  slug: string;
  difficulty: number;
  isPaidOnly: boolean;
  acceptance: string;
}

const LANGUAGES = [
  { id: "js", label: "JavaScript", template: "// JS Solution\nfunction solve() {\n  \n}" },
  { id: "py", label: "Python3", template: "# Python Solution\ndef solve():\n    pass" },
  { id: "cpp", label: "C++", template: "// C++ Solution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}" },
  { id: "kt", label: "Kotlin", template: "// Kotlin Solution\nfun main() {\n    \n}" }
];

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [randomQuestions, setRandomQuestions] = useState<Question[]>([]);
  const [selectedForIDE, setSelectedForIDE] = useState<Question | null>(null);
  const [difficulty, setDifficulty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leftTab, setLeftTab] = useState<"description" | "notes">("description");
  const [consoleTab, setConsoleTab] = useState<"testcase" | "result">("testcase");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(selectedLang.template);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [solvedIds, setSolvedIds] = useState<number[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  const [time, setTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") document.documentElement.classList.add("dark");

    setSolvedIds(JSON.parse(localStorage.getItem("solved_ids") || "[]"));
    setNotes(JSON.parse(localStorage.getItem("problem_notes") || "{}"));

    fetch("/api/questions")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setQuestions(data);
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 3);
          setRandomQuestions(selected);
          setSelectedForIDE(selected[0]);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  const randomize = () => {
    let filtered = questions;
    if (difficulty !== 0) filtered = filtered.filter(q => q.difficulty === difficulty);
    if (filtered.length > 0) {
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      setRandomQuestions(selected);
      setSelectedForIDE(selected[0]);
      setTime(0);
      setOutput("");
      setIsConsoleOpen(false);
    }
  };

  const toggleSolved = (id: number) => {
    const newSolved = solvedIds.includes(id) ? solvedIds.filter(i => i !== id) : [...solvedIds, id];
    setSolvedIds(newSolved);
    localStorage.setItem("solved_ids", JSON.stringify(newSolved));
  };

  const runCode = () => {
    setIsRunning(true);
    setIsConsoleOpen(true);
    setConsoleTab("result");
    setOutput("");
    
    setTimeout(() => {
      const lines = code.split('\n');
      let captured = "";
      lines.forEach(line => {
        const match = line.match(/(?:console\.log|print|println|cout\s*<<)\s*\(?["'](.+?)["']\)?/);
        if (match && match[1]) captured += (captured ? "\n" : "") + match[1];
      });
      setOutput(captured || "Execution Success.");
      setIsRunning(false);
    }, 1200);
  };

  if (loading) return <div className="h-screen bg-background flex items-center justify-center text-secondary text-[11px] font-bold tracking-[0.4em]">SYS.READYING</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins flex flex-col overflow-x-hidden transition-all">
      {/* Navbar - Responsive */}
      <header className="h-14 border-b border-border bg-panel flex items-center justify-between px-4 md:px-6 shrink-0 relative z-50">
        <div className="flex items-center gap-4 md:gap-10">
           <div className="text-[17px] font-bold tracking-tighter cursor-pointer" onClick={() => randomize()}>
             randomizer<span className="opacity-30">.</span>
           </div>
           <nav className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
             <span className="flex items-center gap-2"><Flame size={14} fill="currentColor" className="text-orange-500" /> {solvedIds.length} Solved</span>
           </nav>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-card border border-border px-2 md:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary">
             <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground">
               <option value={0}>All</option>
               <option value={1}>Easy</option>
               <option value={2}>Med</option>
               <option value={3}>Hard</option>
             </select>
             <button onClick={randomize} className="text-foreground"><Shuffle size={14} /></button>
           </div>
           <button onClick={toggleTheme} className="p-2 transition-soft text-secondary hover:text-foreground">
             {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
           </button>
        </div>
      </header>

      {/* Main Workspace - Responsive Grid */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 gap-2 h-auto lg:h-[calc(100vh-56px)]">
        
        {/* Left: Content Panel */}
        <div className="w-full lg:w-[480px] flex flex-col bg-panel rounded-2xl border border-border overflow-hidden shrink-0 min-h-[400px] lg:min-h-0">
           <div className="h-10 flex border-b border-border px-4 items-center bg-card/20 shrink-0">
              <button onClick={() => setLeftTab("description")} className={`px-4 h-full flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${leftTab === "description" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Description</button>
              <button onClick={() => setLeftTab("notes")} className={`px-4 h-full flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${leftTab === "notes" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Notes</button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              {leftTab === "description" ? (
                <div className="space-y-8">
                  {selectedForIDE ? (
                    <>
                      <div className="space-y-6">
                        <h1 className="text-[24px] md:text-[28px] font-bold leading-tight">{selectedForIDE.id}. {selectedForIDE.title}</h1>
                        <div className="flex items-center gap-3">
                           <span className={selectedForIDE.difficulty === 1 ? "tag-easy" : selectedForIDE.difficulty === 2 ? "tag-medium" : "tag-hard"}>
                             {selectedForIDE.difficulty === 1 ? "EASY" : selectedForIDE.difficulty === 2 ? "MEDIUM" : "HARD"}
                           </span>
                           <button onClick={() => toggleSolved(selectedForIDE.id)} className={`text-[10px] font-bold px-3 py-1 rounded-md border border-border transition-colors ${solvedIds.includes(selectedForIDE.id) ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'text-secondary hover:text-foreground'}`}>
                             <CheckCircle size={14} className="inline mr-2" /> {solvedIds.includes(selectedForIDE.id) ? 'Solved' : 'Pending'}
                           </button>
                        </div>
                      </div>

                      <div className="text-[14px] md:text-[15px] leading-[1.8] opacity-70 space-y-6">
                         <p>Analyze the requirements for this challenge and implement your solution in the IDE. Handle edge cases and ensure your code is optimized for performance.</p>
                         <p>Once you are ready, use the Run Code button to test your logic or Submit your final answer.</p>
                      </div>

                      <div className="pt-4">
                        <a href={`https://leetcode.com/problems/${selectedForIDE.slug}/`} target="_blank" className="solve-btn text-[11px] py-2 px-5">
                          View on LeetCode <ExternalLink size={14} />
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="py-20 text-center opacity-20">Select a problem to begin.</div>
                  )}

                  <div className="pt-12 border-t border-border">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20 mb-8 font-poppins">Next Challenges</h3>
                     <div className="flex flex-col gap-6">
                        {randomQuestions.filter(q => q.id !== selectedForIDE?.id).map(q => (
                          <div key={q.id} onClick={() => setSelectedForIDE(q)} className="group flex flex-col gap-2 cursor-pointer border-l-2 border-transparent hover:border-foreground pl-4 transition-all">
                             <div className="flex items-center justify-between">
                                <span className="text-[14px] font-bold opacity-40 group-hover:opacity-100 transition-opacity">{q.title}</span>
                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-all" />
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px]">
                   <textarea value={notes[selectedForIDE?.slug || ""] || ""} onChange={(e) => { const n = { ...notes, [selectedForIDE?.slug || ""]: e.target.value }; setNotes(n); localStorage.setItem("problem_notes", JSON.stringify(n)); }} placeholder="Enter notes..." className="w-full h-full bg-transparent border-none text-[14px] leading-relaxed outline-none resize-none opacity-60 focus:opacity-100 transition-opacity" />
                </div>
              )}
           </div>
        </div>

        {/* Right: Workspace IDE */}
        <div className="flex-1 flex flex-col bg-panel rounded-2xl border border-border overflow-hidden relative min-h-[500px]">
           {/* Editor Header */}
           <div className="h-10 bg-card/20 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
              <div className="flex items-center gap-6">
                 <select value={selectedLang.id} onChange={(e) => { const l = LANGUAGES.find(lang => lang.id === e.target.value)!; setSelectedLang(l); setCode(l.template); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-secondary hover:text-foreground">
                    {LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}
                 </select>
                 <div className={`flex items-center gap-2 text-[11px] font-mono font-bold ${isTimerRunning ? 'text-foreground' : 'opacity-20'}`}>
                   <Timer size={14} /> {formatTime(time)}
                 </div>
              </div>
              <div className="flex items-center gap-4 text-secondary">
                 <button onClick={() => setCode(selectedLang.template)} className="hover:text-foreground transition-colors"><RotateCcw size={14}/></button>
              </div>
           </div>

           {/* Editor Core */}
           <div className="flex-1 flex relative overflow-hidden">
              <div className="w-10 md:w-12 bg-card/10 border-r border-border flex flex-col items-center py-6 font-mono text-[11px] opacity-10 select-none shrink-0">
                 {[...Array(50)].map((_, i) => <span key={i} className="leading-6">{i + 1}</span>)}
              </div>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} className="flex-1 bg-transparent text-foreground font-mono text-[13px] md:text-[14px] p-4 md:p-6 outline-none resize-none leading-6 placeholder:opacity-5 w-0" spellCheck={false} />
           </div>

           {/* Action Console */}
           <div className={`transition-all duration-300 ease-in-out border-t border-border bg-panel overflow-hidden shrink-0 ${isConsoleOpen ? 'h-[240px] md:h-[300px]' : 'h-0'}`}>
              <div className="h-10 bg-card/20 border-b border-border flex px-4 gap-4 items-center">
                 <button onClick={() => setConsoleTab("testcase")} className={`h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === "testcase" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Testcase</button>
                 <button onClick={() => setConsoleTab("result")} className={`h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === "result" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Result</button>
                 <button onClick={() => setIsConsoleOpen(false)} className="ml-auto text-secondary hover:text-foreground"><ChevronDown size={14} /></button>
              </div>
              <div className="p-6 h-[calc(100%-40px)] overflow-y-auto custom-scrollbar">
                 {consoleTab === "testcase" ? (
                   <div className="space-y-4">
                      <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Parameters</div>
                      <div className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] opacity-60">data = mock_set_01</div>
                   </div>
                 ) : (
                   <div className="space-y-6">
                      {isRunning ? (
                        <div className="flex flex-col items-center justify-center h-20 gap-3">
                           <RefreshCcw size={18} className="animate-spin opacity-20" />
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Processing...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <div className={`text-[16px] font-bold ${output ? 'text-green-500' : 'text-amber-500'}`}>{output ? 'Accepted' : 'Run Pending'}</div>
                           <div className="bg-card/50 p-4 rounded-2xl border border-border">
                              <pre className="font-mono text-[13px] text-foreground/80">{output || 'No output recorded.'}</pre>
                           </div>
                        </div>
                      )}
                   </div>
                 )}
              </div>
           </div>

           {/* Footer Action Bar - Responsive */}
           <div className="h-14 bg-panel border-t border-border flex items-center justify-between px-3 md:px-4 shrink-0">
              <button 
                onClick={() => setIsConsoleOpen(!isConsoleOpen)} 
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary hover:text-foreground px-2 py-1.5 transition-colors"
              >
                Console {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              <div className="flex items-center gap-2 shrink-0">
                 <button onClick={runCode} disabled={isRunning} className="px-4 md:px-6 py-2 rounded-xl border border-border hover:bg-card transition-all text-[10px] font-black uppercase tracking-widest text-secondary hover:text-foreground">Run</button>
                 <button className="px-4 md:px-6 py-2 rounded-xl bg-foreground text-background font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90 flex items-center gap-2 shadow-xl active:scale-95">Submit <Send size={14} /></button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
