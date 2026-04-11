import { type NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration: pages, callbacks, and session strategy only.
 * No DB or bcrypt imports so this can run in Next.js middleware (Edge Runtime).
 * The full provider config lives in lib/auth.ts and extends this.
 */
export const authConfigEdge = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ request, auth }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const publicPaths = ["/", "/login", "/signup", "/forgot-password"];
      const isPublicPath =
        publicPaths.includes(pathname) ||
        pathname.startsWith("/reset-password/") ||
        pathname.startsWith("/p/") ||
        pathname.startsWith("/api/public/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/auth/");

      if (!isPublicPath && !isLoggedIn) {
        const loginUrl = new URL("/login", request.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
