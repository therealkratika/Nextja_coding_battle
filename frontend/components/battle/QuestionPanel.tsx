"use client";

import { Question } from "./types";

interface QuestionPanelProps {
  question: Question | null;
}

export default function QuestionPanel({ question }: QuestionPanelProps) {
  return (
    <aside className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-auto">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            {question?.title ?? "No question loaded"}
          </h3>
          {question ? (
            <span className="text-xs px-2 py-1 rounded border border-zinc-700">
              {question.difficulty}
            </span>
          ) : null}
        </div>
      </div>

      {question ? (
        <div className="space-y-5 text-sm text-zinc-300">
          <div className="space-y-3">
            <p className="whitespace-pre-wrap">{question.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-400 mb-2">Examples</h4>
            <div className="space-y-2">
              {question.examples?.map((example, index) => (
                <div key={index} className="bg-zinc-900 p-3 rounded text-sm space-y-2">
                  {typeof example === "string" ? (
                    <div>{example}</div>
                  ) : (
                    <>
                      <div>
                        <strong>Input:</strong> {example.input}
                      </div>
                      <div>
                        <strong>Output:</strong> {example.output}
                      </div>
                      {example.explanation ? (
                        <div className="text-zinc-400">
                          <strong>Explanation:</strong> {example.explanation}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-zinc-400 mb-2">Constraints</h4>
            <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
              {question.constraints?.map((constraint, index) => (
                <li key={index}>{constraint}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-zinc-500 text-sm">
          Waiting for the server to provide the next coding challenge.
        </div>
      )}
    </aside>
  );
}
