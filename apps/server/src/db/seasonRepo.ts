import { db } from "./client.js";

/** The app currently runs one active season at a time: the most recently created one. */
export async function getActiveSeason() {
  return db.query.seasons.findFirst({ orderBy: (s, { desc }) => [desc(s.year)] });
}
