/**
 * Battle Arena API Client
 * Handles all communication with the backend server
 */

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const API_ENDPOINT = `${API_BASE_URL}/api/battle`;
const QUESTION_ENDPOINT = `${API_BASE_URL}/api/questions`;
const SUBMISSION_ENDPOINT = `${API_BASE_URL}/api/submission`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Player {
  username: string;
  socketId: string;
  ready: boolean;
  score: number;
}

export interface Battle {
  _id: string;
  battleName: string;
  roomCode: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Random";
  questionCount: number;
  timeLimit: number;
  maxPlayers: number;
  host: string;
  players: Player[];
  status: "waiting" | "active" | "completed";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  questions?: string[];
  currentQuestion?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface QuestionPayload {
  id: string;
  title: string;
  slug?: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Random";
  description: string;
  examples?: string[];
  constraints?: string[];
  starterCode?: Record<string, string>;
  supportedLanguages?: string[];
  tags?: string[];
}

export interface SubmissionPayload {
  submission: {
    _id: string;
    verdict: string;
    executionTime: number;
    memoryUsed: number;
    points: number;
    stdout: string;
    stderr: string;
  };
  verdict: string;
  passedTests: number;
  totalTests: number;
  executionTime: number;
  memoryUsed: number;
  results: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    stderr: string;
    stdout: string;
  }>;
  leaderboard: Array<{ username: string; score: number }>;
}

// ─── Error Handling ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public serverMessage?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Request Helper ───────────────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = API_ENDPOINT
): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.message || "An error occurred while making the request",
        data.message
      );
    }

    return data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        "Cannot reach the server. Make sure the backend is running.",
        "Network error"
      );
    }

    // Handle unexpected errors
    throw new ApiError(500, "An unexpected error occurred", String(error));
  }
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Create a new battle room
 * @param battleName - Name of the battle
 * @param username - Username of the battle creator
 * @param difficulty - Difficulty level
 * @param questionCount - Number of questions
 * @param timeLimit - Time limit per question
 * @param maxPlayers - Maximum players allowed
 * @returns Battle data with room code
 */
export async function createBattle(
  battleName: string,
  username: string,
  difficulty: "Easy" | "Medium" | "Hard" | "Random" = "Easy",
  questionCount: number = 3,
  timeLimit: number = 30,
  maxPlayers: number = 4
): Promise<Battle> {
  const response = await apiRequest<ApiResponse<Battle>>("/create", {
    method: "POST",
    body: JSON.stringify({
      battleName,
      username,
      difficulty,
      questionCount,
      timeLimit,
      maxPlayers,
    }),
  });

  if (!response.data) {
    throw new ApiError(500, "No battle data returned from server");
  }

  return response.data;
}

/**
 * Join an existing battle room
 * @param roomCode - The room code to join
 * @param username - Username of the player
 * @returns Battle data
 */
export async function joinBattle(
  roomCode: string,
  username: string
): Promise<Battle> {
  const response = await apiRequest<ApiResponse<Battle>>("/join", {
    method: "POST",
    body: JSON.stringify({
      roomCode: roomCode.toUpperCase(),
      username: username.trim(),
    }),
  });

  if (!response.data) {
    throw new ApiError(500, "No battle data returned from server");
  }

  return response.data;
}

/**
 * Get battle details by room code
 * @param roomCode - The room code to fetch
 * @returns Battle data
 */
export async function getBattle(roomCode: string): Promise<Battle> {
  const response = await apiRequest<ApiResponse<Battle>>(
    `/${roomCode.toUpperCase()}`,
    {
      method: "GET",
    }
  );

  if (!response.data) {
    throw new ApiError(500, "No battle data returned from server");
  }

  return response.data;
}

/**
 * Leave a battle room
 * @param roomCode - The room code to leave
 * @param username - Username of the player leaving
 * @returns Success response
 */
export async function leaveBattle(
  roomCode: string,
  username: string
): Promise<void> {
  await apiRequest<ApiResponse<null>>("/leave", {
    method: "POST",
    body: JSON.stringify({
      roomCode: roomCode.toUpperCase(),
      username: username.trim(),
    }),
  });
}

export async function getBattleQuestions(roomCode: string): Promise<QuestionPayload[]> {
  const response = await apiRequest<ApiResponse<QuestionPayload[]>>(
    `/${roomCode.toUpperCase()}/questions`,
    { method: "GET" },
    API_ENDPOINT
  );

  if (!response.data) {
    throw new ApiError(500, "No questions returned from server");
  }

  return response.data;
}

export async function submitBattleCode(payload: {
  roomCode: string;
  questionId: string;
  username: string;
  language: string;
  code: string;
}): Promise<SubmissionPayload> {
  const response = await apiRequest<ApiResponse<SubmissionPayload>>("/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, SUBMISSION_ENDPOINT);

  if (!response.data) {
    throw new ApiError(500, "No submission result returned from server");
  }

  return response.data;
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

/**
 * Store username in sessionStorage
 */
export function storeUsername(username: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("username", username);
  }
}

/**
 * Get username from sessionStorage
 */
export function getStoredUsername(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("username");
  }
  return null;
}

/**
 * Clear stored username
 */
export function clearStoredUsername(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("username");
  }
}

/**
 * Store room code in sessionStorage
 */
export function storeRoomCode(roomCode: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("roomCode", roomCode);
  }
}

/**
 * Get room code from sessionStorage
 */
export function getStoredRoomCode(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("roomCode");
  }
  return null;
}

/**
 * Clear stored room code
 */
export function clearStoredRoomCode(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("roomCode");
  }
}
