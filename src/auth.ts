import { decode as decodeJwt } from "@auth/core/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { prisma } from "./prisma";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  jwt: {
    async decode(params) {
      try {
        return await decodeJwt(params);
      } catch {
        return null;
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        token.username = row?.username ?? null;
      }
      delete token.picture;
      if (
        trigger === "update" &&
        session &&
        typeof session === "object" &&
        "user" in session &&
        session.user &&
        "username" in session.user
      ) {
        const username = session.user.username;
        if (typeof username === "string" || username === null) {
          token.username = username;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.id === "string" ? token.id : (token.sub ?? "");
        session.user.username =
          typeof token.username === "string" || token.username === null
            ? token.username
            : null;
        session.user.image = null;
      }
      return session;
    },
  },
});
