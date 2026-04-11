import NextAuth from "next-auth";
import { authConfigEdge } from "@/lib/auth.config";

const { auth } = NextAuth(authConfigEdge);
export default auth;

export const config = {
  matcher: [
    "/home/:path*",
    "/enquiries/:path*",
    "/orders/:path*",
    "/pricing/:path*",
    "/proposals/:path*",
    "/invoices/:path*",
    "/wholesale/:path*",
    "/production/:path*",
    "/delivery/:path*",
    "/libraries/:path*",
    "/settings/:path*",
    "/subscription/:path*",
    "/user/:path*",
  ],
};
