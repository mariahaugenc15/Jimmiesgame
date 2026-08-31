import type { Server, Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { verifyToken } from "../auth/service.js";
import { db } from "../db/client.js";
import { matches } from "../db/schema.js";
import { getMatchState, submitPlayCall } from "../gameplay/matchRuntime.js";
import { matchRoom, setIo } from "./io.js";

/** Authoritative real-time layer: clients only ever send inputs (playcalls); the server resolves and broadcasts state. */
export function registerSocketHandlers(io: Server) {
  setIo(io);

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token."));
    try {
      (socket.data as { userId?: string }).userId = verifyToken(token).userId;
      next();
    } catch {
      next(new Error("Invalid auth token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("match:join", ({ matchId }: { matchId: string }) => {
      socket.join(matchRoom(matchId));
      const state = getMatchState(matchId);
      if (state) socket.emit("match:state", state);
    });

    socket.on("match:leave", ({ matchId }: { matchId: string }) => {
      socket.leave(matchRoom(matchId));
    });

    socket.on(
      "match:playcall",
      (payload: { matchId: string; teamId: string; play: string }, ack?: (res: unknown) => void) => {
        try {
          const result = submitPlayCall(payload.matchId, payload.teamId, payload.play as never);
          io.to(matchRoom(payload.matchId)).emit("match:state", result.state);
          if (result.playResult) {
            io.to(matchRoom(payload.matchId)).emit("match:play-result", result.playResult);
          }
          if (result.gameOver) {
            void db
              .update(matches)
              .set({
                status: "completed",
                homeScore: result.state.homeScore,
                awayScore: result.state.awayScore,
                completedAt: new Date(),
              })
              .where(eq(matches.id, payload.matchId));
          }
          ack?.({ ok: true, resolved: result.resolved });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error resolving playcall.";
          ack?.({ ok: false, error: message });
          socket.emit("match:error", { error: message });
        }
      },
    );

    socket.on("disconnect", () => {
      // Reconnect handling: clients rejoin the match room and immediately receive
      // the authoritative current state via "match:join", so no server-side
      // cleanup is required on a drop.
    });
  });
}
