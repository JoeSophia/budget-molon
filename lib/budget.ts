// Frais variables : périodes, dépenses nettes, enveloppe et prévus par poste (spec §6).
import { essentielParDefaut, GROUPES } from "@/lib/categories";
import { sql } from "@/lib/db";
import { EST_FIXE, fraisFixes } from "@/lib/fixes";

export type Periode = "semaine" | "mois" | "annee";
export const PERIODES: Record<Periode, string> = { semaine: "Semaine", mois: "Mois", annee: "Année" };

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const JOUR = 864e5;
export const aujourdhui = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ

/** Bornes de la période qui contient ref, périodes voisines et part déjà écoulée (0 à 1). */
export function bornes(periode: Periode, ref: string) {
  const d = new Date(`${ref}T00:00:00Z`), y = d.getUTCFullYear(), m = d.getUTCMonth();
  let debut: number, fin: number, prec: number, suiv: number, libelle: string;
  if (periode === "semaine") {
    debut = d.getTime() - ((d.getUTCDay() + 6) % 7) * JOUR; // lundi
    fin = debut + 6 * JOUR; prec = debut - 7 * JOUR; suiv = debut + 7 * JOUR;
    libelle = `Semaine du ${new Date(debut).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })}`;
  } else if (periode === "mois") {
    debut = Date.UTC(y, m, 1); fin = Date.UTC(y, m + 1, 0); prec = Date.UTC(y, m - 1, 1); suiv = Date.UTC(y, m + 1, 1);
    libelle = new Date(debut).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  } else {
    debut = Date.UTC(y, 0, 1); fin = Date.UTC(y, 11, 31); prec = Date.UTC(y - 1, 0, 1); suiv = Date.UTC(y + 1, 0, 1);
    libelle = String(y);
  }
  const t = new Date(`${aujourdhui()}T00:00:00Z`).getTime();
  const ecoule = Math.min(1, Math.max(0, (t - debut + JOUR) / (fin - debut + JOUR)));
  return { debut: iso(debut), fin: iso(fin), prec: iso(prec), suiv: iso(suiv), libelle, ecoule };
}

// Hors budget : épargne, virements entre nos comptes, débit mensuel des cartes (déjà compté achat par achat), frais pro
export const INTERNE = "Prlv Carte Depenses Carte|Vir Inst De Jonathan Alexandre|Vir Inst De Mme Severine Molon";
const HORS_BUDGET = `(t.categorie in ('Epargne', 'Virements internes', 'Dépenses pro') or t.libelle ~* '${INTERNE}')`;

/** Sous-catégorie -> poste, celles du code plus celles ajoutées depuis l'app. */
export async function groupes(): Promise<Record<string, string>> {
  const ajoutees = await sql`select nom, poste from categories`;
  return { ...GROUPES, ...Object.fromEntries(ajoutees.map((c) => [c.nom, c.poste])) };
}

// Postes pilotés par un prévu : tous sauf le prêt (fixe) et « À catégoriser »
export const postes = async (g?: Record<string, string>) =>
  [...new Set(Object.values(g ?? await groupes()))].filter((p) => p !== "Prêt immobilier" && p !== "À catégoriser").sort((a, b) => a.localeCompare(b, "fr"));

export type Depense = {
  id: string; compte: "cc" | "cj" | "cs"; date: string; libelle: string; montant: number; rembourse: number; net: number;
  categorie: string; poste: string; exceptionnel: boolean; essentiel: boolean; essentiel_force: boolean | null;
  note: string | null; tags: string[];
};

/** Dépenses variables de la période, nettes des remboursements ; celles remboursées en entier sont masquées. */
export async function depenses(debut: string, fin: string): Promise<Depense[]> {
  const lignes = await sql.query(
    `select t.id, t.compte, t.date::text, t.libelle, t.montant::float, t.categorie, t.exceptionnel, t.essentiel, t.note,
            coalesce((select sum(r.montant) from remboursements r where r.depense_id = t.id), 0)::float rembourse,
            array(select g.nom from transaction_tags tt join tags g on g.id = tt.tag_id where tt.transaction_id = t.id order by g.nom) tags
     from transactions t
     where t.montant < 0 and t.date between $1 and $2 and not ${EST_FIXE} and not ${HORS_BUDGET}
     order by t.date desc, t.montant`,
    [debut, fin],
  );
  const g = await groupes();
  return lignes
    .map((t) => ({
      ...t, net: Math.min(0, t.montant + t.rembourse), poste: g[t.categorie] ?? "Divers", essentiel_force: t.essentiel,
      essentiel: t.essentiel ?? essentielParDefaut(t.categorie, g[t.categorie] ?? "Divers"),
    }) as Depense)
    .filter((t) => t.net < 0);
}

