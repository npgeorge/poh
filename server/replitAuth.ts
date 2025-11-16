import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if running in local development mode
const isLocalDev = process.env.REPL_ID === 'local-dev' || !process.env.REPL_ID;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Get session secret with fallback for local dev
  const secret = process.env.SESSION_SECRET || (isLocalDev ? 'local-dev-secret-key-not-for-production' : undefined);

  if (!secret) {
    throw new Error("SESSION_SECRET must be set in environment variables");
  }

  return session({
    secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isLocalDev, // Only use secure cookies in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Skip Replit OIDC setup in local development
  if (isLocalDev) {
    console.log("⚠️  Running in local development mode - Replit auth disabled");
    console.log("⚠️  Use POST /api/dev/login to create a mock user session");

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    // Dev-only login endpoint to create mock user sessions
    app.post("/api/dev/login", async (req, res) => {
      try {
        const { userId, email, firstName, lastName, roles } = req.body;

        // Create or get test user
        const testUserId = userId || 'dev-user-123';

        // Determine roles for the user
        const userRoles: ('customer' | 'printer_owner')[] =
          roles && Array.isArray(roles)
            ? roles.filter((r: string) => r === 'customer' || r === 'printer_owner')
            : ['customer', 'printer_owner']; // Default: both roles for testing

        // Create or update test user
        await storage.upsertUser({
          id: testUserId,
          email: email || 'dev@localhost.com',
          firstName: firstName || 'Dev',
          lastName: lastName || 'User',
          profileImageUrl: null,
          roles: userRoles,
          currentRole: userRoles[0] || 'customer',
        });

        const user = await storage.getUser(testUserId);

        // Create mock user session
        const devUser = {
          userId: testUserId,
          claims: {
            sub: testUserId,
            email: user!.email,
            first_name: user!.firstName,
            last_name: user!.lastName,
          },
        };

        // Store in session
        if (req.session) {
          (req.session as any).devUser = devUser;
        }

        res.json({
          message: "Mock user session created",
          user: {
            id: testUserId,
            email: user!.email,
            firstName: user!.firstName,
            lastName: user!.lastName,
            roles: user!.roles,
            currentRole: user!.currentRole,
          }
        });
      } catch (error) {
        console.error("Error creating dev user:", error);
        res.status(500).json({ message: "Failed to create dev user" });
      }
    });

    // Get current dev user info
    app.get("/api/dev/user", (req, res) => {
      if (req.session && (req.session as any).devUser) {
        res.json({ user: (req.session as any).devUser });
      } else {
        res.status(401).json({ message: "No dev user session. Use POST /api/dev/login" });
      }
    });

    // Dev logout
    app.post("/api/dev/logout", (req, res) => {
      if (req.session) {
        delete (req.session as any).devUser;
      }
      res.json({ message: "Dev user session cleared" });
    });

    // Provide stub endpoints for production login routes
    app.get("/api/login", (req, res) => {
      res.status(501).json({
        message: "Production auth not available in local development mode. Use POST /api/dev/login instead."
      });
    });

    app.get("/api/callback", (req, res) => {
      res.status(501).json({ message: "Production auth not available in local development mode" });
    });

    app.get("/api/logout", (req, res) => {
      res.status(501).json({
        message: "Production auth not available in local development mode. Use POST /api/dev/logout instead."
      });
    });

    return;
  }

  if (!process.env.REPLIT_DOMAINS) {
    throw new Error("Environment variable REPLIT_DOMAINS not provided");
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // In local development mode, bypass authentication
  if (isLocalDev && req.session) {
    // Check if we have a mock user in session
    if (!req.session.devUser) {
      return res.status(401).json({
        message: "Unauthorized. Use /api/dev/login to set up a mock user session."
      });
    }

    // Attach mock user to request
    (req as any).user = req.session.devUser;
    return next();
  }

  // Production authentication logic
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Role-based access control middleware
export const requireRole = (role: 'customer' | 'printer_owner'): RequestHandler => {
  return async (req, res, next) => {
    // In local dev mode, get userId from devUser
    const userId = isLocalDev
      ? (req.user as any)?.userId
      : (req.user as any)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || !user.roles.includes(role)) {
        return res.status(403).json({ message: `Access denied. ${role} role required.` });
      }
      next();
    } catch (error) {
      console.error("Error checking user role:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
