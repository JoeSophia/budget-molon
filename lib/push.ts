// Notifications Web Push (VAPID). La clé privée est dans VAPID_PRIVATE_KEY (secret Vercel) ; sans elle, rien n'est envoyé.
import webpush from "web-push";
import { sql } from "@/lib/db";

export const VAPID_PUBLIC_KEY = "BGqaRobRWyw4WWtFPZUyHmdn1v1oPRSkzir8_DQihNkMsMePfDxzOzP098DOOm3wxectN3VVGjwF1mWVxPovGA0";

export async function notifier(titre: string, corps: string, url = "/alertes") {
  if (!process.env.VAPID_PRIVATE_KEY) return 0;
  webpush.setVapidDetails("https://budget-molon.vercel.app", VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  let envoyees = 0;
  for (const a of await sql`select endpoint, abonnement from abonnements_push`) {
    try {
      await webpush.sendNotification(a.abonnement, JSON.stringify({ titre, corps, url }));
      envoyees++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sql`delete from abonnements_push where endpoint = ${a.endpoint}`; // appareil désabonné
      else console.error("Push", code, e);
    }
  }
  return envoyees;
}
