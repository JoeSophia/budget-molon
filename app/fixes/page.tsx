import Link from "next/link";
import { Suspense } from "react";
import { connecte } from "@/auth";
import { poste } from "@/lib/categories";
import { fraisFixes } from "@/lib/fixes";
import { euros } from "@/lib/format";
import Entete from "../Entete";

const dateCourte = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function Fixes({ searchParams }: PageProps<"/fixes">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <Entete />
      <Suspense fallback={<p>Chargement…</p>}>
        <Liste searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Liste({ searchParams }: Pick<PageProps<"/fixes">, "searchParams">) {
  await connecte();
  const annee = (await searchParams).vue === "annee";
  const fois = annee ? 12 : 1;
  const frais = await fraisFixes();
  const parPoste = Map.groupBy(frais, (f) => poste(f.categorie));
  const total = frais.reduce((s, f) => s + f.par_mois, 0);
  const onglet = (actif: boolean) => `rounded-md px-3 py-1 ${actif ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Frais fixes</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            <strong className="text-lg text-neutral-900 dark:text-white">{euros(total)}</strong> par mois · {euros(total * 12)} par an
          </p>
        </div>
        <div className="flex items-center gap-3">
          <nav aria-label="Période" className="flex rounded-lg border border-neutral-300 p-0.5 text-sm dark:border-neutral-700">
            <Link href="/fixes" className={onglet(!annee)} aria-current={!annee ? "page" : undefined}>Mois</Link>
            <Link href="/fixes?vue=annee" className={onglet(annee)} aria-current={annee ? "page" : undefined}>Année</Link>
          </nav>
          <Link href="/fixes/nouveau" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">+ Ajouter</Link>
        </div>
      </div>

      {[...parPoste].sort(([, a], [, b]) => b.reduce((s, f) => s + f.par_mois, 0) - a.reduce((s, f) => s + f.par_mois, 0)).map(([p, liste]) => (
        <section key={p} className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <h2 className="flex justify-between bg-neutral-100 px-3 py-2 font-medium dark:bg-neutral-900">
            <span>{p}</span><span>{euros(liste.reduce((s, f) => s + f.par_mois, 0) * fois)}</span>
          </h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {liste.map((f) => {
              const ecart = f.dernier !== null && f.attendu !== null ? f.dernier - f.attendu : 0;
              return (
                <li key={f.id}>
                  <Link href={`/fixes/${f.id}`} className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="min-w-0">
                      <div className="font-medium">{f.libelle}</div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {f.categorie} · {f.periodicite}
                        {f.attendu !== null && f.periodicite !== "mensuel" && <> · {euros(f.attendu)} par échéance</>}
                        {f.montant === null && <> · moyenne</>}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {f.dernier_date ? <>Dernier : {dateCourte(f.dernier_date)}, {euros(f.dernier!)}</> : "Aucun prélèvement rattaché"}
                        {Math.abs(ecart) >= 0.5 && (
                          <span className={ecart > 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}>
                            {" "}({ecart > 0 ? "+" : ""}{euros(ecart)})
                          </span>
                        )}
                        {f.prochaine && <> · prochain ≈ {dateCourte(f.prochaine)}</>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-medium tabular-nums">{euros(f.par_mois * fois)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
