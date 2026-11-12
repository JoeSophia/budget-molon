import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, signOut, UTILISATEURS } from "@/auth";

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Budget Molon</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/connexion" });
          }}
        >
          <button className="text-sm underline">Se déconnecter</button>
        </form>
      </header>
      {/* La session se lit à la requête : derrière Suspense (Cache Components) */}
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}

async function Contenu() {
  const session = await auth();
  if (!session?.user?.email) redirect("/connexion");
  return <p>Bonjour {UTILISATEURS[session.user.email.toLowerCase()]}. Les écrans arrivent bientôt.</p>;
}
