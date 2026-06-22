"use client";

import { useParams } from "next/navigation";
import BattleShell from "@/components/battle/BattleShell";
import { useBattleRoom } from "@/components/battle/useBattleRoom";

export default function BattlePage() {
  const params = useParams() as { roomCode?: string };
  const roomCode = params?.roomCode ?? "";

  const {
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
  } = useBattleRoom(roomCode);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading battle room…</div>
      </main>
    );
  }

  return (
    <BattleShell
      battleMeta={battleMeta}
      currentQuestionIndex={currentQuestionIndex}
      totalQuestions={battleMeta?.totalQuestions ?? questions.length}
      timeLeft={timeLeft}
      questions={questions}
      leaderboard={leaderboard}
      language={language}
      code={editorCode}
      onLanguageChange={setLanguage}
      onCodeChange={(value) => setEditorCode(value ?? "")}
      onRun={handleRunCode}
      onSubmit={handleSubmitCode}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
