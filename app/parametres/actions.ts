"use server";
import { refresh } from "next/cache";
import { connecte } from "@/auth";
import { sql } from "@/lib/db";
import { notifier } from "@/lib/push";

const positif = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Valeur invalide : ${v}`);
  return n;
};

export async function enregistrerReglages(f: FormData) {
  await connecte();
  const seuils = String(f.get("seuils_jauge")).split(/[ ,;]+/).filter(Boolean).map(positif).sort((a, b) => a - b);
  if (!seuils.length) throw new Error("Au moins un seuil de jauge");
  for (const [cle, valeur] of [
    ["seuil_grosse_depense", positif(f.get("seuil_grosse_depense"))],
    ["seuils_jauge", seuils],
    ["epargne_mensuelle", positif(f.get("epargne_mensuelle"))],
  ] as const) {
    await sql`insert into parametres values (${cle}, ${JSON.stringify(valeur)}::jsonb) on conflict (cle) do update set valeur = excluded.valeur`;
  }
  refresh();
}

export async function supprimerRegle(motif: string) {
  await connecte();
  await sql`delete from regles_commercant where motif = ${motif}`;
  refresh();
}

export async function enregistrerTag(f: FormData) {
  await connecte();
  const id = Number(f.get("id")) || null, nom = String(f.get("nom") ?? "").trim();
  const texte = (k: string) => String(f.get(k) ?? "").trim() || null;
  const [lib, note, debut, fin] = [texte("motif_libelle"), texte("motif_note"), texte("debut"), texte("fin")];
  if (!nom) throw new Error("Nom obligatoire");
  for (const m of [lib, note]) if (m) new RegExp(m); // motif illisible : erreur ici plutôt qu'à la synchro
  const [g] = id
    ? await sql`update tags set nom = ${nom}, motif_libelle = ${lib}, motif_note = ${note}, debut = ${debut}, fin = ${fin} where id = ${id} returning id`
    : await sql`insert into tags (nom, motif_libelle, motif_note, debut, fin) values (${nom}, ${lib}, ${note}, ${debut}, ${fin}) returning id`;
  // Règle appliquée tout de suite aux dépenses déjà en base
  if (lib || note) {
    const cibles = (await sql`select id, libelle, note from transactions
                              where montant < 0 and (${debut}::date is null or date >= ${debut}::date) and (${fin}::date is null or date <= ${fin}::date)`)
      .filter((t) => (lib && new RegExp(lib, "i").test(t.libelle)) || (note && t.note && new RegExp(note, "i").test(t.note)))
      .map((t) => ({ transaction_id: t.id, tag_id: g.id }));
    await sql`insert into transaction_tags select * from json_populate_recordset(null::transaction_tags, ${JSON.stringify(cibles)}::json)
              on conflict do nothing`;
  }
  refresh();
}

export async function supprimerTag(id: number) {
  await connecte();
  await sql`delete from tags where id = ${id}`;
  refresh();
}

export async function abonner(abonnement: PushSubscriptionJSON) {
  const qui = await connecte();
  if (!abonnement.endpoint?.startsWith("https://")) throw new Error("Abonnement invalide");
  await sql`insert into abonnements_push (endpoint, utilisateur, abonnement) values (${abonnement.endpoint}, ${qui}, ${JSON.stringify(abonnement)}::jsonb)
            on conflict (endpoint) do update set utilisateur = excluded.utilisateur, abonnement = excluded.abonnement`;
}

export async function desabonner(endpoint: string) {
  await connecte();
  await sql`delete from abonnements_push where endpoint = ${endpoint}`;
}

export async function tester() {
  const qui = await connecte();
  return notifier("Budget Molon", `Notification de test envoyée par ${qui}.`, "/parametres");
}
