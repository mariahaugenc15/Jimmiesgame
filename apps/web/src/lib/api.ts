import type { DefensivePlay, GameState, OffensivePlay, PlayerRating, PlayResult } from "@lockedin/shared";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  return localStorage.getItem("lockedin_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("lockedin_token", token);
  else localStorage.removeItem("lockedin_token");
}

export function getStoredToken() {
  return getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(typeof body.error === "string" ? body.error : JSON.stringify(body.error), res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  signup: (username: string, email: string, password: string) =>
    request<{ token: string; userId: string; username: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; userId: string; username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; username: string; email: string; skillRating: number }>("/api/auth/me"),

  seasons: () => request<{ id: string; year: number; startDate: string; draftLockDate: string; currentWeek: number }[]>(
    "/api/seasons",
  ),
  myTeams: () => request<{ id: string; name: string; seasonId: string; lockedAt: string | null }[]>("/api/teams/mine"),
  createTeam: (name: string, seasonId: string) =>
    request<{ id: string; name: string }>("/api/teams", { method: "POST", body: JSON.stringify({ name, seasonId }) }),
  getTeam: (teamId: string) => request<{ id: string; name: string }>(`/api/teams/${teamId}`),

  runSoloDraft: (teamId: string, seasonId: string, botCount = 5) =>
    request<{ draftId: string; yourRoster: unknown[]; botTeamIds: string[] }>("/api/drafts/solo", {
      method: "POST",
      body: JSON.stringify({ teamId, seasonId, botCount }),
    }),
  roster: (teamId: string) =>
    request<{ nflPlayerId: string; rosterPosition: string; draftRound: number; player: { name: string; position: string; realNflTeam: string } | null }[]>(
      `/api/drafts/teams/${teamId}/roster`,
    ),
  lockTeam: (teamId: string) => request<{ id: string; lockedAt: string }>("/api/drafts/lock", {
    method: "POST",
    body: JSON.stringify({ teamId }),
  }),
  swapPlayer: (teamId: string, dropPlayerId: string, addPlayerId: string) =>
    request<{ dropped: string; added: string }>("/api/drafts/swap", {
      method: "POST",
      body: JSON.stringify({ teamId, dropPlayerId, addPlayerId }),
    }),

  players: () => request<{ id: string; name: string; position: string; realNflTeam: string; rating: PlayerRating | null }[]>(
    "/api/players",
  ),

  createMatch: (homeTeamId: string, awayTeamId: string, week = 1) =>
    request<{ id: string }>("/api/matches", { method: "POST", body: JSON.stringify({ homeTeamId, awayTeamId, week }) }),
  startMatch: (matchId: string) => request<GameState>(`/api/matches/${matchId}/start`, { method: "POST" }),
  getMatchState: (matchId: string) => request<GameState>(`/api/matches/${matchId}/state`),
  submitPlayCall: (matchId: string, teamId: string, play: OffensivePlay | DefensivePlay) =>
    request<{ resolved: boolean; state: GameState; playResult?: PlayResult; gameOver?: boolean }>(
      `/api/matches/${matchId}/playcall`,
      { method: "POST", body: JSON.stringify({ teamId, play }) },
    ),

  joinMatchmaking: (teamId: string) =>
    request<{ status: "waiting" | "matched"; queueSize?: number; match?: { id: string } }>("/api/matchmaking/join", {
      method: "POST",
      body: JSON.stringify({ teamId }),
    }),

  createLeague: (name: string, isPrivate = true) =>
    request<{ id: string; name: string }>("/api/leagues", { method: "POST", body: JSON.stringify({ name, isPrivate }) }),
  joinLeague: (leagueId: string, teamId: string) =>
    request<unknown>(`/api/leagues/${leagueId}/join`, { method: "POST", body: JSON.stringify({ teamId }) }),
  standings: (leagueId: string) =>
    request<{ teamId: string; teamName: string; wins: number; losses: number; ties: number }[]>(
      `/api/leagues/${leagueId}/standings`,
    ),
  globalLeaderboard: () =>
    request<{ userId: string; username: string; skillRating: number }[]>("/api/leagues/leaderboard/global"),
};

export { API_BASE };
