// Catégorisation automatique, reprise de Suivi-Depenses/eb_releve.py.

// Sous-catégorie -> poste (GROUPES de analyse.py)
export const GROUPES: Record<string, string> = {
  "Supermarché / Epicerie": "Alimentation & Restau.", "Alimentation - Autres": "Alimentation & Restau.", "Restaurants": "Alimentation & Restau.",
  "Sortie au restaurant": "Alimentation & Restau.", "Fast foods": "Alimentation & Restau.", "Café": "Alimentation & Restau.",
  "Achats & Shopping - Autres": "Achats & Shopping", "Vêtements/Chaussures": "Achats & Shopping", "High Tech": "Achats & Shopping",
  "Articles de sport": "Achats & Shopping", "Cadeaux": "Achats & Shopping",
  "Carburant": "Auto & Transports", "Péage": "Auto & Transports", "Stationnement": "Auto & Transports", "Entretien véhicule": "Auto & Transports",
  "Assurance véhicule": "Auto & Transports", "Auto & Transports - Autres": "Auto & Transports", "Amendes": "Auto & Transports",
  "Location de véhicule": "Auto & Transports", "Transports en commun": "Auto & Transports", "Billets de train": "Auto & Transports",
  "Remboursement emprunt": "Logement (prêt)",
  "Electricité": "Logement", "Eau": "Logement", "Logement - Autres": "Logement", "Assurance habitation": "Logement",
  "Extérieur et jardin": "Logement", "Décoration": "Logement", "Travaux maison": "Logement",
  "Sport": "Loisirs & Sorties", "Padel": "Loisirs & Sorties", "Sports d'hiver": "Loisirs & Sorties", "Loisirs & Sorties - Autres": "Loisirs & Sorties",
  "Sorties culturelles": "Loisirs & Sorties", "Divertissements": "Loisirs & Sorties", "Hobbies": "Loisirs & Sorties",
  "Pharmacie": "Santé", "Médecin": "Santé", "Santé - Autres": "Santé",
  "Ecole": "Scolarité & Enfants", "Fournitures scolaires": "Scolarité & Enfants", "Scolarité & Enfants - Autres": "Scolarité & Enfants",
  "Coiffeur": "Esthétique & Soins", "Cosmétique": "Esthétique & Soins", "Esthétique & Soins - Autres": "Esthétique & Soins",
  "Téléphonie mobile": "Abonnements", "Internet": "Abonnements", "Abonnements - Autres": "Abonnements", "Services en ligne": "Abonnements",
  "Frais bancaires": "Banque & assurances prêt", "Services Bancaires": "Banque & assurances prêt",
  "Impôts sur le revenu": "Impôts", "Impôts fonciers": "Impôts", "Dons": "Dons",
  "Virements": "Divers", "Banque - Autres": "Divers", "Frais Animaux": "Divers",
  "Hôtels": "Vacances", "Voyages / Vacances": "Vacances",
  "A catégoriser": "À catégoriser",
};
export const poste = (categorie: string) => GROUPES[categorie] ?? "Divers";

// Code commerçant -> sous-catégorie
export const MCC: Record<string, string> = {
  "5411": "Supermarché / Epicerie", "5422": "Supermarché / Epicerie", "5499": "Alimentation - Autres", "5462": "Alimentation - Autres",
  "5812": "Restaurants", "5813": "Restaurants", "5814": "Fast foods",
  "5541": "Carburant", "5542": "Carburant", "5552": "Carburant", "4784": "Péage", "7523": "Stationnement",
  "7538": "Entretien véhicule", "5533": "Entretien véhicule", "7512": "Location de véhicule",
  "5912": "Pharmacie", "8011": "Médecin", "8031": "Médecin", "8041": "Médecin", "8043": "Médecin", "8099": "Santé - Autres",
  "7230": "Coiffeur", "7298": "Esthétique & Soins - Autres", "5977": "Cosmétique",
  "7997": "Sport", "7941": "Sport", "7911": "Sport", "5941": "Articles de sport", "7032": "Loisirs & Sorties - Autres",
  "7832": "Divertissements", "7996": "Sorties culturelles", "7991": "Sorties culturelles", "7999": "Loisirs & Sorties - Autres",
  "7011": "Hôtels", "4722": "Voyages / Vacances", "4511": "Voyages / Vacances", "4411": "Voyages / Vacances", "4111": "Transports en commun",
  "5651": "Vêtements/Chaussures", "5691": "Vêtements/Chaussures", "5699": "Vêtements/Chaussures", "5661": "Vêtements/Chaussures",
  "5311": "Achats & Shopping - Autres", "5399": "Achats & Shopping - Autres", "5999": "Achats & Shopping - Autres",
  "5942": "Achats & Shopping - Autres", "5945": "Achats & Shopping - Autres", "5732": "High Tech", "5947": "Cadeaux",
  "5200": "Extérieur et jardin", "5211": "Extérieur et jardin", "5261": "Extérieur et jardin", "5251": "Extérieur et jardin",
  "8398": "Dons", "8211": "Ecole", "8299": "Ecole", "5943": "Fournitures scolaires", "4899": "Abonnements - Autres",
  "4814": "Téléphonie mobile", "5815": "Services en ligne", "5817": "Services en ligne", "5818": "Services en ligne",
  "9399": "Amendes", "0742": "Frais Animaux", "5995": "Frais Animaux",
};

