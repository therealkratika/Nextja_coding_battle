"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getBattle, getBattleQuestions, getBattleSubmissions, submitBattleCode } from "@/lib/api";
import {
  BattleMeta,
  LeaderboardEntry,
  PlayerSubmissions,
  PlayerSubmission,
  Question,
} from "./types";

const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface BattleStartedPayload {
  battle?: {
    battleName?: string;
    roomCode?: string;
    difficulty?: BattleMeta["difficulty"];
    questionCount?: number;
    startedAt?: string;
    endsAt?: string;
  };
}

interface LeaderboardPayload {
  leaderboard?: Array<{ username: string; score?: number; solvedCount?: number }>;
}

interface SubmissionPayload {
  verdict?: string;
  executionTime?: number;
  memoryUsed?: number;
  passedTests?: number;
  totalTests?: number;
  results?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    stderr: string;
    stdout: string;
  }>;
  submission?: {
    verdict?: string;
    executionTime?: number;
    memoryUsed?: number;
    points?: number;
    stdout?: string;
    stderr?: string;
  };
}

export function useBattleRoom(roomCode: string) {
  const [loading, setLoading] = useState(true);
  const [battleMeta, setBattleMeta] = useState<BattleMeta | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [language, setLanguage] = useState("JavaScript");
  const [editorCode, setEditorCodeState] = useState<string>("// Write your solution here\n");
  const [submissionResult, setSubmissionResult] = useState<SubmissionPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBattleEnded, setIsBattleEnded] = useState(false);
  const [battleSummary, setBattleSummary] = useState<{ winner?: string; message?: string } | null>(null);
  const [peerReviewPlayers, setPeerReviewPlayers] = useState<PlayerSubmissions[]>([]);
  const [peerReviewAllowed, setPeerReviewAllowed] = useState(false);
  const [peerReviewLoading, setPeerReviewLoading] = useState(false);
  const [peerReviewError, setPeerReviewError] = useState<string | null>(null);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [selectedReviewSubmission, setSelectedReviewSubmission] = useState<PlayerSubmission | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const currentQuestion = questions[currentQuestionIndex] ?? null;

  const getStorageKey = (questionId?: string, selectedLanguage = language) =>
    `battle:${roomCode}:question:${questionId ?? "default"}:${selectedLanguage}`;

  const persistCode = (value: string, questionId?: string, selectedLanguage = language) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getStorageKey(questionId, selectedLanguage), value);
  };

  const restoreCode = (questionId?: string, selectedLanguage = language) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(getStorageKey(questionId, selectedLanguage));
  };

  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    async function bootstrapBattle() {
      try {
        const battle = await getBattle(roomCode);
        if (cancelled) return;

        setBattleMeta({
          battleName: battle.battleName,
          roomCode: battle.roomCode,
          difficulty: battle.difficulty,
          totalQuestions: battle.questionCount,
        });

        if (battle.status === "active" && battle.startedAt) {
          const endsAt = new Date(battle.endedAt || Date.now()).getTime();
          const secondsLeft = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
          setTimeLeft(secondsLeft);
          setIsBattleEnded(false);
        }

        const fetchedQuestions = await getBattleQuestions(roomCode);
        if (!cancelled) {
          setQuestions(fetchedQuestions as Question[]);
        }
      } catch (error) {
        console.error("Failed to bootstrap battle", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrapBattle();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;

    const socket = io(socketUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    const username = typeof window !== "undefined" ? window.sessionStorage.getItem("username") || "spectator" : "spectator";

    async function fetchPeerReview() {
      setPeerReviewLoading(true);
      setPeerReviewError(null);
      try {
        const response = await getBattleSubmissions(roomCode);
        setPeerReviewPlayers(response.players || []);
        setPeerReviewAllowed(!!response.revealAllowed);
        if (response.players && response.players.length > 0) {
          const firstPlayer = response.players[0];
          setSelectedPeer((prev) => prev || firstPlayer.username);
          if (firstPlayer.submissions && firstPlayer.submissions.length > 0) {
            setSelectedReviewSubmission((prev) => prev || firstPlayer.submissions[0]);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load peer review";
        setPeerReviewError(message);
        setPeerReviewAllowed(false);
        setPeerReviewPlayers([]);
      } finally {
        setPeerReviewLoading(false);
      }
    }

    socket.on("battle-started", async (payload: BattleStartedPayload) => {
      if (payload?.battle) {
        const b = payload.battle;
        setBattleMeta((prev) => ({
          battleName: b.battleName || prev?.battleName || "Battle",
          roomCode: b.roomCode || prev?.roomCode || roomCode,
          difficulty: b.difficulty || prev?.difficulty || "Random",
          totalQuestions: b.questionCount || prev?.totalQuestions || 1,
        }));

        if (b.endsAt) {
          const secondsLeft = Math.max(0, Math.floor((new Date(b.endsAt).getTime() - Date.now()) / 1000));
          setTimeLeft(secondsLeft);
        }
      }

      try {
        const fetchedQuestions = await getBattleQuestions(roomCode);
        setQuestions(fetchedQuestions as Question[]);
      } catch (error) {
        console.error("Failed to fetch battle questions", error);
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

    socket.on("battle-ended", (payload: LeaderboardPayload & { message?: string; winner?: string }) => {
      setIsBattleEnded(true);
      setBattleSummary({ winner: payload?.winner, message: payload?.message });
      if (payload?.leaderboard && Array.isArray(payload.leaderboard)) {
        const normalized = payload.leaderboard.map((p, i) => ({
          rank: i + 1,
          username: p.username,
          score: p.score ?? 0,
        }));
        setLeaderboard(normalized);
      }
      fetchPeerReview();
    });

    socket.on("submission-made", (payload: { verdict?: string; submission?: SubmissionPayload["submission"] }) => {
      setSubmissionResult((prev) => ({
        ...(prev || {}),
        verdict: payload?.verdict || prev?.verdict,
        submission: payload?.submission || prev?.submission,
      }));
      fetchPeerReview();
    });

    socket.emit("join-room", { roomCode, username });
    fetchPeerReview();

    return () => {
      socket.off("battle-started");
      socket.off("leaderboard-updated");
      socket.off("battle-ended");
      socket.off("submission-made");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((value) => (value && value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  useEffect(() => {
    if (!roomCode || !currentQuestion?.id) return;

    const saved = restoreCode(currentQuestion.id, language);
    if (saved != null) {
      setEditorCodeState(saved);
      return;
    }

    const starterCode =
      typeof currentQuestion?.starterCode === "object"
        ? currentQuestion.starterCode?.[language] || ""
        : "";

    setEditorCodeState(starterCode || "// Write your solution here\n");
  }, [currentQuestion?.id, language, roomCode]);

  function handlePrev() {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1));
  }

  function handleNext() {
    setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
  }

  function handleCodeChange(value: string | undefined) {
    const nextValue = value ?? "";
    setEditorCodeState(nextValue);
    persistCode(nextValue, currentQuestion?.id, language);
  }

  function handleLanguageChange(nextLanguage: string) {
    setLanguage(nextLanguage);
    const starterCode =
      typeof currentQuestion?.starterCode === "object"
        ? currentQuestion.starterCode?.[nextLanguage] || ""
        : "";
    const saved = restoreCode(currentQuestion?.id, nextLanguage);
    setEditorCodeState(saved ?? starterCode ?? "// Write your solution here\n");
  }
  function handleSelectPeer(username: string) {
    const nextPlayer = peerReviewPlayers.find((player) => player.username === username);
    setSelectedPeer(username);
    if (nextPlayer?.submissions?.length) {
      setSelectedReviewSubmission(nextPlayer.submissions[0]);
    } else {
      setSelectedReviewSubmission(null);
    }
  }

  function handleSelectReviewSubmission(submission: PlayerSubmission) {
    setSelectedReviewSubmission(submission);
  }
  async function handleRunCode() {
    setSubmissionResult({ verdict: "Ready", executionTime: 0, memoryUsed: 0, passedTests: 0, totalTests: 0, results: [] });
  }

  async function handleSubmitCode() {
    if (!roomCode || !currentQuestion?.id || isBattleEnded) return;

    const username = typeof window !== "undefined" ? window.sessionStorage.getItem("username") || "Player" : "Player";
    setIsSubmitting(true);

    try {
      const result = await submitBattleCode({
        roomCode,
        questionId: currentQuestion.id,
        username,
        language,
        code: editorCode,
      });

      setSubmissionResult(result);
    } catch (error) {
      console.error("Submission failed", error);
      setSubmissionResult({ verdict: "Submission Failed" });
    } finally {
      setIsSubmitting(false);
    }
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
    submissionResult,
    isSubmitting,
    isBattleEnded,
    battleSummary,
    peerReviewPlayers,
    peerReviewAllowed,
    peerReviewLoading,
    peerReviewError,
    selectedPeer,
    selectedReviewSubmission,
    currentQuestion,
    setLanguage: handleLanguageChange,
    setEditorCode: handleCodeChange,
    handlePrev,
    handleNext,
    handleRunCode,
    handleSubmitCode,
    handleSelectPeer,
    handleSelectReviewSubmission,
  };
}
