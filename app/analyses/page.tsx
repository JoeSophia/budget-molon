import { Suspense } from "react";
import { connecte } from "@/auth";
import { aujourdhui, bornes, depenses, type Depense } from "@/lib/budget";
import { sql } from "@/lib/db";
import { euros } from "@/lib/format";
import Detail from "../Detail";
import Entete from "../Entete";
import Periodes, { lirePeriode } from "../Periodes";

// Vues transversales (spec §7 bis) : tags, puis indispensable / accessoire par personne. Elles ne changent aucun total.
export default function Analyses({ searchParams }: PageProps<"/analyses">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Entete />
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const somme = (l: Depense[]) => -l.reduce((s, d) => s + d.net, 0) || 0;
const QUI = [["cj", "♂ Jonathan"], ["cs", "♀ Séverine"], ["cc", "⚭ Joint"]] as const;
const cellule = "py-1 pl-2 text-right tabular-nums";

async function Contenu({ searchParams }: Pick<PageProps<"/analyses">, "searchParams">) {
  await connecte();
  const { periode, ref } = lirePeriode(await searchParams, aujourdhui());
  const b = bornes(periode, ref);
  const [liste, tags] = await Promise.all([depenses(b.debut, b.fin), sql`select nom from tags order by nom`]);
  const tagsDispo = tags.map((t) => t.nom as string);
  const postes = [...Map.groupBy(liste, (d) => d.poste)].sort(([, a], [, z]) => somme(z) - somme(a));
  const accessoires = liste.filter((d) => !d.essentiel);

  return (
    <>
      <h1 className="text-2xl font-semibold">Analyses</h1>
      <Periodes chemin="/analyses" periode={periode} jour={ref} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">🏷 Tags</h2>
        {tagsDispo.map((nom) => {
          const l = liste.filter((d) => d.tags.includes(nom));
          if (!l.length) return <p key={nom} className="text-sm text-neutral-500">{nom} : rien sur la période.</p>;
          const parCat = [...Map.groupBy(l, (d) => d.categorie)].sort(([, a], [, z]) => somme(z) - somme(a));
          return (
            <details key={nom} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
              <summary className="flex cursor-pointer justify-between px-3 py-2 font-medium">
                <span>{nom}</span><span className="tabular-nums">{euros(somme(l))}</span>
              </summary>
              <table className="mx-3 mb-2 w-[calc(100%-1.5rem)] text-sm">
                <tbody>
                  {parCat.map(([c, x]) => <tr key={c}><td className="py-1">{c}</td><td className={cellule}>{euros(somme(x))}</td></tr>)}
                </tbody>
              </table>
              <Detail depenses={l} tagsDispo={tagsDispo} />
            </details>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Indispensable / accessoire</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Accessoire (le superflu) : <strong className="text-orange-700 dark:text-orange-400">{euros(somme(accessoires))}</strong> sur{" "}
          {euros(somme(liste))} dépensés, soit {liste.length ? Math.round((somme(accessoires) / somme(liste)) * 100) : 0} %.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-neutral-500">
                <th className="py-1 text-left font-normal">Poste</th>
                {QUI.map(([, n]) => <th key={n} className={`${cellule} font-normal`}>{n}</th>)}
                <th className={`${cellule} font-normal`}>Total</th>
                <th className={`${cellule} font-normal`}>Dont accessoire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {postes.map(([p, l]) => (
                <tr key={p}>
                  <td className="py-1">{p}</td>
                  {QUI.map(([c]) => <td key={c} className={cellule}>{euros(somme(l.filter((d) => d.compte === c)))}</td>)}
                  <td className={`${cellule} font-medium`}>{euros(somme(l))}</td>
                  <td className={`${cellule} text-orange-700 dark:text-orange-400`}>{euros(somme(l.filter((d) => !d.essentiel)))}</td>
                </tr>
              ))}
              {[["Total", liste], ["Dont accessoire", accessoires]].map(([titre, l]) => (
                <tr key={titre as string} className="font-semibold">
                  <td className="py-1">{titre as string}</td>
                  {QUI.map(([c]) => <td key={c} className={cellule}>{euros(somme((l as Depense[]).filter((d) => d.compte === c)))}</td>)}
                  <td className={cellule}>{euros(somme(l as Depense[]))}</td>
                  <td className={cellule} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accessoires.length > 0 && (
          <details className="rounded-lg border border-neutral-200 dark:border-neutral-800">
            <summary className="cursor-pointer px-3 py-2">Dépenses accessoires ({accessoires.length})</summary>
            <Detail depenses={accessoires} tagsDispo={tagsDispo} />
          </details>
        )}
      </section>
    </>
  );
}
