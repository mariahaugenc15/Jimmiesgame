import "dotenv/config";

function required(name: string, fallback?: string): string {
  // || rather than ?? so a variable saved as an empty string in the hosting
  // dashboard also falls back, instead of silently passing "" through as if
  // it were a real value (bit us for DATABASE_URL, CORS_ORIGIN, and
  // VITE_API_URL already - this closes the same gap for every var read here).
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  // Vercel's own Postgres integration auto-injects POSTGRES_URL (not DATABASE_URL)
  // when you connect a database from the Storage tab, so accept either name.
  databaseUrl: required(
    "DATABASE_URL",
    process.env.POSTGRES_URL || "postgres://jimmiesgame:jimmiesgame@localhost:5432/jimmiesgame",
  ),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  statsProvider: process.env.STATS_PROVIDER || "mock",
  // The deployed frontend's real address is the fallback (not localhost) so
  // production CORS keeps working even if the CORS_ORIGIN var set in the
  // hosting dashboard doesn't reach the running process for some reason.
  // Uses || rather than ?? so a var saved as an empty string also falls
  // back, instead of silently locking out every origin (see api.ts on the
  // frontend for the same bug, which this mirrors).
  corsOrigin: process.env.CORS_ORIGIN || "https://jimmiesgame-web.vercel.app",
};
