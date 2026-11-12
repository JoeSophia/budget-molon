"use client";
// Ligne de dépense (spec §7) : ♂/♀, catégorie au clic, note, remboursement, exceptionnel, indispensable, tags, passage en frais fixe.
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Depense } from "@/lib/budget";
import { CATEGORIES } from "@/lib/categories";
import { euros } from "@/lib/format";
import {
  annulerRemboursements, basculerExceptionnel, basculerTag, changerCategorie, definirEssentiel, entreesDisponibles, noter, rembourser,
} from "./actions";

const QUI = { cj: "♂", cs: "♀", cc: "" };
const bouton = "rounded px-1.5 py-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 aria-pressed:bg-amber-200 dark:aria-pressed:bg-amber-900";
const champ = "rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700";
type Entree = Awaited<ReturnType<typeof entreesDisponibles>>[number];

export default function Ligne({ d, tagsDispo }: { d: Depense; tagsDispo: string[] }) {
  const [panneau, setPanneau] = useState<"cat" | "note" | "remb" | "tag" | null>(null);
  const [enCours, demarrer] = useTransition();
  const [entrees, setEntrees] = useState<Entree[] | null>(null);
  const agir = (f: () => Promise<unknown>) => demarrer(async () => { await f(); setPanneau(null); });
  const ouvrir = (p: typeof panneau) => setPanneau(panneau === p ? null : p);
  const motif = d.libelle.replace(/^(Prlv|Cb) /, "").split(" ").slice(0, 3).join(" ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return (
    <li className={`px-3 py-2 ${enCours ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mr-1 inline-block w-4 text-center" aria-label={d.compte === "cj" ? "Jonathan" : d.compte === "cs" ? "Séverine" : "Compte joint"}>
            {QUI[d.compte]}
          </span>
          <span className="text-sm text-neutral-500">{new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>{" "}
          <span className="break-words">{d.libelle}</span>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <div className="font-medium">{euros(-d.net)}</div>
          {d.rembourse > 0 && <div className="text-xs text-neutral-500">sur {euros(-d.montant)}, {euros(d.rembourse)} remboursé</div>}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-sm">
        <button className={`${bouton} underline decoration-dotted`} onClick={() => ouvrir("cat")} aria-expanded={panneau === "cat"}>{d.categorie}</button>
        <button className={`${bouton} ${d.essentiel ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400"}`}
                onClick={() => agir(() => definirEssentiel(d.id, !d.essentiel))} title="Changer indispensable / accessoire">
          {d.essentiel ? "indispensable" : "accessoire"}
        </button>
        <button className={bouton} onClick={() => ouvrir("note")} aria-label="Note" aria-pressed={!!d.note}>📝</button>
        <button className={bouton} aria-label="Remboursement" aria-pressed={d.rembourse > 0}
                onClick={() => { ouvrir("remb"); if (!entrees) entreesDisponibles().then(setEntrees); }}>↺</button>
        <button className={bouton} aria-label="Exceptionnel" aria-pressed={d.exceptionnel} onClick={() => agir(() => basculerExceptionnel(d.id))}>◆</button>
        <button className={bouton} aria-label="Tags" aria-pressed={d.tags.length > 0} onClick={() => ouvrir("tag")}>🏷</button>
        {d.tags.map((t) => <span key={t} className="rounded-full bg-sky-100 px-2 text-xs text-sky-900 dark:bg-sky-950 dark:text-sky-200">{t}</span>)}
        <Link className={`${bouton} text-xs text-neutral-500`}
              href={`/fixes/nouveau?${new URLSearchParams({ libelle: d.libelle.split(" ").slice(0, 4).join(" "), montant: String(-d.montant), categorie: d.categorie, motif })}`}>
          → fixe
        </Link>
      </div>
      {d.note && panneau !== "note" && <p className="mt-1 text-sm italic text-neutral-600 dark:text-neutral-400">{d.note}</p>}

      {panneau === "cat" && (
        <form className="mt-2 flex flex-wrap items-center gap-2 text-sm"
              action={(f) => agir(() => changerCategorie(d.id, String(f.get("categorie")), f.get("toujours") === "on"))}>
          <select name="categorie" defaultValue={d.categorie} className={champ} aria-label="Catégorie">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1"><input type="checkbox" name="toujours" /> toujours pour ce commerçant</label>
          <button className="rounded bg-emerald-700 px-2 py-1 text-white">OK</button>
        </form>
      )}
      {panneau === "note" && (
        <form className="mt-2 flex gap-2 text-sm" action={(f) => agir(() => noter(d.id, String(f.get("note"))))}>
          <input name="note" defaultValue={d.note ?? ""} autoFocus className={`${champ} flex-1`} aria-label="Note" />
          <button className="rounded bg-emerald-700 px-2 py-1 text-white">OK</button>
        </form>
      )}
      {panneau === "remb" && (
        <div className="mt-2 text-sm">
          {d.rembourse > 0 && (
            <button className="mb-2 text-red-700 underline dark:text-red-400" onClick={() => agir(() => annulerRemboursements(d.id))}>
              Annuler le remboursement ({euros(d.rembourse)})
            </button>
          )}
          {!entrees ? <p>Chargement…</p> : !entrees.length ? <p>Aucune entrée d&apos;argent disponible sur 90 jours.</p> : (
            <form className="flex flex-col gap-2"
                  action={(f) => agir(() => rembourser(d.id, String(f.get("entree")), Number(String(f.get("montant")).replace(",", "."))))}>
              <fieldset className="max-h-48 overflow-y-auto">
                <legend className="mb-1">Entrée d&apos;argent qui rembourse cette dépense :</legend>
                {entrees.map((e, i) => (
                  <label key={e.id} className="flex gap-2 py-0.5">
                    <input type="radio" name="entree" value={e.id} defaultChecked={i === 0} required />
                    <span>{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {e.libelle.slice(0, 50)} ·{" "}
                      <strong>{euros(e.reste)}</strong>{e.reste < e.montant && " restant"}</span>
                  </label>
                ))}
              </fieldset>
              <label className="flex items-center gap-2">Montant remboursé
                <input name="montant" inputMode="decimal" defaultValue={(-d.net).toFixed(2)} className={`${champ} w-28`} />
              </label>
              <button className="self-start rounded bg-emerald-700 px-2 py-1 text-white">Rattacher</button>
            </form>
          )}
        </div>
      )}
      {panneau === "tag" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {tagsDispo.map((t) => (
            <label key={t} className="flex items-center gap-1">
              <input type="checkbox" defaultChecked={d.tags.includes(t)} onChange={() => demarrer(() => basculerTag(d.id, t))} /> {t}
            </label>
          ))}
          <form className="flex gap-1" action={(f) => agir(() => basculerTag(d.id, String(f.get("nom"))))}>
            <input name="nom" placeholder="Nouveau tag" className={`${champ} w-32`} aria-label="Nouveau tag" />
            <button className="rounded bg-emerald-700 px-2 py-1 text-white">Ajouter</button>
          </form>
        </div>
      )}
    </li>
  );
}
