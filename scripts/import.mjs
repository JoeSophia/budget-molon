// Importe l'historique de l'ancienne page (export JSON produit depuis Suivi-Depenses) dans la base.
// Usage : node --env-file=.env.local scripts/import.mjs <export.json>
// Rejouable : les transactions existantes sont mises à jour, liens et tags recréés à l'identique.
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const fichier = process.argv[2];
if (!fichier) throw new Error("Usage : node --env-file=.env.local scripts/import.mjs <export.json>");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant dans .env.local");
const { transactions, regles, remboursements, tags } = JSON.parse(readFileSync(fichier, "utf8"));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = await pool.connect();
try {
  await db.query("begin");
  for (const t of transactions) {
    await db.query(
      `insert into transactions (id, compte, date, date_debit, libelle, montant, statut, mcc, categorie,
                                 categorie_manuelle, cle, exceptionnel, essentiel, note)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       on conflict (id) do update set compte = $2, date = $3, date_debit = $4, libelle = $5, montant = $6, statut = $7,
         mcc = $8, categorie = $9, categorie_manuelle = $10, cle = $11, exceptionnel = $12, essentiel = $13, note = $14`,
      [t.id, t.compte, t.date, t.date_debit, t.libelle, t.montant, t.statut, t.mcc, t.categorie,
       !!t.categorie_manuelle, t.cle, !!t.exceptionnel, t.essentiel ?? null, t.note ?? null],
    );
  }
  for (const [motif, categorie] of Object.entries(regles)) {
    await db.query(
      "insert into regles_commercant (motif, categorie) values ($1, $2) on conflict (motif) do update set categorie = $2",
      [motif, categorie],
    );
  }
  await db.query("delete from remboursements");
  for (const r of remboursements) {
    await db.query(
      `insert into remboursements (depense_id, entree_id, montant) values ($1, $2, $3)
       on conflict (depense_id, entree_id) do update set montant = remboursements.montant + $3`,
      [r.depense, r.entree, r.montant],
    );
  }
  // Tags : règle sur le libellé ou la note, limitée à la période du tag
  for (const g of tags) {
    const { rows } = await db.query(
      `insert into tags (nom, motif_libelle, motif_note, debut, fin) values ($1, $2, $3, $4, $5)
       on conflict (nom) do update set motif_libelle = $2, motif_note = $3, debut = $4, fin = $5 returning id`,
      [g.nom, g.motif_libelle, g.motif_note, g.debut, g.fin],
    );
    const lib = g.motif_libelle && new RegExp(g.motif_libelle, "i");
    const note = g.motif_note && new RegExp(g.motif_note, "i");
    const vises = transactions.filter((t) => t.montant < 0 && (!g.debut || t.date >= g.debut) && (!g.fin || t.date <= g.fin)
      && ((lib && lib.test(t.libelle)) || (note && t.note && note.test(t.note))));
    for (const t of vises) {
      await db.query("insert into transaction_tags (transaction_id, tag_id) values ($1, $2) on conflict do nothing", [t.id, rows[0].id]);
    }
    console.log(`Tag ${g.nom} : ${vises.length} dépenses`);
  }
  await db.query("commit");
} catch (e) {
  await db.query("rollback");
  throw e;
} finally {
  db.release();
}
const { rows } = await pool.query(
  `select count(*)::int n, min(date)::text debut, max(date)::text fin,
          (select count(*)::int from remboursements) remb, (select count(*)::int from regles_commercant) regles
   from transactions`,
);
console.log(rows[0]);
await pool.end();
