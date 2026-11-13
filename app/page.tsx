import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connecte } from "@/auth";
import { aujourdhui, bornes, depenses, enveloppe, parametre, postes, prevusPeriode, type Depense } from "@/lib/budget";
import { sql } from "@/lib/db";
import { euros } from "@/lib/format";
import { changerPrevu } from "./actions";
import Detail from "./Detail";
import Entete from "./Entete";
import Jauge from "./Jauge";
import Periodes, { lirePeriode } from "./Periodes";

// Frais variables (spec §6) : ?p=semaine|mois|annee, ?d=date de référence, ?poste= poste ouvert, ?modifier= prévu en cours d'édition
export default function Variables({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Entete />
      {/* La session et la base se lisent à la requête : derrière Suspense (Cache Components) */}
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const somme = (l: Depense[]) => -l.reduce((s, d) => s + d.net, 0) || 0; // || 0 : pas de « -0,00 € »

async function Contenu({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await connecte();
  const q = await searchParams;
  const { periode, ref } = lirePeriode(q, aujourdhui());
  const ouvert = typeof q.poste === "string" ? q.poste : null, modifier = typeof q.modifier === "string" ? q.modifier : null;
  const b = bornes(periode, ref), sem = bornes("semaine", ref), mois = bornes("mois", ref), an = bornes("annee", ref);
  const mois1 = mois.debut;

  // Une seule lecture couvre la période affichée et les colonnes semaine / mois / année de l'exceptionnel
  const [toutes, prevus, seuils, env, tags, POSTES] = await Promise.all([
    depenses(sem.debut < an.debut ? sem.debut : an.debut, sem.fin > an.fin ? sem.fin : an.fin),
    prevusPeriode(periode, ref),
    parametre<number[]>("seuils_jauge"),
    enveloppe(mois1),
    sql`select nom from tags order by nom`,
    postes(),
  ]);
  const dans = (l: Depense[], x: { debut: string; fin: string }) => l.filter((d) => d.date >= x.debut && d.date <= x.fin);
  const liste = dans(toutes, b);
  const tagsDispo = tags.map((t) => t.nom as string);
  const parPoste = Map.groupBy(liste, (d) => d.poste);
  const lignes = [...POSTES, ...[...parPoste.keys()].filter((p) => !POSTES.includes(p))]
    .map((p) => ({ poste: p, depense: somme(parPoste.get(p) ?? []), prevu: prevus[p] ?? 0 }))
    .filter((l) => l.depense > 0 || l.prevu > 0)
    .sort((a, b) => b.prevu - a.prevu || b.depense - a.depense);
  const totalPrevu = Object.values(prevus).reduce((a, v) => a + v, 0), totalDepense = somme(liste);
  const url = (extra: Record<string, string>) => `/?${new URLSearchParams({ p: periode, d: ref, ...extra })}`;
  const retour = url({}), poste = modifier; // valeurs simples : capturées par l'action serveur ci-dessous

  return (
    <>
      <h1 className="text-2xl font-semibold">Frais variables</h1>
      <Periodes chemin="/" periode={periode} jour={ref} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {periode === "mois" && (
          <div className="col-span-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800 sm:col-span-4">
            Enveloppe <strong className="text-base">{euros(env.montant)}</strong> = revenus du mois précédent {euros(env.revenus)} − épargne{" "}
            {euros(env.epargne)} − frais fixes {euros(env.fixes)}
            {Math.abs(env.montant - totalPrevu) >= 1 && (
              <span className="block text-orange-700 dark:text-orange-400">Non réparti : {euros(env.montant - totalPrevu)}</span>
            )}
          </div>
        )}
        <Chiffre titre="Dépensé" valeur={totalDepense} />
        <Chiffre titre="Prévu" valeur={totalPrevu} />
        <Chiffre titre="Reste" valeur={totalPrevu - totalDepense} />
        <Chiffre titre="Période écoulée" texte={`${Math.round(b.ecoule * 100)} %`} />
      </section>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {lignes.map((l) => (
          <li key={l.poste}>
            <div className="flex items-center gap-3 px-3 py-2">
              <Link href={ouvert === l.poste ? url({}) : url({ poste: l.poste })} scroll={false} aria-expanded={ouvert === l.poste}
                    className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex justify-between gap-2">
                  <span className="font-medium">{l.poste}</span>
                  <span className="tabular-nums text-sm">{euros(l.depense)} <span className="text-neutral-500">/ {euros(l.prevu)}</span></span>
                </span>
                <Jauge depense={l.depense} prevu={l.prevu} ecoule={b.ecoule} seuils={seuils} />
              </Link>
              {periode === "mois" && POSTES.includes(l.poste) && (
                <Link href={url({ modifier: l.poste })} scroll={false} className="text-sm text-neutral-500 underline" aria-label={`Modifier le prévu ${l.poste}`}>✎</Link>
              )}
            </div>
            {modifier === l.poste && (
              <form className="flex flex-wrap items-end gap-2 border-t border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
                    action={async (f) => {
                      "use server";
                      await changerPrevu(mois1, poste!, Number(String(f.get("montant")).replace(",", ".")), String(f.get("compense")));
                      redirect(retour);
                    }}>
                <label className="flex flex-col">Nouveau prévu
                  <input name="montant" inputMode="decimal" defaultValue={l.prevu} autoFocus required
                         className="w-28 rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700" />
                </label>
                <label className="flex flex-col">La différence va sur
                  <select name="compense" className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700">
                    <option value="">Non réparti</option>
                    {POSTES.filter((p) => p !== l.poste).map((p) => <option key={p} value={p}>{p} ({euros(prevus[p] ?? 0)})</option>)}
                  </select>
                </label>
                <button className="rounded bg-emerald-700 px-3 py-1 text-white">OK</button>
                <Link href={url({})} className="underline">Annuler</Link>
              </form>
            )}
            {ouvert === l.poste && <div className="border-t border-neutral-200 dark:border-neutral-800"><Detail depenses={parPoste.get(l.poste) ?? []} tagsDispo={tagsDispo} /></div>}
          </li>
        ))}
      </ul>

      <Exceptionnel toutes={toutes} periodes={[["Semaine", sem], ["Mois", mois], ["Année", an]]} liste={liste.filter((d) => d.exceptionnel)} tagsDispo={tagsDispo} />
    </>
  );
}

function Chiffre({ titre, valeur, texte }: { titre: string; valeur?: number; texte?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-sm text-neutral-500">{titre}</div>
      <div className={`text-lg font-semibold tabular-nums ${valeur !== undefined && valeur < 0 ? "text-red-700 dark:text-red-400" : ""}`}>
        {texte ?? euros(valeur!)}
      </div>
    </div>
  );
}

/** Section Exceptionnel : ce qu'on peut réduire, par catégorie, en semaine / mois / année. */
function Exceptionnel({ toutes, periodes, liste, tagsDispo }: {
  toutes: Depense[]; periodes: [string, { debut: string; fin: string }][]; liste: Depense[]; tagsDispo: string[];
}) {
  const exc = toutes.filter((d) => d.exceptionnel);
  const colonnes = periodes.map(([titre, x]) => [titre, exc.filter((d) => d.date >= x.debut && d.date <= x.fin)] as const);
  const categories = [...new Set(exc.map((d) => d.categorie))]
    .map((c) => ({ c, v: colonnes.map(([, l]) => somme(l.filter((d) => d.categorie === c))) }))
    .sort((a, b) => b.v[2] - a.v[2]);
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">◆ Exceptionnel</h2>
      {!categories.length ? <p className="text-sm text-neutral-500">Aucune dépense marquée exceptionnelle (◆) cette année.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-1 font-normal">Catégorie</th>
                {colonnes.map(([t]) => <th key={t} className="py-1 text-right font-normal">{t}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {categories.map(({ c, v }) => (
                <tr key={c}><td className="py-1">{c}</td>{v.map((x, i) => <td key={i} className="py-1 text-right tabular-nums">{x ? euros(x) : "–"}</td>)}</tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1">Total</td>
                {colonnes.map(([t, l]) => <td key={t} className="py-1 text-right tabular-nums">{euros(somme(l))}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {liste.length > 0 && (
        <details className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <summary className="cursor-pointer px-3 py-2">Dépenses exceptionnelles de la période ({liste.length})</summary>
          <Detail depenses={liste} tagsDispo={tagsDispo} />
        </details>
      )}
    </section>
  );
}
