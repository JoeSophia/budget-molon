// Synchronisation bancaire, appelée par GitHub Actions (.github/workflows/synchro.yml) avec le jeton CRON_SECRET.
import { session, transactions } from "@/lib/banque";
import { categoriser, libelle, type Connue } from "@/lib/categories";
import { verifierAlertes } from "@/lib/alertes";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(null, { status: 401 });
  }
  const s = session();
  if (s.valid_until.slice(0, 10) <= new Date().toISOString().slice(0, 10)) {
    return Response.json({ erreur: "Autorisation bancaire expirée" }, { status: 500 });
  }
  // 30 jours suffisent : on passe 4 fois par jour, et tout ce qui a été reçu reste en base
  const depuis = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const recues = (await Promise.all(Object.entries(s.comptes).map(async ([uid, compte]) =>
    (await transactions(uid, depuis)).map((t) => ({ compte, t }))))).flat();

  const [existantes, regles, connues, tags] = await Promise.all([
    sql`select id, cle from transactions where date >= ${depuis}::date - 90`,
    sql`select motif, categorie from regles_commercant`,
    sql`select libelle lib, montant > 0 credit, categorie from transactions where categorie <> 'A catégoriser' order by date, recu_le`,
    sql`select id, motif_libelle, debut::text, fin::text from tags where motif_libelle is not null`,
  ]);
  const ids = new Set(existantes.map((r) => r.id as string));
  const cles = new Set(existantes.map((r) => r.cle as string));
  const parRegle = Object.fromEntries(regles.map((r) => [r.motif, r.categorie]));

  const lignes = recues.map(({ compte, t }) => ({
    id: t.entry_reference, compte, date: t.transaction_date ?? t.booking_date, // cartes : date d'achat, pas celle du débit différé
    date_debit: t.booking_date ?? null, libelle: libelle(t.remittance_information),
    montant: Number(t.transaction_amount.amount) * (t.credit_debit_indicator === "DBIT" ? -1 : 1),
    statut: t.status, mcc: t.merchant_category_code ?? null, cle: "", categorie: "",
  }));
  // Déjà en base : la donnée récente l'emporte, les choix faits à la main restent
  const maj = new Map(lignes.filter((l) => ids.has(l.id)).map((l) => [l.id, l]));
  const nouvelles = new Map(lignes.filter((l) => !ids.has(l.id)).map((l) => [l.id, l]));
  for (const l of nouvelles.values()) {
    l.cle = `${l.date}_${Math.round(l.montant * 100)}_${l.compte}`;
    while (cles.has(l.cle)) l.cle += "b";
    cles.add(l.cle);
    l.categorie = categoriser(l.libelle, l.montant, l.mcc, parRegle, connues as Connue[]);
  }

  await sql`update transactions t set date = n.date, date_debit = n.date_debit, libelle = n.libelle, montant = n.montant,
              statut = n.statut, mcc = n.mcc
            from json_populate_recordset(null::transactions, ${JSON.stringify([...maj.values()])}::json) n where t.id = n.id`;
  await sql`insert into transactions (id, compte, date, date_debit, libelle, montant, statut, mcc, categorie, cle)
            select id, compte, date, date_debit, libelle, montant, statut, mcc, categorie, cle
            from json_populate_recordset(null::transactions, ${JSON.stringify([...nouvelles.values()])}::json)
            on conflict (id) do nothing`;

  // Tags automatiques sur le libellé (ceux sur la note s'appliquent quand on écrit la note)
  const tagues = tags.flatMap((g) => [...nouvelles.values()]
    .filter((t) => t.montant < 0 && (!g.debut || t.date >= g.debut) && (!g.fin || t.date <= g.fin) && new RegExp(g.motif_libelle, "i").test(t.libelle))
    .map((t) => ({ transaction_id: t.id, tag_id: g.id })));
  await sql`insert into transaction_tags select * from json_populate_recordset(null::transaction_tags, ${JSON.stringify(tagues)}::json)
            on conflict do nothing`;

  const alertes = await verifierAlertes(new Set(nouvelles.keys()));

  return Response.json({
    alertes: alertes.length, recues: recues.length, nouvelles: nouvelles.size, mises_a_jour: maj.size, tags: tagues.length,
    a_categoriser: [...nouvelles.values()].filter((t) => t.categorie === "A catégoriser").length, autorisation_jusqu_au: s.valid_until.slice(0, 10),
  });
}
