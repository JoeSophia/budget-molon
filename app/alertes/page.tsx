import { refresh } from "next/cache";
import { Suspense } from "react";
import { connecte } from "@/auth";
import { sql } from "@/lib/db";
import Entete from "../Entete";

const ICONES: Record<string, string> = { grosse_depense: "💸", jauge: "📊", banque: "🏦" };

export default function Alertes() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Entete />
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}

async function marquerLues(id?: number) {
  "use server";
  await connecte();
  if (id) await sql`update alertes set lu = not lu where id = ${id}`;
  else await sql`update alertes set lu = true where not lu`;
  refresh();
}

async function Contenu() {
  await connecte();
  const alertes = await sql`select id, type, message, lu, cree_le from alertes order by cree_le desc limit 200`;
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alertes</h1>
        {alertes.some((a) => !a.lu) && <form action={marquerLues.bind(null, undefined)}><button className="text-sm underline">Tout marquer comme lu</button></form>}
      </div>
      {!alertes.length ? <p className="text-neutral-500">Aucune alerte pour l&apos;instant. Elles sont vérifiées après chaque synchronisation bancaire.</p> : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {alertes.map((a) => (
            <li key={a.id} className={`flex items-start gap-3 px-3 py-2 ${a.lu ? "text-neutral-500" : "font-medium"}`}>
              <span aria-hidden>{ICONES[a.type] ?? "🔔"}</span>
              <div className="flex-1">
                <div>{a.message}</div>
                <div className="text-xs text-neutral-500">{new Date(a.cree_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}</div>
              </div>
              <form action={marquerLues.bind(null, a.id)}><button className="text-xs underline">{a.lu ? "non lu" : "lu"}</button></form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
