/** Jauge dépensé / prévu : verte, orange à partir du 1er seuil, rouge au dernier ; le trait marque la part de période écoulée. */
export default function Jauge({ depense, prevu, ecoule, seuils }: { depense: number; prevu: number; ecoule: number; seuils: number[] }) {
  const pct = prevu > 0 ? (depense / prevu) * 100 : depense > 0 ? 100 : 0;
  const couleur = pct >= seuils.at(-1)! ? "bg-red-600" : pct >= seuils[0] ? "bg-orange-500" : "bg-emerald-600";
  return (
    <div className="relative h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" role="meter" aria-valuemin={0} aria-valuemax={100}
         aria-valuenow={Math.round(pct)} aria-label={`${Math.round(pct)} % du prévu`}>
      <div className={`h-2 rounded-full ${couleur}`} style={{ width: `${Math.min(100, pct)}%` }} />
      <div className="absolute -top-0.5 h-3 w-0.5 bg-neutral-900 dark:bg-white" style={{ left: `${ecoule * 100}%` }} aria-hidden />
    </div>
  );
}
