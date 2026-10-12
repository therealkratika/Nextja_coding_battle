"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import BattleShell from "@/components/battle/BattleShell";
import { useBattleRoom } from "@/components/battle/useBattleRoom";

export default function BattlePage() {
  const params = useParams() as { roomCode?: string };
  const roomCode = params?.roomCode ?? "";

  const {
    loading,
    battleError,
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
    setLanguage,
    setEditorCode,
    handlePrev,
    handleNext,
    handleRunCode,
    handleSubmitCode,
    handleSelectPeer,
    handleSelectReviewSubmission,
  } = useBattleRoom(roomCode);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading battle room…</div>
      </main>
    );
  }

  if (battleError) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-zinc-500 text-sm mb-1">Unable to load battle</p>
          <p role="alert" className="text-white text-lg mb-6">{battleError}</p>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Return home
          </Link>
        </div>
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
      submissionResult={submissionResult}
      isSubmitting={isSubmitting}
      isBattleEnded={isBattleEnded}
      battleSummary={battleSummary}
      peerReviewPlayers={peerReviewPlayers}
      peerReviewAllowed={peerReviewAllowed}
      peerReviewLoading={peerReviewLoading}
      peerReviewError={peerReviewError}
      selectedPeer={selectedPeer}
      selectedReviewSubmission={selectedReviewSubmission}
      onSelectPeer={handleSelectPeer}
      onSelectReviewSubmission={handleSelectReviewSubmission}
    />
  );
}
