import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const secret = process.env.SESSION_SECRET || 'dev-secret-key-change-in-production';

  return session({
    secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Simple local authentication strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // For development: accept any email/password combination
        // In production, you would verify against a real password hash
        const userId = email.replace('@', '_').replace('.', '_');

        // Get or create user
        let user = await storage.getUser(userId);
        if (!user) {
          // Auto-create user on first login
          await storage.upsertUser({
            id: userId,
            email: email,
            firstName: email.split('@')[0],
            lastName: 'User',
            profileImageUrl: null,
            roles: ['customer', 'printer_owner'],
            currentRole: 'customer',
          });
          user = await storage.getUser(userId);
        }

        return done(null, {
          userId: user!.id,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          roles: user!.roles,
          currentRole: user!.currentRole,
        });
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.userId);
  });

  passport.deserializeUser(async (userId: string, done) => {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        currentRole: user.currentRole,
      });
    } catch (error) {
      done(error);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({
          message: "Login successful",
          user: {
            id: user.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            currentRole: user.currentRole,
          }
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  console.log("✅ Local authentication system ready");
  console.log("📝 Use POST /api/login with { email, password } to authenticate");
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Unauthorized. Please login first."
    });
  }
  next();
};

// Role-based access control middleware
export const requireRole = (role: 'customer' | 'printer_owner'): RequestHandler => {
  return async (req, res, next) => {
    const userId = (req.user as any)?.userId;

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
