"use client";
import { useState } from "react";
import { euros, PAR_AN, type Periodicite } from "@/lib/format";
import { enregistrer } from "./actions";

export type Valeurs = {
  id?: number; libelle?: string; categorie?: string; periodicite?: Periodicite; motif?: string | null;
  montant?: number | null; filtre_montant?: number | null; moyenne?: number | null;
};

const champ = "w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5 dark:border-neutral-700";

export default function Formulaire({ initial, groupes }: { initial: Valeurs; groupes: Record<string, string> }) {
  const [periodicite, setPeriodicite] = useState<Periodicite>(initial.periodicite ?? "mensuel");
  const [montant, setMontant] = useState(initial.montant?.toString() ?? "");
  const m = Number(montant.replace(",", ".")) || initial.moyenne || 0;
  return (
    <form action={enregistrer} className="flex flex-col gap-3">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <label className="flex flex-col gap-1">Libellé
        <input name="libelle" required defaultValue={initial.libelle} className={champ} />
      </label>
      <label className="flex flex-col gap-1">Catégorie
        <select name="categorie" required defaultValue={initial.categorie ?? ""} className={champ}>
          <option value="" disabled>Choisir…</option>
          {[...Map.groupBy(Object.keys(groupes), (c) => groupes[c])].sort(([a], [b]) => a.localeCompare(b, "fr")).map(([p, cats]) => (
            <optgroup key={p} label={p}>{cats.map((c) => <option key={c}>{c}</option>)}</optgroup>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">Périodicité
        <select name="periodicite" value={periodicite} onChange={(e) => setPeriodicite(e.target.value as Periodicite)} className={champ}>
          {Object.keys(PAR_AN).map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">Montant par échéance (€)
        <input name="montant" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} className={champ}
               placeholder={initial.moyenne ? `vide = moyenne des 3 derniers (${euros(initial.moyenne)})` : "vide = moyenne des 3 derniers"} />
      </label>
      <p className="text-sm" aria-live="polite">
        Coût : <strong>{euros((m * PAR_AN[periodicite]) / 12)}</strong> par mois, <strong>{euros(m * PAR_AN[periodicite])}</strong> par an
      </p>
      <label className="flex flex-col gap-1">Motif du libellé bancaire (rattache les prélèvements)
        <input name="motif" defaultValue={initial.motif ?? ""} className={`${champ} font-mono text-sm`} />
      </label>
      <label className="flex flex-col gap-1">Montant exact exigé (facultatif)
        <input name="filtre_montant" inputMode="decimal" defaultValue={initial.filtre_montant ?? ""} className={champ} />
      </label>
      <button className="self-start rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">Enregistrer</button>
    </form>
  );
}
