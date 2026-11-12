import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connecte } from "@/auth";
import { fraisFixes } from "@/lib/fixes";
import Entete from "../../Entete";
import { supprimer } from "../actions";
import Formulaire, { type Valeurs } from "../Formulaire";

// /fixes/nouveau?libelle=…&montant=…&categorie=…&motif=… : « passer en frais fixe » depuis une dépense
export default function Fiche({ params, searchParams }: PageProps<"/fixes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4">
      <Entete />
      <Link href="/fixes" className="text-sm underline">← Frais fixes</Link>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Contenu({ params, searchParams }: PageProps<"/fixes/[id]">) {
  await connecte();
  const { id } = await params;
  let initial: Valeurs;
  if (id === "nouveau") {
    const q = await searchParams;
    const texte = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
    initial = { libelle: texte("libelle"), categorie: texte("categorie"), motif: texte("motif"),
                montant: texte("montant") ? Math.abs(Number(texte("montant"))) : null };
  } else {
    const f = (await fraisFixes()).find((f) => f.id === Number(id));
    if (!f) notFound();
    initial = { ...f, moyenne: f.montant === null ? f.attendu : null };
  }
  return (
    <>
      <h1 className="text-2xl font-semibold">{initial.id ? initial.libelle : "Nouveau frais fixe"}</h1>
      <Formulaire initial={initial} />
      {initial.id && (
        <form action={supprimer} className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <input type="hidden" name="id" value={initial.id} />
          <button className="text-sm text-red-700 underline dark:text-red-400">Retirer des frais fixes</button>
        </form>
      )}
    </>
  );
}
