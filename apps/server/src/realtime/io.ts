import type { Server } from "socket.io";
import type { GameState } from "@lockedin/shared";

let ioInstance: Server | null = null;

export function setIo(io: Server) {
  ioInstance = io;
}

export function broadcastMatchState(matchId: string, state: GameState) {
  ioInstance?.to(matchRoom(matchId)).emit("match:state", state);
}

export function matchRoom(matchId: string) {
  return `match:${matchId}`;
}
