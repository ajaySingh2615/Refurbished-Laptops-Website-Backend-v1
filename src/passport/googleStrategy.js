import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../src/db/client.js";
import { users, userOauthAccounts } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

export function configureGoogleStrategy() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:4000/api/auth/google/callback";

  if (!clientID || !clientSecret) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const providerUserId = profile.id;
          let [u] = email
            ? await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1)
            : [];
          if (!u) {
            const name = profile.displayName || "";
            await db
              .insert(users)
              .values({ email: email || null, name, passwordHash: null });
            [u] = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);
          }
          // link oauth account
          const existing = await db
            .select()
            .from(userOauthAccounts)
            .where(eq(userOauthAccounts.providerUserId, providerUserId))
            .limit(1);
          if (!existing?.length) {
            await db.insert(userOauthAccounts).values({
              userId: u.id,
              provider: "google",
              providerUserId,
              providerEmail: email || null,
            });
          }
          return done(null, { id: u.id, email: u.email, role: u.role });
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}
