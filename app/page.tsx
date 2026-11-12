import { Suspense } from "react";
import { connecte } from "@/auth";
import Entete from "./Entete";

export default function Accueil() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Entete />
      {/* La session se lit à la requête : derrière Suspense (Cache Components) */}
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}

async function Contenu() {
  return <p>Bonjour {await connecte()}. Les écrans arrivent bientôt.</p>;
}
