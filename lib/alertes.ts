// Alertes (spec §8), vérifiées après chaque synchronisation. Une alerte n'est créée qu'une fois grâce à sa clé.
import { session } from "@/lib/banque";
import { aujourdhui, bornes, depenses, parametre, prevus } from "@/lib/budget";
import { sql } from "@/lib/db";
import { euros } from "@/lib/format";
import { notifier } from "@/lib/push";

async function creer(cle: string, type: string, message: string) {
  return (await sql`insert into alertes (cle, type, message) values (${cle}, ${type}, ${message})
                    on conflict (cle) do nothing returning id`).length > 0;
}

/** nouvelles : id des transactions reçues à cette synchronisation. Renvoie les messages des alertes créées. */
export async function verifierAlertes(nouvelles: Set<string>) {
  const [seuil, seuils] = await Promise.all([parametre<number>("seuil_grosse_depense"), parametre<number[]>("seuils_jauge")]);
  const mois = bornes("mois", aujourdhui());
  const [liste, prevu] = await Promise.all([depenses(mois.debut, mois.fin), prevus(mois.debut)]);
  const envoyer: string[] = [];

  for (const d of liste) {
    if (nouvelles.has(d.id) && -d.net >= Number(seuil)) {
      const m = `Grosse dépense : ${d.libelle.slice(0, 40)}, ${euros(-d.net)} (${d.categorie})`;
      if (await creer(`grosse:${d.id}`, "grosse_depense", m)) envoyer.push(m);
    }
  }
  // Jauges du mois : on enregistre chaque seuil atteint, mais on ne notifie que le plus haut
  for (const [poste, p] of Object.entries(prevu)) {
    const depense = -liste.filter((d) => d.poste === poste).reduce((s, d) => s + d.net, 0);
    const pct = p > 0 ? (depense / p) * 100 : 0;
    let plusHaut: string | null = null;
    for (const s of [...seuils].sort((a, b) => a - b)) {
      const m = `${poste} : ${Math.round(pct)} % du prévu du mois (${euros(depense)} / ${euros(p)})`;
      if (pct >= s && (await creer(`jauge:${mois.debut}:${poste}:${s}`, "jauge", m))) plusHaut = m;
    }
    if (plusHaut) envoyer.push(plusHaut);
  }
  const fin = session().valid_until.slice(0, 10);
  const jours = Math.round((new Date(fin).getTime() - new Date(aujourdhui()).getTime()) / 864e5);
  if (jours <= 14) {
    const m = `Autorisation bancaire : expire le ${new Date(fin).toLocaleDateString("fr-FR")}, à renouveler (py eb.py lien …)`;
    if (await creer(`banque:${fin}`, "banque", m)) envoyer.push(m);
  }

  for (const m of envoyer) await notifier("Budget Molon", m);
  return envoyer;
}
