import { statsProvider } from "../stats-provider/index.js";
import { db, pool } from "./client.js";
import { nflPlayers, seasons } from "./schema.js";

async function main() {
  const players = await statsProvider.listActivePlayers();

  for (const player of players) {
    await db
      .insert(nflPlayers)
      .values({
        id: player.id,
        name: player.name,
        realNflTeam: player.realNflTeam,
        position: player.position,
        externalId: player.externalId,
        jerseyNumber: player.jerseyNumber,
      })
      .onConflictDoNothing({ target: nflPlayers.externalId });
  }
  console.log(`Seeded ${players.length} NFL players.`);

  const year = new Date().getFullYear();
  const existing = await db.query.seasons.findFirst({ where: (s, { eq }) => eq(s.year, year) });
  if (!existing) {
    await db.insert(seasons).values({
      year,
      startDate: new Date(),
      draftLockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentWeek: 1,
    });
    console.log(`Created season ${year}.`);
  } else {
    console.log(`Season ${year} already exists.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
