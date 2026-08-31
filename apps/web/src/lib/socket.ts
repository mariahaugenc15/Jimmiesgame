import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api";
import { getStoredToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, { auth: { token: getStoredToken() }, autoConnect: false });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  s.auth = { token: getStoredToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
