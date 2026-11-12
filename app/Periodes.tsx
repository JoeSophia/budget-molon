import Link from "next/link";
import { bornes, PERIODES, type Periode } from "@/lib/budget";

/** Lit ?p=semaine|mois|annee et ?d=AAAA-MM-JJ (date de référence). */
export function lirePeriode(q: Record<string, string | string[] | undefined>, defaut: string) {
  const p = (typeof q.p === "string" && q.p in PERIODES ? q.p : "mois") as Periode;
  const d = typeof q.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.d) ? q.d : defaut;
  return { periode: p, ref: d };
}

/** Onglets Semaine / Mois / Année et navigation vers la période précédente ou suivante. */
export default function Periodes({ chemin, periode, jour }: { chemin: string; periode: Periode; jour: string }) {
  const b = bornes(periode, jour);
  const onglet = (actif: boolean) => `rounded-md px-3 py-1 ${actif ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : ""}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <nav aria-label="Période" className="flex rounded-lg border border-neutral-300 p-0.5 text-sm dark:border-neutral-700">
        {(Object.keys(PERIODES) as Periode[]).map((p) => (
          <Link key={p} href={`${chemin}?p=${p}&d=${jour}`} className={onglet(p === periode)} aria-current={p === periode ? "page" : undefined}>
            {PERIODES[p]}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link href={`${chemin}?p=${periode}&d=${b.prec}`} aria-label="Période précédente" className="rounded px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-800">‹</Link>
        <span className="min-w-36 text-center font-medium first-letter:uppercase">{b.libelle}</span>
        <Link href={`${chemin}?p=${periode}&d=${b.suiv}`} aria-label="Période suivante" className="rounded px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-800">›</Link>
      </div>
    </div>
  );
}
