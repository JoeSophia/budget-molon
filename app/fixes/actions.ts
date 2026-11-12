"use server";
import { redirect } from "next/navigation";
import { connecte } from "@/auth";
import { sql } from "@/lib/db";
import { PAR_AN } from "@/lib/format";

const nombre = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Montant invalide : ${s}`);
  return n;
};

export async function enregistrer(formData: FormData) {
  await connecte();
  const id = Number(formData.get("id")) || null;
  const libelle = String(formData.get("libelle") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "");
  const periodicite = String(formData.get("periodicite"));
  const motif = String(formData.get("motif") ?? "").trim() || null;
  const montant = nombre(formData.get("montant")), filtre = nombre(formData.get("filtre_montant"));
  if (!libelle || !categorie || !(periodicite in PAR_AN)) throw new Error("Libellé, catégorie et périodicité obligatoires");
  if (motif) new RegExp(motif); // motif illisible : erreur ici plutôt qu'à l'affichage de la liste
  if (id) {
    await sql`update frais_fixes set libelle = ${libelle}, categorie = ${categorie}, periodicite = ${periodicite}, motif = ${motif},
              montant = ${montant}, filtre_montant = ${filtre} where id = ${id}`;
  } else {
    await sql`insert into frais_fixes (libelle, categorie, periodicite, motif, montant, filtre_montant)
              values (${libelle}, ${categorie}, ${periodicite}, ${motif}, ${montant}, ${filtre})`;
  }
  redirect("/fixes");
}

export async function supprimer(formData: FormData) {
  await connecte();
  await sql`delete from frais_fixes where id = ${Number(formData.get("id"))}`;
  redirect("/fixes");
}
