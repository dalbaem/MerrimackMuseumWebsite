import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getRoleForEmail } from "@/server/users/service";
import {
  normalizeEmail,
  type AppRole,
} from "@/shared/types/user";

const ACCESS_DENIED_REDIRECT = "/collection?signin=access-denied";
const ACCESS_CHECK_FAILED_REDIRECT = "/collection?signin=access-check-failed";

async function checkSignInAccess(email: string | null | undefined) {
  const normalizedEmail = email ? normalizeEmail(email) : "";
  if (!normalizedEmail) {
    return ACCESS_DENIED_REDIRECT;
  }

  try {
    const role = await getRoleForEmail(normalizedEmail);
    return role === "admin" || role === "faculty"
      ? true
      : ACCESS_DENIED_REDIRECT;
  } catch (error) {
    console.error("Error resolving sign-in access:", error);
    return ACCESS_CHECK_FAILED_REDIRECT;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      return checkSignInAccess(user.email);
    },
  },
};
