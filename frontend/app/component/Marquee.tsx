"use client";

import React from "react";

const TOPICS = [
  "O(n log n)",
  "Two Pointers",
  "Segment Tree",
  "DP on Trees",
  "BFS · DFS",
  "Suffix Array",
  "Convex Hull",
  "FFT",
  "Dijkstra",
  "Topological Sort",
];

export default function Marquee() {
  // Repeating the array to fill the width for a seamless infinite loop
  const repeatedTopics = Array(4).fill(TOPICS).flat();

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/5 py-3 overflow-hidden bg-white/[0.02]">
        <div
          className="flex whitespace-nowrap text-xs text-white/15 font-mono"
          style={{ animation: "marquee-slide 28s linear infinite" }}
        >
          {repeatedTopics.map((topic, i) => (
            <span key={i} className="mx-8">
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Scoped style for the marquee keyframes */}
      <style>{`
        @keyframes marquee-slide {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}