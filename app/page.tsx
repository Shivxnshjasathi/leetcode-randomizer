"use client";

import { useState, useEffect } from "react";
import { Shuffle, ExternalLink, Sun, Moon, Code, Play, RotateCcw } from "lucide-react";

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
  { id: "kt", label: "Kotlin", template: "// Kotlin Solution\nfun main() {\n    \n}" },
  { id: "java", label: "Java", template: "// Java Solution\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}" }
];

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [randomQuestion, setRandomQuestion] = useState<Question | null>(null);
  const [difficulty, setDifficulty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showCompiler, setShowCompiler] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(selectedLang.template);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    if (initialTheme === "dark") document.documentElement.classList.add("dark");

    fetch("/api/questions")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setQuestions(data);
        setLoading(false);
      });
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const randomize = () => {
    let filtered = questions;
    if (difficulty !== 0) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    if (filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      setRandomQuestion(filtered[randomIndex]);
      setCode(selectedLang.template);
      setOutput("");
    }
  };

  const runCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      const lines = code.split('\n');
      let captured = "";
      lines.forEach(line => {
        const match = line.match(/(?:console\.log|print|cout\s*<<)\s*\(?["'](.+)["']\)?/);
        if (match && match[1]) captured += (captured ? "\n" : "") + match[1];
      });
      setOutput(`[${selectedLang.label}] result:\n${captured || "Process finished with exit code 0"}`);
      setIsRunning(false);
    }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-secondary text-[10px] font-bold uppercase tracking-[0.4em] font-poppins">
        syncing.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-300 font-poppins flex flex-col items-center">
      {/* Simple Header */}
      <nav className="w-full max-w-5xl px-6 py-8 flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="text-xl font-bold tracking-tighter cursor-pointer" onClick={() => setShowCompiler(false)}>
          randomizer<span className="opacity-30">.</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-10 text-[13px] font-medium">
          <button
            onClick={() => setShowCompiler(!showCompiler)}
            className={`flex items-center gap-2 transition-soft ${showCompiler ? 'text-foreground' : 'opacity-40 hover:opacity-100'}`}
          >
            <Code size={16} /> compiler
          </button>
          <button onClick={toggleTheme} className="opacity-40 hover:opacity-100 transition-soft">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl w-full px-6 flex flex-col items-center gap-10 mt-8 pb-20">
        {/* Centered Controls */}
        <section className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-3">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="flex-1 w-full bg-card border border-border px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none transition-soft cursor-pointer text-foreground"
          >
            <option value={0}>all difficulties</option>
            <option value={1}>easy</option>
            <option value={2}>medium</option>
            <option value={3}>hard</option>
          </select>
          <button
            onClick={randomize}
            className="w-full sm:w-auto bg-foreground text-background px-10 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-foreground/5"
          >
            randomize
          </button>
        </section>

        {/* Integrated Question + IDE Section */}
        <div className={`w-full flex flex-col gap-10 ${showCompiler ? 'lg:flex-row lg:items-start' : 'items-center'}`}>

          {/* Question Card */}
          <div className={`${showCompiler ? 'lg:w-[350px] shrink-0 text-left' : 'w-full max-w-xl text-center'} flex flex-col transition-all`}>
            {randomQuestion ? (
              <div className={`flex flex-col ${showCompiler ? 'items-start' : 'items-center'} gap-8`}>
                <div className="flex items-center gap-3">
                  <span className="tag-id">#{randomQuestion.id}</span>
                  <span className={
                    randomQuestion.difficulty === 1 ? "tag-easy" :
                      randomQuestion.difficulty === 2 ? "tag-medium" :
                        "tag-hard"
                  }>
                    {randomQuestion.difficulty === 1 ? "EASY" :
                      randomQuestion.difficulty === 2 ? "MEDIUM" :
                        "HARD"}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-20 ml-2">
                    {randomQuestion.acceptance}% rate
                  </span>
                </div>

                <h2 className={`font-bold tracking-tighter leading-tight text-foreground transition-all ${showCompiler ? 'text-2xl' : 'text-3xl md:text-5xl'}`}>
                  {randomQuestion.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href={`https://leetcode.com/problems/${randomQuestion.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="solve-btn group"
                  >
                    Solve Problem <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                  {!showCompiler && (
                    <button onClick={() => setShowCompiler(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-colors">
                      <Code size={14} /> Practice Mode
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-20 opacity-20">
                <Shuffle size={32} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">select difficulty</p>
              </div>
            )}
          </div>

          {/* Compiler Mode - Simple Aesthetic */}
          {showCompiler && randomQuestion && (
            <div className="flex-1 flex flex-col bg-[#0d1117] rounded-[2.5rem] border border-border/10 overflow-hidden shadow-2xl min-h-[550px] lg:sticky lg:top-32">
              <div className="h-14 bg-black/40 flex items-center justify-between px-6 border-b border-white/5">
                <select
                  value={selectedLang.id}
                  onChange={(e) => {
                    const l = LANGUAGES.find(lang => lang.id === e.target.value)!;
                    setSelectedLang(l);
                    setCode(l.template);
                  }}
                  className="bg-transparent border-none text-[10px] font-black text-white/40 uppercase tracking-widest outline-none cursor-pointer"
                >
                  {LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-[#0d1117]">{l.label}</option>)}
                </select>
                <div className="flex items-center gap-3">
                  <button onClick={() => setCode(selectedLang.template)} className="text-white/20 hover:text-white transition-colors">
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={runCode}
                    disabled={isRunning}
                    className="flex items-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all active:scale-95"
                  >
                    {isRunning ? "Running..." : "Run"} <Play size={10} fill="currentColor" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative flex overflow-hidden">
                <div className="w-12 bg-black/5 text-white/5 text-[10px] font-mono flex flex-col items-center py-6 select-none border-r border-white/5">
                  {[...Array(40)].map((_, i) => <span key={i} className="leading-6">{i + 1}</span>)}
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 bg-transparent text-[#e0e0e0] font-mono text-sm p-6 outline-none resize-none leading-6"
                  spellCheck={false}
                  placeholder="// Your logic here..."
                />
              </div>

              {output && (
                <div className="h-32 bg-black text-white/80 p-6 font-mono text-[11px] border-t border-white/5 animate-in slide-in-from-bottom duration-300">
                  <div className="text-green-500 font-black uppercase tracking-widest text-[9px] mb-2">Result</div>
                  <pre className="whitespace-pre-wrap">{output}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
