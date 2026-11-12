"use server";
// Actions d'une ligne de dépense et des prévus. Chacune vérifie la connexion : une action serveur est appelable par tous.
import { refresh } from "next/cache";
import { connecte } from "@/auth";
import { INTERNE, POSTES } from "@/lib/budget";
import { CATEGORIES, norm } from "@/lib/categories";
import { sql } from "@/lib/db";

export async function changerCategorie(id: string, categorie: string, toujours: boolean) {
  await connecte();
  if (!CATEGORIES.includes(categorie)) throw new Error("Catégorie inconnue");
  const [t] = await sql`update transactions set categorie = ${categorie}, categorie_manuelle = true where id = ${id} returning libelle, montant`;
  if (toujours && t) {
    const motif = norm(t.libelle).slice(0, 30);
    await sql`insert into regles_commercant (motif, categorie) values (${motif}, ${categorie})
              on conflict (motif) do update set categorie = ${categorie}`;
    // Même commerçant, même sens, pas encore choisi à la main : on applique la règle tout de suite
    const memes = (await sql`select id, libelle from transactions where not categorie_manuelle and sign(montant) = sign(${t.montant}::numeric)`)
      .filter((x) => norm(x.libelle).slice(0, 30) === motif).map((x) => x.id);
    await sql`update transactions set categorie = ${categorie} where id = any(${memes})`;
  }
  refresh();
}

export async function noter(id: string, note: string) {
  await connecte();
  const texte = note.trim() || null;
  await sql`update transactions set note = ${texte} where id = ${id}`;
  if (texte) {
    // Tags automatiques sur la note (ex. « gilles » -> Grand Est), dans leur période
    const [t] = await sql`select date::text from transactions where id = ${id}`;
    for (const g of await sql`select id, motif_note, debut::text, fin::text from tags where motif_note is not null`) {
      if ((!g.debut || t.date >= g.debut) && (!g.fin || t.date <= g.fin) && new RegExp(g.motif_note, "i").test(texte)) {
        await sql`insert into transaction_tags values (${id}, ${g.id}) on conflict do nothing`;
      }
    }
  }
  refresh();
}

export async function basculerExceptionnel(id: string) {
  await connecte();
  await sql`update transactions set exceptionnel = not exceptionnel where id = ${id}`;
  refresh();
}

export async function definirEssentiel(id: string, essentiel: boolean) {
  await connecte();
  await sql`update transactions set essentiel = ${essentiel} where id = ${id}`;
  refresh();
}

export async function basculerTag(id: string, nom: string) {
  await connecte();
  const n = nom.trim();
  if (!n) return;
  const [g] = await sql`insert into tags (nom) values (${n}) on conflict (nom) do update set nom = excluded.nom returning id`;
  const [suppr] = await sql`delete from transaction_tags where transaction_id = ${id} and tag_id = ${g.id} returning 1`;
  if (!suppr) await sql`insert into transaction_tags values (${id}, ${g.id})`;
  refresh();
}

/** Entrées d'argent des 90 derniers jours avec ce qu'il en reste à rattacher. */
export async function entreesDisponibles() {
  await connecte();
  return (await sql`
    select t.id, t.date::text, t.libelle, t.montant::float,
           (t.montant - coalesce((select sum(r.montant) from remboursements r where r.entree_id = t.id), 0))::float reste
    from transactions t
    where t.montant > 0 and t.date >= current_date - 90
      and t.categorie not in ('Salaires', 'Allocations et pensions', 'Virements internes', 'Epargne')
      and t.libelle !~* ${INTERNE}
    order by t.date desc`).filter((e) => e.reste > 0) as { id: string; date: string; libelle: string; montant: number; reste: number }[];
}

export async function rembourser(depenseId: string, entreeId: string, montant: number) {
  await connecte();
  if (!(montant > 0)) throw new Error("Montant invalide");
  await sql`insert into remboursements (depense_id, entree_id, montant) values (${depenseId}, ${entreeId}, ${montant})
            on conflict (depense_id, entree_id) do update set montant = remboursements.montant + ${montant}`;
  refresh();
}

export async function annulerRemboursements(depenseId: string) {
  await connecte();
  await sql`delete from remboursements where depense_id = ${depenseId}`;
  refresh();
}

/** Nouveau prévu pour un poste ; la différence est prise sur (ou rendue à) un autre poste, ou sur « non réparti » (compense = ""). */
export async function changerPrevu(mois: string, posteModifie: string, montant: number, compense: string) {
  await connecte();
  if (!POSTES.includes(posteModifie) || (compense && !POSTES.includes(compense)) || !(montant >= 0)) throw new Error("Prévu invalide");
  const [avant] = await sql`select montant::float from previsions where mois = ${mois} and poste = ${posteModifie}`;
  const ecart = montant - (avant?.montant ?? 0);
  await sql`insert into previsions values (${mois}, ${posteModifie}, ${montant})
            on conflict (mois, poste) do update set montant = ${montant}`;
  if (compense) {
    await sql`insert into previsions values (${mois}, ${compense}, greatest(0, ${-ecart}::numeric))
              on conflict (mois, poste) do update set montant = greatest(0, previsions.montant - ${ecart})`;
  }
  refresh();
}
