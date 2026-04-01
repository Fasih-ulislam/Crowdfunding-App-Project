import pool from "./database.js";

const testPostgres = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query("SELECT NOW() AS time");
    console.log("PostgreSQL connected —", result.rows[0].time);
  } catch (err) {
    console.error("PostgreSQL connection failed —", err.message);
    process.exit(-1); // kill the app if DB is unreachable
  } finally {
    if (client) client.release(); // release back to pool, NOT pool.end()
  }
};

export default testPostgres;
