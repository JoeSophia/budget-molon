import type { Depense } from "@/lib/budget";
import { euros } from "@/lib/format";
import Ligne from "./Ligne";

/** Dépenses groupées par sous-catégorie (la plus coûteuse d'abord), triées par montant décroissant. */
export default function Detail({ depenses, tagsDispo }: { depenses: Depense[]; tagsDispo: string[] }) {
  if (!depenses.length) return <p className="px-3 py-2 text-sm text-neutral-500">Aucune dépense.</p>;
  const groupes = [...Map.groupBy(depenses, (d) => d.categorie)]
    .map(([c, l]) => ({ c, l: l.toSorted((a, b) => a.net - b.net), total: -l.reduce((s, d) => s + d.net, 0) }))
    .sort((a, b) => b.total - a.total);
  return (
    <div>
      {groupes.map(({ c, l, total }) => (
        <section key={c}>
          {groupes.length > 1 && (
            <h4 className="flex justify-between bg-neutral-50 px-3 py-1 text-sm font-medium text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400">
              <span>{c}</span><span className="tabular-nums">{euros(total)}</span>
            </h4>
          )}
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {l.map((d) => <Ligne key={d.id} d={d} tagsDispo={tagsDispo} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
