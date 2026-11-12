import { sql } from "@/lib/db";
import { PAR_AN, type Periodicite } from "@/lib/format";

export type FraisFixe = {
  id: number; libelle: string; categorie: string; periodicite: Periodicite; motif: string | null;
  montant: number | null; filtre_montant: number | null;
  attendu: number | null; // par échéance : montant saisi, sinon moyenne des 3 derniers prélèvements
  par_mois: number; dernier: number | null; dernier_date: string | null; prochaine: string | null;
};

// Prélèvements rattachés à un frais fixe : débit dont le libellé correspond au motif (et au montant exact s'il est imposé)
const RATTACHE = "t.montant < 0 and t.libelle ~* f.motif and (f.filtre_montant is null or -t.montant = f.filtre_montant)";

export async function fraisFixes(): Promise<FraisFixe[]> {
  const lignes = await sql.query(
    `select f.id, f.libelle, f.categorie, f.periodicite, f.motif, f.montant::float, f.filtre_montant::float,
            coalesce(d.derniers, '{}') derniers, d.dernier_date
     from frais_fixes f
     left join lateral (
       select array_agg(m order by date desc)::float[] derniers, max(date)::text dernier_date
       from (select t.date, -t.montant m from transactions t where f.motif is not null and ${RATTACHE}
             order by t.date desc limit 3) x
     ) d on true
     where f.actif order by f.categorie, f.libelle`,
  );
  return lignes.map((f) => {
    const derniers = f.derniers as number[];
    const attendu = f.montant ?? (derniers.length ? derniers.reduce((a, b) => a + b, 0) / derniers.length : null);
    const n = PAR_AN[f.periodicite as Periodicite];
    let prochaine: string | null = null;
    if (f.dernier_date) {
      const d = new Date(f.dernier_date);
      d.setMonth(d.getMonth() + 12 / n);
      prochaine = d.toISOString().slice(0, 10);
    }
    return { ...f, attendu, par_mois: ((attendu ?? 0) * n) / 12, dernier: derniers[0] ?? null, prochaine } as FraisFixe;
  });
}

