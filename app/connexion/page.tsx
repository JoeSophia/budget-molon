import { Suspense } from "react";
import { signIn } from "@/auth";

export default function Connexion({ searchParams }: PageProps<"/connexion">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">Budget Molon</h1>
      <Suspense>
        <Erreur searchParams={searchParams} />
      </Suspense>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          Se connecter avec Google
        </button>
      </form>
    </main>
  );
}

async function Erreur({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="max-w-xs text-sm text-red-700 dark:text-red-400">
      Connexion refusée : seuls les comptes Google de Jonathan et Séverine ont accès.
    </p>
  );
}
