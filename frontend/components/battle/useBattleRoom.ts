"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BattleMeta, LeaderboardEntry, Question } from "./types";

const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface BattleStartedPayload {
  battle?: {
    battleName?: string;
    roomCode?: string;
    difficulty?: BattleMeta["difficulty"];
    questionCount?: number;
  };
  questions?: Question[];
  timer?: number | string;
}

interface LeaderboardPayload {
  leaderboard?: Array<{ username: string; score?: number }>;
}

export function useBattleRoom(roomCode: string) {
  const mockQuestions = useMemo<Question[]>(
    () => [
      {
        id: "q1",
        title: "Sum of Two Numbers",
        difficulty: "Easy",
        description: "Given two integers, return their sum.",
        examples: ["Input: 1 2 -> Output: 3"],
        constraints: ["-1000 <= a,b <= 1000"],
      },
      {
        id: "q2",
        title: "Reverse String",
        difficulty: "Medium",
        description: "Reverse the characters of a string.",
        examples: ["Input: hello -> Output: olleh"],
        constraints: ["1 <= s.length <= 1000"],
      },
      {
        id: "q3",
        title: "Unique Numbers",
        difficulty: "Hard",
        description: "Return count of unique numbers in an array.",
        examples: ["Input: [1,2,2,3] -> Output: 3"],
        constraints: ["0 <= n <= 10^5"],
      },
    ],
    []
  );

  const [loading] = useState(false);
  const [battleMeta, setBattleMeta] = useState<BattleMeta | null>({
    battleName: "Coding Battle Arena",
    roomCode: roomCode || "UNKNOWN",
    difficulty: "Random",
    totalQuestions: mockQuestions.length,
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [language, setLanguage] = useState("JavaScript");
  const [editorCode, setEditorCode] = useState<string>("// Write your solution here\n");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const socket = io(socketUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("battle-started", (payload: BattleStartedPayload) => {
      if (payload?.battle) {
        const b = payload.battle;
        setBattleMeta((prev) => ({
          battleName: b.battleName || prev?.battleName || "Battle",
          roomCode: b.roomCode || prev?.roomCode || roomCode,
          difficulty: b.difficulty || prev?.difficulty || "Random",
          totalQuestions: b.questionCount || prev?.totalQuestions || mockQuestions.length,
        }));
      }

      if (payload?.questions && Array.isArray(payload.questions)) {
        setQuestions(payload.questions);
      }

      if (payload?.timer != null) {
        setTimeLeft(Number(payload.timer));
      }
    });

    socket.on("leaderboard-updated", (payload: LeaderboardPayload) => {
      if (payload?.leaderboard && Array.isArray(payload.leaderboard)) {
        const normalized = payload.leaderboard.map((p, i) => ({
          rank: i + 1,
          username: p.username,
          score: p.score ?? 0,
        }));
        setLeaderboard(normalized);
      }
    });

    socket.on("battle-ended", (payload: LeaderboardPayload) => {
      if (payload?.leaderboard && Array.isArray(payload.leaderboard)) {
        const normalized = payload.leaderboard.map((p, i) => ({
          rank: i + 1,
          username: p.username,
          score: p.score ?? 0,
        }));
        setLeaderboard(normalized);
      }
    });

    socket.emit("join-room", { roomCode, username: "spectator" });

    return () => {
      socket.off("battle-started");
      socket.off("leaderboard-updated");
      socket.off("battle-ended");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, mockQuestions]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((value) => (value && value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  function handlePrev() {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1));
  }

  function handleNext() {
    setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
  }

  function handleRunCode() {
    console.log("Run code clicked", language, editorCode);
  }

  function handleSubmitCode() {
    console.log("Submit code clicked", language, editorCode);
  }

  return {
    loading,
    battleMeta,
    currentQuestionIndex,
    questions,
    leaderboard,
    timeLeft,
    language,
    editorCode,
    setLanguage,
    setEditorCode,
    handlePrev,
    handleNext,
    handleRunCode,
    handleSubmitCode,
  };
}
