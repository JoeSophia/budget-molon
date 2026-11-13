// Migration du 2026-11-13 : 15 postes / 56 sous-catégories ramenés à 11 postes / 34 sous-catégories.
// Renomme les catégories en base (transactions, règles, frais fixes) et fusionne les prévus des postes regroupés.
// Usage : node --env-file=.env.local scripts/renommer-categories.mjs (rejouable : ne trouve plus rien la 2e fois)
import { Pool } from "@neondatabase/serverless";

export const SOUS_CATEGORIES = {
  "Supermarché / Epicerie": "Courses", "Alimentation - Autres": "Courses",
  "Sortie au restaurant": "Restaurants", "Fast foods": "Restaurants", "Café": "Restaurants",
  "Vêtements/Chaussures": "Vêtements", "High Tech": "High-tech", "Achats & Shopping - Autres": "Shopping divers",
  "Péage": "Péage & stationnement", "Stationnement": "Péage & stationnement", "Auto & Transports - Autres": "Auto divers",
  "Location de véhicule": "Train, bus, location", "Transports en commun": "Train, bus, location", "Billets de train": "Train, bus, location",
  "Electricité": "Énergie & eau", "Eau": "Énergie & eau", "Logement - Autres": "Maison divers",
  "Extérieur et jardin": "Jardin, déco, travaux", "Décoration": "Jardin, déco, travaux", "Travaux maison": "Jardin, déco, travaux",
  "Sports d'hiver": "Sport", "Loisirs & Sorties - Autres": "Loisirs divers",
  "Sorties culturelles": "Sorties & culture", "Divertissements": "Sorties & culture",
  "Santé - Autres": "Santé divers", "Ecole": "École", "Fournitures scolaires": "Fournitures", "Scolarité & Enfants - Autres": "Enfants divers",
  "Cosmétique": "Esthétique & cosmétique", "Esthétique & Soins - Autres": "Esthétique & cosmétique",
  "Téléphonie mobile": "Téléphone & internet", "Internet": "Téléphone & internet", "Abonnements - Autres": "Services en ligne",
  "Services Bancaires": "Frais bancaires", "Frais Animaux": "Animaux", "Virements": "Divers", "Banque - Autres": "Divers",
  "Hôtels": "Hébergement", "Voyages / Vacances": "Voyages",
};
const POSTES = {
  "Alimentation & Restau.": "Alimentation", "Achats & Shopping": "Shopping", "Logement": "Maison", "Loisirs & Sorties": "Loisirs",
  "Scolarité & Enfants": "Enfants", "Esthétique & Soins": "Soins & beauté", "Banque & assurances prêt": "Divers", "Dons": "Divers",
};

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const c = await pool.connect();
  try {
    await c.query("begin");
    for (const [ancien, nouveau] of Object.entries(SOUS_CATEGORIES)) {
      const n = [];
      for (const table of ["transactions", "regles_commercant", "frais_fixes"]) {
        n.push((await c.query(`update ${table} set categorie = $2 where categorie = $1`, [ancien, nouveau])).rowCount);
      }
      if (n.some(Boolean)) console.log(`${ancien} -> ${nouveau} : ${n.join(" / ")}`);
    }
    // Assurance de prêt : rangée avec le prêt plutôt que dans les frais bancaires
    await c.query(`update frais_fixes set categorie = 'Assurance prêt' where libelle like 'Assurance prêt%'`);
    for (const [ancien, nouveau] of Object.entries(POSTES)) {
      await c.query(`insert into previsions (mois, poste, montant) select mois, $2, montant from previsions where poste = $1
                     on conflict (mois, poste) do update set montant = previsions.montant + excluded.montant`, [ancien, nouveau]);
      await c.query(`delete from previsions where poste = $1`, [ancien]);
    }
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}
