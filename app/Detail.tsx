import type { Depense } from "@/lib/budget";
import { euros } from "@/lib/format";
import Ligne from "./Ligne";

/** Dépenses groupées par sous-catégorie repliable (la plus coûteuse d'abord), triées par montant décroissant. */
export default function Detail({ depenses, tagsDispo }: { depenses: Depense[]; tagsDispo: string[] }) {
  if (!depenses.length) return <p className="px-3 py-2 text-sm text-neutral-500">Aucune dépense.</p>;
  const groupes = [...Map.groupBy(depenses, (d) => d.categorie)]
    .map(([c, l]) => ({ c, l: l.toSorted((a, b) => a.net - b.net), total: -l.reduce((s, d) => s + d.net, 0) }))
    .sort((a, b) => b.total - a.total);
  const lignes = (l: Depense[]) => (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
      {l.map((d) => <Ligne key={d.id} d={d} tagsDispo={tagsDispo} />)}
    </ul>
  );
  if (groupes.length === 1) return lignes(groupes[0].l);
  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
      {groupes.map(({ c, l, total }) => (
        <details key={c} className="group">
          <summary className="flex cursor-pointer list-none [&::-webkit-details-marker]:hidden justify-between gap-2 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300">
            <span><span className="inline-block w-4 transition-transform group-open:rotate-90">›</span>{c} <span className="text-neutral-500">({l.length})</span></span>
            <span className="tabular-nums">{euros(total)}</span>
          </summary>
          {lignes(l)}
        </details>
      ))}
    </div>
  );
}
