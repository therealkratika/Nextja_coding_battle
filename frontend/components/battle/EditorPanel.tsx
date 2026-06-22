"use client";

import Editor from "@monaco-editor/react";

interface EditorPanelProps {
  language: string;
  code: string;
  onLanguageChange: (value: string) => void;
  onCodeChange: (value: string | undefined) => void;
  onRun: () => void;
  onSubmit: () => void;
}

const languageMap: Record<string, string> = {
  JavaScript: "javascript",
  "C++": "cpp",
  Java: "java",
  Python: "python",
};

export default function EditorPanel({
  language,
  code,
  onLanguageChange,
  onCodeChange,
  onRun,
  onSubmit,
}: EditorPanelProps) {
  const editorLanguage = languageMap[language] ?? "javascript";

  return (
    <section className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400">Language</label>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-sm"
          >
            <option>JavaScript</option>
            <option>C++</option>
            <option>Java</option>
            <option>Python</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRun}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Run Code
          </button>
          <button
            onClick={onSubmit}
            className="px-3 py-1 rounded bg-emerald-500 text-black font-medium hover:brightness-95 text-sm"
          >
            Submit Code
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded border border-zinc-800 bg-black/80">
        <Editor
          height="100%"
          defaultLanguage={editorLanguage}
          language={editorLanguage}
          value={code}
          onChange={onCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            tabSize: 2,
          }}
        />
      </div>
    </section>
  );
}
