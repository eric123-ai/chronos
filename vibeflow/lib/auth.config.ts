import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: { label: "Email", type: "text" } },
      async authorize(credentials) {
        const email = (credentials?.email || "").toString().trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        return { id: email, email } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
};
