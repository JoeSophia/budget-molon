import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
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

/** Prénom de la personne connectée ; renvoie vers la connexion sinon. À appeler aussi dans chaque action serveur. */
export async function connecte() {
  await connection(); // rendu à la requête : Auth.js tire des nombres aléatoires, interdit pendant le pré-rendu
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email || !(email in UTILISATEURS)) redirect("/connexion");
  return UTILISATEURS[email];
}