// Enseignes reconnues dans le libellé. Les terminaux abrègent souvent l'enseigne (« Fp Paris Sogiec » = Franprix).
const ENSEIGNES: [RegExp, string][] = ([
  [String.raw`\bdac\b`, "Carburant"], // distributeur automatique de carburant d'une grande surface
  [String.raw`^fp |franprix|monop|carrefour|lidl|aldi|intermarch|auchan|leclerc|super ?u\b|hyper ?u\b|g[eé]ant casino|petit casino` +
    String.raw`|picard|grand frais|biocoop|naturalia|vie claire|netto|leader price|\bg ?20\b|coccinelle|\bvival\b|\bproxi\b|\bspar\b`, "Supermarché / Epicerie"],
  [String.raw`boulangerie|p[aâ]tisserie|boucherie|fromagerie|primeur|traiteur`, "Alimentation - Autres"],
  [String.raw`mc ?do|mcdonald|burger king|\bkfc\b|\bquick\b|subway|five guys|o'?tacos`, "Fast foods"],
  [String.raw`starbucks|columbus caf`, "Café"],
  [String.raw`restaurant|brasserie|pizzeria|sushi|bistro|trattoria`, "Restaurants"],
  [String.raw`totalenergies|total access|relais total|\besso\b|\bshell\b|\bavia\b|station u\b`, "Carburant"],
  [String.raw`autoroute|escota|\baprr\b|\bsanef\b|vinci autoroutes`, "Péage"],
  [String.raw`\bindigo\b|\beffia\b|\bsaemes\b|onepark|parking|stationnement`, "Stationnement"],
  [String.raw`navigo|\bratp\b`, "Transports en commun"],
  [String.raw`\bsncf\b|ouigo|trainline`, "Billets de train"],
  [String.raw`pharmacie|pharma\b`, "Pharmacie"],
  [String.raw`decathlon|intersport|go sport`, "Articles de sport"],
  [String.raw`kiabi|\bzara\b|\bh ?& ?m\b|uniqlo|celio|\bjules\b|primark|vinted`, "Vêtements/Chaussures"],
  [String.raw`\bfnac\b|darty|boulanger\b|ldlc`, "High Tech"],
  [String.raw`netflix|spotify|disney ?plus|deezer|canal ?\+`, "Services en ligne"],
  [String.raw`leroy merlin|castorama|bricomarch|brico d[eé]p[oô]t|mr\.? bricolage`, "Logement - Autres"],
  [String.raw`jardiland|truffaut|botanic|gamm vert`, "Extérieur et jardin"],
  [String.raw`coiffure|coiffeur|barber`, "Coiffeur"],
  [String.raw`sephora|nocib[eé]|yves rocher|marionnaud`, "Cosmétique"],
] as [string, string][]).map(([p, c]) => [new RegExp(p, "i"), c]);

const PREFIXES = /^(prlv|prelevement|virement en votre faveur|virement emis( web)?|vir inst( wero)? (de|vers)|cb)\s+/i;

/** Libellé réduit à ses lettres, sans préfixe bancaire : les références et n° de contrat changent à chaque fois. */
export function norm(s: string) {
  while (PREFIXES.test(s)) s = s.replace(PREFIXES, "");
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

export function enseigne(lib: string) {
  lib = lib.replace(PREFIXES, "");
  return ENSEIGNES.find(([p]) => p.test(lib))?.[1];
}

/** Libellé affiché, comme l'ancienne page : « Prelevement Edf » -> « Prlv Edf ». */
export function libelle(lignes: string[] | undefined) {
  const s = (lignes ?? []).join(" ").replace(/\|/g, "/").replace(/\s+/g, " ").trim()
    .toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()); // str.title() de Python
  return (s || "Sans libellé").replace(/^Prelevement /, "Prlv ");
}

export type Connue = { lib: string; credit: boolean; categorie: string }; // déjà classée, la plus récente en dernier

/** Même sens et plus long début commun avec une transaction déjà classée : ≥ 12 lettres, ou tout le libellé le plus court (≥ 8). */
function parHistorique(lib: string, credit: boolean, connues: Connue[]) {
  const t = norm(lib);
  let best = 0, cat: string | undefined;
  const vues = new Map(connues.filter((c) => c.credit === credit).map((c) => [norm(c.lib).slice(0, 30), c.categorie]));
  for (const [k, v] of vues) {
    const court = Math.min(t.length, k.length);
    let n = 0;
    while (n < court && t[n] === k[n]) n++;
    if (n > best && (n >= 12 || (n === court && court >= 8))) [best, cat] = [n, v];
  }
  return cat;
}

export function categoriser(lib: string, montant: number, mcc: string | null, regles: Record<string, string>, connues: Connue[]) {
  if (/^cheque\b/i.test(lib)) return "A catégoriser"; // le libellé ne dit rien du bénéficiaire
  return regles[norm(lib).slice(0, 30)]
    ?? (/padel/i.test(lib) ? "Padel" : undefined) // avant le MCC, qui dit seulement « Sport »
    ?? parHistorique(lib, montant > 0, connues)
    ?? MCC[mcc ?? ""]
    ?? (montant > 0 ? undefined : enseigne(lib))
    ?? "A catégoriser";
}
