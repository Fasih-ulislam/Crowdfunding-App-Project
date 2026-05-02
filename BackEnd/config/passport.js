import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pool from "./database.js";
import dotenv from "dotenv";
dotenv.config();

// Helper to fetch full user with profile and roles
const getFullUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT u.*, up.display_name, up.profile_picture_url,
      array_agg(r.name) as roles
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.id = $1
     GROUP BY u.id, up.display_name, up.profile_picture_url`,
    [userId]
  );
  return rows[0];
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const google_id = profile.id;
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const avatar = profile.photos[0].value;

        // Case 1 — Google user already exists
        const { rows: existingGoogle } = await pool.query(
          `SELECT * FROM users WHERE google_id = $1`,
          [google_id]
        );

        if (existingGoogle[0]) {
          await pool.query(
            `UPDATE user_profiles SET display_name = $1, profile_picture_url = $2 WHERE user_id = $3`,
            [name, avatar, existingGoogle[0].id]
          );
          const fullUser = await getFullUser(existingGoogle[0].id);
          return done(null, fullUser);
        }

        // Case 2 — Email exists but no google_id (link accounts)
        const { rows: existingEmail } = await pool.query(
          `SELECT * FROM users WHERE email = $1`,
          [email]
        );

        if (existingEmail[0]) {
          await pool.query(
            `UPDATE users SET google_id = $1 WHERE email = $2`,
            [google_id, email]
          );
          await pool.query(
            `UPDATE user_profiles SET display_name = $1, profile_picture_url = $2 WHERE user_id = $3`,
            [name, avatar, existingEmail[0].id]
          );
          const fullUser = await getFullUser(existingEmail[0].id);
          return done(null, fullUser);
        }

        // Case 3 — Brand new user
        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          const { rows: newUser } = await client.query(
            `INSERT INTO users (email, google_id, is_active)
             VALUES ($1, $2, TRUE)
             RETURNING *`,
            [email, google_id]
          );

          await client.query(
            `UPDATE user_profiles SET display_name = $1, profile_picture_url = $2 WHERE user_id = $3`,
            [name, avatar, newUser[0].id]
          );

          await client.query("COMMIT");

          const fullUser = await getFullUser(newUser[0].id);
          return done(null, fullUser);
        } catch (err) {
          await client.query("ROLLBACK");
          return done(err, null);
        } finally {
          client.release();
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;