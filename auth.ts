import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Seules ces adresses peuvent se connecter (spec §2)
export const UTILISATEURS: Record<string, string> = {
  "molon.jonathan@gmail.com": "Jonathan",
  "severine.molon@gmail.com": "Séverine",
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/connexion", error: "/connexion" },
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return !!email && profile?.email_verified === true && email in UTILISATEURS;
    },
  },
});
