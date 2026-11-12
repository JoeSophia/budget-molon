import { Suspense } from "react";
import { connecte } from "@/auth";
import { parametre } from "@/lib/budget";
import { sql } from "@/lib/db";
import { VAPID_PUBLIC_KEY } from "@/lib/push";
import Entete from "../Entete";
import { enregistrerReglages, enregistrerTag, supprimerRegle, supprimerTag } from "./actions";
import Notifications from "./Notifications";

export default function Parametres() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
      <Entete />
      <h1 className="text-2xl font-semibold">Paramètres</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </main>
  );
}

const champ = "rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700";
const ok = "rounded bg-emerald-700 px-3 py-1 text-sm font-medium text-white";
const titre = "mb-2 text-lg font-semibold";

async function Contenu() {
  await connecte();
  const [seuil, seuils, epargne, regles, tags] = await Promise.all([
    parametre<number>("seuil_grosse_depense"), parametre<number[]>("seuils_jauge"), parametre<number>("epargne_mensuelle"),
    sql`select motif, categorie from regles_commercant order by categorie, motif`,
    sql`select id, nom, motif_libelle, motif_note, debut::text, fin::text,
               (select count(*)::int from transaction_tags tt where tt.tag_id = tags.id) n from tags order by nom`,
  ]);
  return (
    <>
      <section>
        <h2 className={titre}>Réglages</h2>
        <form action={enregistrerReglages} className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">Grosse dépense à partir de (€)
            <input name="seuil_grosse_depense" defaultValue={seuil} inputMode="decimal" className={`${champ} w-28`} />
          </label>
          <label className="flex flex-col gap-1">Seuils des jauges (%)
            <input name="seuils_jauge" defaultValue={seuils.join(", ")} className={`${champ} w-32`} />
          </label>
          <label className="flex flex-col gap-1">Épargne mensuelle (€)
            <input name="epargne_mensuelle" defaultValue={epargne} inputMode="decimal" className={`${champ} w-28`} />
          </label>
          <button className={ok}>Enregistrer</button>
        </form>
      </section>

      <section>
        <h2 className={titre}>Notifications</h2>
        <Notifications clePublique={VAPID_PUBLIC_KEY} />
      </section>

      <section>
        <h2 className={titre}>Tags</h2>
        <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
          Motifs facultatifs (expressions régulières, sans majuscules) : le tag est posé tout seul sur les dépenses de la période dont le libellé ou la note correspond.
        </p>
        <ul className="flex flex-col gap-2">
          {[...tags, { id: 0, nom: "", motif_libelle: "", motif_note: "", debut: "", fin: "", n: 0 }].map((g) => (
            <li key={g.id} className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
              <form action={enregistrerTag} className="flex flex-wrap items-end gap-2 text-sm">
                {g.id > 0 && <input type="hidden" name="id" value={g.id} />}
                <label className="flex flex-col">{g.id ? `Nom (${g.n} dépenses)` : "Nouveau tag"}
                  <input name="nom" defaultValue={g.nom} required className={`${champ} w-32`} />
                </label>
                <label className="flex flex-col">Libellé contient
                  <input name="motif_libelle" defaultValue={g.motif_libelle ?? ""} className={`${champ} w-40 font-mono`} />
                </label>
                <label className="flex flex-col">Note contient
                  <input name="motif_note" defaultValue={g.motif_note ?? ""} className={`${champ} w-28 font-mono`} />
                </label>
                <label className="flex flex-col">Du
                  <input type="date" name="debut" defaultValue={g.debut ?? ""} className={champ} />
                </label>
                <label className="flex flex-col">Au
                  <input type="date" name="fin" defaultValue={g.fin ?? ""} className={champ} />
                </label>
                <button className={ok}>{g.id ? "Enregistrer" : "Créer"}</button>
                {g.id > 0 && <button formAction={supprimerTag.bind(null, g.id)} className="text-red-700 underline dark:text-red-400">Supprimer</button>}
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={titre}>Règles « toujours pour ce commerçant »</h2>
        {!regles.length ? <p className="text-sm text-neutral-500">Aucune règle.</p> : (
          <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            {regles.map((r) => (
              <li key={r.motif} className="flex items-center justify-between gap-2 py-1">
                <span><span className="font-mono">{r.motif}</span> → {r.categorie}</span>
                <form action={supprimerRegle.bind(null, r.motif)}><button className="text-red-700 underline dark:text-red-400">Supprimer</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
