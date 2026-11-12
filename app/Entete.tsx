import Link from "next/link";
import { Suspense } from "react";
import { connecte, signOut } from "@/auth";
import { sql } from "@/lib/db";

const lien = "underline-offset-4 hover:underline";

export default function Entete() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/" className="text-xl font-semibold">Budget Molon</Link>
        <Link href="/fixes" className={lien}>Frais fixes</Link>
        <Link href="/analyses" className={lien}>Analyses</Link>
        <Link href="/alertes" className={lien}>
          Alertes<Suspense><NonLues /></Suspense>
        </Link>
        <Link href="/parametres" className={lien}>Paramètres</Link>
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/connexion" });
        }}
      >
        <button className="text-sm underline">Se déconnecter</button>
      </form>
    </header>
  );
}

async function NonLues() {
  await connecte();
  const [{ n }] = await sql`select count(*)::int n from alertes where not lu`;
  return n ? <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white">{n}</span> : null;
}
