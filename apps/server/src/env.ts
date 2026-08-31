import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  // Vercel's own Postgres integration auto-injects POSTGRES_URL (not DATABASE_URL)
  // when you connect a database from the Storage tab, so accept either name.
  databaseUrl: required(
    "DATABASE_URL",
    process.env.POSTGRES_URL ?? "postgres://jimmiesgame:jimmiesgame@localhost:5432/jimmiesgame",
  ),
  jwtSecret: required("JWT_SECRET", "dev-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  statsProvider: process.env.STATS_PROVIDER ?? "mock",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
