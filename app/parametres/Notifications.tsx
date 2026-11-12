"use client";
// Abonnement de cet appareil aux notifications. Sur iPhone : seulement depuis l'app ajoutée à l'écran d'accueil.
import { useEffect, useState } from "react";
import { abonner, desabonner, tester } from "./actions";

const cle = (b64: string) => Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export default function Notifications({ clePublique }: { clePublique: string }) {
  const [etat, setEtat] = useState<"inconnu" | "impossible" | "actif" | "inactif">("inconnu");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Promise.resolve : l'état change après l'effet, pas pendant
    Promise.resolve()
      .then(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("non pris en charge");
        return navigator.serviceWorker.register("/sw.js");
      })
      .then((r) => r.pushManager.getSubscription())
      .then((a) => setEtat(a ? "actif" : "inactif"))
      .catch(() => setEtat("impossible"));
  }, []);

  async function activer() {
    if ((await Notification.requestPermission()) !== "granted") return setMessage("Notifications refusées dans les réglages du téléphone.");
    const r = await navigator.serviceWorker.ready;
    const a = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cle(clePublique) });
    await abonner(a.toJSON());
    setEtat("actif");
    setMessage("Notifications activées sur cet appareil.");
  }

  async function couper() {
    const a = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (a) { await desabonner(a.endpoint); await a.unsubscribe(); }
    setEtat("inactif");
    setMessage("Notifications coupées sur cet appareil.");
  }

  const bouton = "rounded-lg px-3 py-1.5 text-sm font-medium";
  return (
    <div className="flex flex-col gap-2">
      {etat === "impossible" && (
        <p className="text-sm">Ce navigateur ne gère pas les notifications. Sur iPhone : Partager → « Sur l&apos;écran d&apos;accueil », puis ouvrir l&apos;app depuis l&apos;icône.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {etat === "inactif" && <button onClick={activer} className={`${bouton} bg-emerald-700 text-white`}>Activer sur cet appareil</button>}
        {etat === "actif" && (
          <>
            <button onClick={couper} className={`${bouton} border border-neutral-300 dark:border-neutral-700`}>Couper sur cet appareil</button>
            <button onClick={async () => setMessage(`${await tester()} notification(s) envoyée(s).`)}
                    className={`${bouton} border border-neutral-300 dark:border-neutral-700`}>Envoyer un test</button>
          </>
        )}
      </div>
      <p className="text-sm" aria-live="polite">{message}</p>
    </div>
  );
}
