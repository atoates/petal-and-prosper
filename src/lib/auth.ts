import { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[auth] authorize called, credentials keys:", Object.keys(credentials || {}));

          // Coerce to strings -- server-side signIn can pass values as unknown types
          const raw = {
            email: String(credentials?.email ?? "").trim(),
            password: String(credentials?.password ?? "").trim(),
          };
          console.log("[auth] parsed email:", raw.email, "password length:", raw.password.length);

          const parsed = credentialsSchema.safeParse(raw);

          if (!parsed.success) {
            console.log("[auth] zod validation failed:", parsed.error.message);
            return null;
          }

          console.log("[auth] querying DB for user...");
          const user = await db.query.users.findFirst({
            where: eq(users.email, parsed.data.email),
          });
          console.log("[auth] user found:", !!user, user ? "has password:" : "", user ? !!user.password : "");

          if (!user || !user.password) {
            console.log("[auth] no user or no password");
            return null;
          }

          console.log("[auth] comparing passwords...");
          const passwordMatch = await compare(parsed.data.password, user.password);
          console.log("[auth] password match:", passwordMatch);

          if (!passwordMatch) {
            console.log("[auth] password mismatch");
            return null;
          }

          console.log("[auth] login success for:", user.email);
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role,
            companyId: user.companyId,
          };
        } catch (err) {
          console.error("[auth] authorize THREW an error:", err);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
      }
      return session;
    },
    authorized({ request, auth }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const publicPaths = ["/", "/login", "/signup", "/forgot-password"];
      const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith("/api/auth");

      if (!isPublicPath && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
