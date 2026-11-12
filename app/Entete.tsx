import Link from "next/link";
import { signOut } from "@/auth";

export default function Entete() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <nav className="flex items-center gap-4">
        <Link href="/" className="text-xl font-semibold">Budget Molon</Link>
        <Link href="/fixes" className="underline-offset-4 hover:underline">Frais fixes</Link>
      </nav>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/connexion" });
        }}
      >
        <button className="text-sm underline">Se déconnecter</button>
      </form>
    </header>
  );
}
