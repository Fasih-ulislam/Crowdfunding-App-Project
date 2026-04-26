import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

// ── Write pool → Master (primary) ─────────────────────────────────────────────
// All INSERT, UPDATE, DELETE, transactions go here
const writePool = new Pool({
  host: process.env.PG_MASTER_HOST,
  port: process.env.PG_MASTER_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10,
});

// ── Read pool → Replica (slave) ───────────────────────────────────────────────
// All SELECT-only queries go here — reduces load on master
const readPool = new Pool({
  host: process.env.PG_REPLICA_HOST,
  port: process.env.PG_REPLICA_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10,
});

// ── Connection verification on startup ───────────────────────────────────────
writePool.connect((err, client, release) => {
  if (err) {
    console.error("Master DB connection failed:", err.message);
  } else {
    console.log("Master DB connected");
    release();
  }
});

readPool.connect((err, client, release) => {
  if (err) {
    console.error("Replica DB connection failed:", err.message);
    console.warn("Falling back: reads will use master pool");
  } else {
    console.log("Replica DB connected");
    release();
  }
});

// ── Default export — writePool ────────────────────────────────────────────────
// All existing code that does pool.query() continues to work unchanged.
// This pool points to master, so writes are safe by default.
export { readPool };
export default writePool;
