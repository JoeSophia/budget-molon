// Frais fixes reconnus par l'ancien système (FIXES de analyse.py), en mensuel, montant = moyenne des 3 derniers.
// Usage : node --env-file=.env.local scripts/seed-fixes.mjs (ne fait rien si la table est déjà remplie)
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const FIXES = [
  ["Prêt immobilier", "Remboursement De Pret"],
  ["Assurance prêt (contrat 97)", "Kereis.*00017343697"],
  ["Assurance prêt (contrat 98)", "Kereis.*00017343698"],
  ["Assurance auto Allianz", "Allianz Direct"],
  ["Assurance habitation GMF", "Gmf Assurances"],
  ["Électricité Urban Solar", "Urban Solar"],
  ["Aralis Filtrabio", "Aralis Filtrabio"],
  ["Taxe foncière", "Impot Tf"],
  ["Offre Premium", "Offre Premium"],
  ["Eau Suez", "Suez Eau"],
  ["Bouygues Telecom", "Bouygues Telecom"],
  ["Orange mobile", "Orange.*Abonnement Mobile"],
  ["Orange fibre", "Orange.*Abonnement Fibre"],
  ["Google One", "Google One"],
  ["Cotisation carte", "Cotisation Carte"],
  ["Hello Asso", "Hello Asso", 26],
];
if ((await sql`select count(*)::int n from frais_fixes`)[0].n) throw new Error("frais_fixes déjà rempli");
for (const [libelle, motif, filtre = null] of FIXES) {
  const [t] = await sql`select categorie from transactions where libelle ~* ${motif} and montant < 0 order by date desc limit 1`;
  await sql`insert into frais_fixes (libelle, categorie, periodicite, motif, filtre_montant)
            values (${libelle}, ${t?.categorie ?? "A catégoriser"}, 'mensuel', ${motif}, ${filtre})`;
  console.log(libelle, "->", t?.categorie);
}