export async function parametre<T>(cle: string): Promise<T> {
  return (await sql`select valeur from parametres where cle = ${cle}`)[0]?.valeur as T;
}

/** Enveloppe du mois = revenus du mois précédent − épargne − frais fixes mensualisés. mois : AAAA-MM-01. */
export async function enveloppe(mois: string) {
  const [{ revenus }] = await sql`
    select coalesce(sum(montant), 0)::float revenus from transactions
    where categorie in ('Salaires', 'Allocations et pensions')
      and date >= ${mois}::date - interval '1 month' and date < ${mois}::date
      and id not in (select entree_id from remboursements)`;
  const epargne = Number(await parametre("epargne_mensuelle"));
  const fixes = (await fraisFixes()).reduce((s, f) => s + f.par_mois, 0);
  return { revenus, epargne, fixes, montant: revenus - epargne - fixes };
}

/**
 * Prévus du mois par poste. Au premier affichage d'un mois, on reprend ceux du dernier mois connu ;
 * s'il n'y en a aucun, on répartit l'enveloppe au prorata des dépenses des 3 mois précédents.
 */
export async function prevus(mois: string): Promise<Record<string, number>> {
  const POSTES = await postes();
  let lignes = await sql`select poste, montant::float from previsions where mois = ${mois}`;
  if (!lignes.length) {
    const [prec] = await sql`select max(mois)::text mois from previsions where mois < ${mois}`;
    if (prec.mois) {
      await sql`insert into previsions (mois, poste, montant) select ${mois}, poste, montant from previsions where mois = ${prec.mois}
                on conflict do nothing`;
    } else {
      const d = new Date(`${mois}T00:00:00Z`);
      const debut = iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 3, 1)), fin = iso(d.getTime() - JOUR);
      const parPoste: Record<string, number> = Object.fromEntries(POSTES.map((p) => [p, 0]));
      for (const t of await depenses(debut, fin)) if (t.poste in parPoste) parPoste[t.poste] -= t.net / 3;
      const total = Object.values(parPoste).reduce((a, b) => a + b, 0);
      const env = (await enveloppe(mois)).montant;
      const echelle = env > 0 && total > 0 ? env / total : 1;
      const valeurs = POSTES.map((p) => ({ mois, poste: p, montant: Math.floor((parPoste[p] * echelle) / 10) * 10 }));
      await sql`insert into previsions (mois, poste, montant)
                select mois, poste, montant from json_populate_recordset(null::previsions, ${JSON.stringify(valeurs)}::json)
                on conflict do nothing`;
    }
    lignes = await sql`select poste, montant::float from previsions where mois = ${mois}`;
  }
  return Object.fromEntries(POSTES.map((p) => [p, lignes.find((l) => l.poste === p)?.montant ?? 0]));
}

/** Prévu d'un poste sur la période : semaine = mois × 12 ÷ 52, année = somme des 12 mois (mois sans prévu : ceux du mois de ref). */
export async function prevusPeriode(periode: Periode, ref: string) {
  const mois = `${ref.slice(0, 7)}-01`;
  const duMois = await prevus(mois);
  if (periode === "mois") return duMois;
  if (periode === "semaine") return Object.fromEntries(Object.entries(duMois).map(([p, v]) => [p, (v * 12) / 52]));
  const POSTES = Object.keys(duMois);
  const annee = await sql`select mois::text, poste, montant::float from previsions where extract(year from mois) = ${Number(ref.slice(0, 4))}`;
  const connus = new Set(annee.map((l) => l.mois));
  const manquants = 12 - connus.size;
  return Object.fromEntries(POSTES.map((p) => [p,
    annee.filter((l) => l.poste === p).reduce((s, l) => s + l.montant, 0) + manquants * duMois[p]]));
}
