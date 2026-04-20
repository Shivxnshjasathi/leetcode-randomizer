"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Shuffle, ExternalLink, Sun, Moon, Code, Play, 
  RotateCcw, Timer, CheckCircle, Flame, History, ChevronRight,
  Settings, Terminal as TerminalIcon, Send, ChevronDown, List, BookOpen,
  Clock, Database, ChevronUp, RefreshCcw, X, Search
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
  { id: "js", label: "JavaScript", template: "// JS Solution\nfunction solve() {\n  console.log(\"Hello from JS\");\n}" },
  { id: "py", label: "Python3", template: "# Python Solution\ndef solve():\n    print(\"Hello from Python\")" },
  { id: "cpp", label: "C++", template: "// C++ Solution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello from C++\" << endl;\n    return 0;\n}" },
  { id: "kt", label: "Kotlin", template: "// Kotlin Solution\nfun main() {\n    println(\"Hello from Kotlin\")\n}" }
];

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [randomQuestions, setRandomQuestions] = useState<Question[]>([]);
  const [selectedForIDE, setSelectedForIDE] = useState<Question | null>(null);
  const [difficulty, setDifficulty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leftTab, setLeftTab] = useState<"description" | "notes">("description");
  const [consoleTab, setConsoleTab] = useState<"testcase" | "result" | "terminal">("testcase");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(selectedLang.template);
  const [output, setOutput] = useState("");
  const [rawLogs, setRawLogs] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") document.documentElement.classList.add("dark");

    setSolvedIds(JSON.parse(localStorage.getItem("solved_ids") || "[]"));
    setNotes(JSON.parse(localStorage.getItem("problem_notes") || "{}"));

    const hasSynced = localStorage.getItem("has_synced");
    const syncParam = !hasSynced ? "?sync=true" : "";

    fetch(`/api/questions${syncParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setQuestions(data);
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 3);
          setRandomQuestions(selected);
          setSelectedForIDE(selected[0]);
          if (!hasSynced) localStorage.setItem("has_synced", "true");
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

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

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
      setRawLogs("");
      setIsConsoleOpen(false);
    }
  };

  const runCode = () => {
    setIsRunning(true);
    setIsConsoleOpen(true);
    setConsoleTab("result");
    setOutput("");
    setRawLogs("");
    
    setTimeout(() => {
      const lines = code.split('\n');
      let captured = "";
      lines.forEach(line => {
        const match = line.match(/(?:console\.log|print|println|cout\s*<<)\s*\(?["'](.+?)["']\)?/);
        if (match && match[1]) captured += (captured ? "\n" : "") + match[1];
      });
      setOutput("Accepted");
      setRawLogs(captured || "Execution Success.");
      setIsRunning(false);
    }, 1200);
  };

  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.id.toString().includes(searchQuery)
  );

  if (loading) return <div className="h-screen bg-background flex items-center justify-center text-secondary text-[10px] font-bold uppercase tracking-[0.4em]">env.preparing</div>;

  return (
    <div className="h-screen bg-background text-foreground font-poppins flex flex-col overflow-hidden transition-all relative">
      
      {/* Questions Modal Overlay */}
      {isListOpen && (
        <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-md p-4 md:p-12 animate-in fade-in duration-300">
           <div className="max-w-4xl mx-auto h-full flex flex-col bg-panel border border-border rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                 <div className="flex items-center gap-4 flex-1">
                    <Search size={18} className="text-secondary" />
                    <input 
                       autoFocus
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Search problems by title or ID..." 
                       className="bg-transparent border-none outline-none text-[16px] font-bold w-full placeholder:opacity-20"
                    />
                 </div>
                 <button onClick={() => setIsListOpen(false)} className="p-2 hover:bg-card rounded-xl transition-colors"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                 <div className="grid gap-2">
                    {filteredQuestions.map(q => (
                       <div 
                         key={q.id} 
                         onClick={() => { setSelectedForIDE(q); setIsListOpen(false); }}
                         className="flex items-center justify-between p-4 rounded-2xl hover:bg-card cursor-pointer transition-all border border-transparent hover:border-border group"
                       >
                          <div className="flex items-center gap-4">
                             <span className="text-[12px] font-black opacity-20 w-8">{q.id}</span>
                             <span className="font-bold text-[15px] group-hover:translate-x-1 transition-transform">{q.title}</span>
                          </div>
                          <div className="flex items-center gap-6">
                             <span className={q.difficulty === 1 ? "tag-easy" : q.difficulty === 2 ? "tag-medium" : "tag-hard"}>
                               {q.difficulty === 1 ? "EASY" : q.difficulty === 2 ? "MED" : "HARD"}
                             </span>
                             {solvedIds.includes(q.id) && <CheckCircle size={16} className="text-green-500" />}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Navbar */}
      <header className="h-12 border-b border-border bg-panel flex items-center justify-between px-6 shrink-0 relative z-50">
        <div className="flex items-center gap-10">
           <div className="text-[17px] font-bold tracking-tighter cursor-pointer" onClick={() => randomize()}>
             randomizer<span className="opacity-30">.</span>
           </div>
           <nav className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
             <span onClick={() => setIsListOpen(true)} className="hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors"><List size={14} /> Questions</span>
             <span className="hover:text-foreground cursor-pointer flex items-center gap-2 transition-colors"><Flame size={14} fill="currentColor" className="text-orange-500" /> {solvedIds.length} Solved</span>
           </nav>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 bg-card border border-border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-secondary">
             <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="bg-transparent border-none focus:outline-none cursor-pointer text-foreground">
               <option value={0}>All</option>
               <option value={1}>Easy</option>
               <option value={2}>Med</option>
               <option value={3}>Hard</option>
             </select>
             <button onClick={randomize} className="text-foreground"><Shuffle size={14} /></button>
           </div>
           <button onClick={toggleTheme} className="opacity-40 hover:opacity-100 transition-soft text-secondary">
             {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
           </button>
        </div>
      </header>

      {/* Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 gap-2">
        
        {/* Left: Content Panel */}
        <div className="w-full lg:w-[480px] flex flex-col bg-panel rounded-2xl border border-border overflow-hidden shrink-0">
           <div className="h-10 flex border-b border-border px-4 items-center bg-card/20 shrink-0">
              <button onClick={() => setLeftTab("description")} className={`px-4 h-full flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${leftTab === "description" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Description</button>
              <button onClick={() => setLeftTab("notes")} className={`px-4 h-full flex items-center text-[10px] font-black uppercase tracking-widest transition-all ${leftTab === "notes" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Notes</button>
           </div>

           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {leftTab === "description" ? (
                <div className="space-y-10">
                  {selectedForIDE && (
                    <>
                      <div className="space-y-6">
                        <h1 className="text-[26px] font-bold tracking-tight leading-tight">{selectedForIDE.id}. {selectedForIDE.title}</h1>
                        <div className="flex items-center gap-3">
                           <span className={selectedForIDE.difficulty === 1 ? "tag-easy" : selectedForIDE.difficulty === 2 ? "tag-medium" : "tag-hard"}>
                             {selectedForIDE.difficulty === 1 ? "EASY" : selectedForIDE.difficulty === 2 ? "MEDIUM" : "HARD"}
                           </span>
                           <button onClick={() => { const newSolved = solvedIds.includes(selectedForIDE.id) ? solvedIds.filter(i => i !== selectedForIDE.id) : [...solvedIds, selectedForIDE.id]; setSolvedIds(newSolved); localStorage.setItem("solved_ids", JSON.stringify(newSolved)); }} className={`text-[10px] font-bold px-3 py-1 rounded-md border border-border transition-colors ${solvedIds.includes(selectedForIDE.id) ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'text-secondary hover:text-foreground'}`}>
                             <CheckCircle size={14} className="inline mr-2" /> {solvedIds.includes(selectedForIDE.id) ? 'Solved' : 'Not Solved'}
                           </button>
                        </div>
                      </div>

                      <div className="text-[14px] leading-[1.8] opacity-70 space-y-8">
                         <p>Analyze the requirements for this challenge and implement your solution in the IDE. Handle edge cases and ensure your code is optimized for performance.</p>
                         <div className="space-y-4 pt-4 border-t border-border/50">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">INSTRUCTIONS:</h4>
                            <ul className="list-none space-y-4 text-[13px]">
                               <li className="flex gap-3"><span className="text-foreground opacity-20">01.</span> <span className="opacity-60 underline underline-offset-4 decoration-white/5">Analyze Complexity</span>: Consider time and space constraints.</li>
                               <li className="flex gap-3"><span className="text-foreground opacity-20">02.</span> <span className="opacity-60 underline underline-offset-4 decoration-white/5">Draft Solution</span>: Write logic and use the console for logging.</li>
                               <li className="flex gap-3"><span className="text-foreground opacity-20">03.</span> <span className="opacity-60 underline underline-offset-4 decoration-white/5">Verify Output</span>: Ensure output matches expectations in terminal.</li>
                               <li className="flex gap-3"><span className="text-foreground opacity-20">04.</span> <span className="opacity-60 underline underline-offset-4 decoration-white/5">Final Submit</span>: Click submit once all cases are validated.</li>
                            </ul>
                         </div>
                      </div>

                      <div className="pt-6 border-t border-border">
                        <a href={`https://leetcode.com/problems/${selectedForIDE.slug}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground text-[12px] font-bold hover:underline">
                          Open in LeetCode <ExternalLink size={14} />
                        </a>
                      </div>
                    </>
                  )}

                  <div className="pt-10 border-t border-border">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20 mb-8 font-poppins">Recommended next</h3>
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
                <div className="h-full">
                   <textarea value={notes[selectedForIDE?.slug || ""] || ""} onChange={(e) => { const n = { ...notes, [selectedForIDE?.slug || ""]: e.target.value }; setNotes(n); localStorage.setItem("problem_notes", JSON.stringify(n)); }} placeholder="Enter notes..." className="w-full h-full bg-transparent border-none text-[14px] leading-relaxed outline-none resize-none opacity-60 focus:opacity-100 transition-opacity" />
                </div>
              )}
           </div>
        </div>

        {/* Right: IDE Workspace */}
        <div className="flex-1 flex flex-col bg-panel rounded-2xl border border-border overflow-hidden relative">
           <div className="h-10 bg-card/20 border-b border-border flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-8">
                 <select value={selectedLang.id} onChange={(e) => { const l = LANGUAGES.find(lang => lang.id === e.target.value)!; setSelectedLang(l); setCode(l.template); }} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-secondary hover:text-foreground">
                    {LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-background">{l.label}</option>)}
                 </select>
                 <div className={`flex items-center gap-2 text-[11px] font-mono font-bold ${isTimerRunning ? 'text-foreground' : 'opacity-20'}`} onClick={() => setIsTimerRunning(!isTimerRunning)}>
                   <Timer size={14} /> {formatTime(time)}
                 </div>
              </div>
              <div className="flex items-center gap-4 text-secondary">
                 <button onClick={() => setCode(selectedLang.template)} className="hover:text-foreground transition-colors"><RotateCcw size={14}/></button>
                 <button className="hover:text-foreground"><Settings size={16}/></button>
              </div>
           </div>

           <div className="flex-1 flex relative overflow-hidden">
              <div className="w-12 bg-card/10 border-r border-border flex flex-col items-center py-6 font-mono text-[11px] opacity-10 select-none">
                 {[...Array(50)].map((_, i) => <span key={i} className="leading-6">{i + 1}</span>)}
              </div>
              <textarea value={code} onChange={(e) => setCode(e.target.value)} className="flex-1 bg-transparent text-foreground font-mono text-[14px] p-6 outline-none resize-none leading-6 placeholder:opacity-5" spellCheck={false} />
           </div>

           <div className={`transition-all duration-300 ease-in-out border-t border-border bg-panel overflow-hidden shrink-0 ${isConsoleOpen ? 'h-[280px]' : 'h-0'}`}>
              <div className="h-10 bg-card/20 border-b border-border flex px-4 gap-4 items-center">
                 <button onClick={() => setConsoleTab("testcase")} className={`h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === "testcase" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Testcase</button>
                 <button onClick={() => setConsoleTab("result")} className={`h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === "result" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Result</button>
                 <button onClick={() => setConsoleTab("terminal")} className={`h-full px-2 text-[10px] font-black uppercase tracking-widest transition-all ${consoleTab === "terminal" ? 'text-foreground border-b-2 border-foreground' : 'text-secondary'}`}>Terminal</button>
                 <button onClick={() => setIsConsoleOpen(false)} className="ml-auto text-secondary hover:text-foreground"><ChevronDown size={14} /></button>
              </div>
              
              <div className="p-6 h-[calc(100%-40px)] overflow-y-auto custom-scrollbar">
                 {consoleTab === "testcase" ? (
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-widest"><TerminalIcon size={14} /> Parameters</div>
                      <div className="bg-card p-4 rounded-xl border border-border font-mono text-[13px] opacity-60">nums = [2, 7, 11, 15]<br/>target = 9</div>
                   </div>
                 ) : consoleTab === "result" ? (
                   <div className="space-y-6">
                      {isRunning ? (
                        <div className="flex flex-col items-center justify-center h-20 gap-4">
                           <RefreshCcw size={20} className="animate-spin opacity-20" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                           <div className={`text-[18px] font-bold ${rawLogs ? 'text-green-500' : 'text-amber-500'}`}>{rawLogs ? 'Accepted' : 'Pending'}</div>
                           <div className="flex gap-4">
                              <div className="flex-1 bg-card/50 p-4 rounded-xl border border-border">
                                 <div className="text-[10px] font-black uppercase tracking-widest opacity-20 mb-2">Runtime</div>
                                 <div className="font-mono text-[13px] text-foreground/60">{rawLogs ? '0ms' : '--'}</div>
                              </div>
                           </div>
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="h-full bg-black/40 rounded-xl p-5 border border-white/5 font-mono text-[12px] text-green-500/80 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{rawLogs || "No output found."}</pre>
                   </div>
                 )}
              </div>
           </div>

           <div className="h-12 bg-panel border-t border-border flex items-center justify-between px-4 shrink-0 transition-all">
              <button 
                onClick={() => setIsConsoleOpen(!isConsoleOpen)} 
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-secondary hover:text-foreground px-4 py-1.5 transition-colors"
              >
                Console {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              <div className="flex items-center gap-3 pr-2">
                 <button onClick={runCode} disabled={isRunning} className="px-5 py-2 rounded-lg border border-border hover:bg-card transition-all text-[10px] font-black uppercase tracking-widest hover:text-foreground text-secondary">
                   {isRunning ? 'Running' : 'Run'}
                 </button>
                 <button className="px-5 py-2 rounded-lg bg-foreground text-background font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90 flex items-center gap-2 shadow-xl shadow-foreground/5 active:scale-95">
                   Submit <Send size={14} />
                 </button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
