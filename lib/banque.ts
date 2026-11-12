// Accès Enable Banking (DSP2), repris de Suivi-Depenses/eb.py.
// EB_PRIVATE_KEY : clé privée PEM de l'application ; EB_APP_ID : son identifiant (nom du fichier .pem).
// EB_SESSION : {"session_id", "valid_until", "comptes": {"<uid>": "cc" | "cj" | "cs"}}.
import { createSign } from "node:crypto";

const API = "https://api.enablebanking.com";

export type TransactionEB = {
  entry_reference: string;
  transaction_amount: { amount: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  transaction_date?: string;
  booking_date: string;
  status: string;
  merchant_category_code?: string;
  remittance_information?: string[];
};

function jeton() {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const corps = `${b64({ alg: "RS256", typ: "JWT", kid: process.env.EB_APP_ID })}.${b64({
    iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600,
  })}`;
  return `${corps}.${createSign("RSA-SHA256").update(corps).sign(process.env.EB_PRIVATE_KEY!, "base64url")}`;
}

export function session() {
  return JSON.parse(process.env.EB_SESSION!) as { valid_until: string; session_id: string; comptes: Record<string, "cc" | "cj" | "cs"> };
}

/** Transactions d'un compte depuis une date (la banque refuse au-delà de 90 jours), toutes pages comprises. */
export async function transactions(uid: string, depuis: string) {
  const txs: TransactionEB[] = [];
  let cle: string | undefined;
  do {
    const p = new URLSearchParams({ date_from: depuis, ...(cle && { continuation_key: cle }) });
    const r = await fetch(`${API}/accounts/${uid}/transactions?${p}`, { headers: { Authorization: `Bearer ${jeton()}` } });
    if (!r.ok) throw new Error(`Enable Banking ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    txs.push(...(d.transactions ?? []));
    cle = d.continuation_key || undefined;
  } while (cle);
  return txs;
}
