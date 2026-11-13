// Catégorisation automatique, reprise de Suivi-Depenses/eb_releve.py.

// Sous-catégorie -> poste. Celles ajoutées depuis l'app sont dans la table categories (groupes() de lib/budget.ts).
export const GROUPES: Record<string, string> = Object.fromEntries(Object.entries({
  "Alimentation": ["Courses", "Restaurants"],
  "Shopping": ["Vêtements", "High-tech", "Articles de sport", "Cadeaux", "Shopping divers"],
  "Auto & Transports": ["Carburant", "Péage & stationnement", "Entretien véhicule", "Train, bus, location", "Amendes", "Assurance véhicule", "Auto divers"],
  "Maison": ["Énergie & eau", "Jardin, déco, travaux", "Assurance habitation", "Maison divers"],
  "Loisirs": ["Sport", "Padel", "Sorties & culture", "Hobbies", "Loisirs divers"],
  "Santé": ["Médecin", "Pharmacie", "Santé divers"],
  "Enfants": ["École", "Fournitures", "Anglais", "Sport enfants", "Enfants divers"],
  "Soins & beauté": ["Coiffeur", "Esthétique & cosmétique"],
  "Abonnements": ["Téléphone & internet", "Services en ligne"],
  "Vacances": ["Hébergement", "Voyages"],
  "Divers": ["Dons", "Animaux", "Frais bancaires", "Divers"],
  "Impôts": ["Impôts sur le revenu", "Impôts fonciers"],
  "Prêt immobilier": ["Remboursement emprunt", "Assurance prêt"],
  "À catégoriser": ["A catégoriser"],
}).flatMap(([p, cats]) => cats.map((c) => [c, p])));

// Code commerçant -> sous-catégorie
export const MCC: Record<string, string> = {
  "5411": "Courses", "5422": "Courses", "5499": "Courses", "5462": "Courses",
  "5812": "Restaurants", "5813": "Restaurants", "5814": "Restaurants",
  "5541": "Carburant", "5542": "Carburant", "5552": "Carburant", "4784": "Péage & stationnement", "7523": "Péage & stationnement",
  "7538": "Entretien véhicule", "5533": "Entretien véhicule", "7512": "Train, bus, location",
  "5912": "Pharmacie", "8011": "Médecin", "8031": "Médecin", "8041": "Médecin", "8043": "Médecin", "8099": "Santé divers",
  "7230": "Coiffeur", "7298": "Esthétique & cosmétique", "5977": "Esthétique & cosmétique",
  "7997": "Sport", "7941": "Sport", "7911": "Sport", "5941": "Articles de sport", "7032": "Loisirs divers",
  "7832": "Sorties & culture", "7996": "Sorties & culture", "7991": "Sorties & culture", "7999": "Loisirs divers",
  "7011": "Hébergement", "4722": "Voyages", "4511": "Voyages", "4411": "Voyages", "4111": "Train, bus, location",
  "5651": "Vêtements", "5691": "Vêtements", "5699": "Vêtements", "5661": "Vêtements",
  "5311": "Shopping divers", "5399": "Shopping divers", "5999": "Shopping divers",
  "5942": "Shopping divers", "5945": "Shopping divers", "5732": "High-tech", "5947": "Cadeaux",
  "5200": "Jardin, déco, travaux", "5211": "Jardin, déco, travaux", "5261": "Jardin, déco, travaux", "5251": "Jardin, déco, travaux",
  "8398": "Dons", "8211": "École", "8299": "École", "5943": "Fournitures", "4899": "Services en ligne",
  "4814": "Téléphone & internet", "5815": "Services en ligne", "5817": "Services en ligne", "5818": "Services en ligne",
  "9399": "Amendes", "0742": "Animaux", "5995": "Animaux",
};

// Enseignes reconnues dans le libellé. Les terminaux abrègent souvent l'enseigne (« Fp Paris Sogiec » = Franprix).
const ENSEIGNES: [RegExp, string][] = ([
  [String.raw`\bdac\b`, "Carburant"], // distributeur automatique de carburant d'une grande surface
  [String.raw`^fp |franprix|monop|carrefour|lidl|aldi|intermarch|auchan|leclerc|super ?u\b|hyper ?u\b|g[eé]ant casino|petit casino` +
    String.raw`|picard|grand frais|biocoop|naturalia|vie claire|netto|leader price|\bg ?20\b|coccinelle|\bvival\b|\bproxi\b|\bspar\b`, "Courses"],
  [String.raw`boulangerie|p[aâ]tisserie|boucherie|fromagerie|primeur|traiteur`, "Courses"],
  [String.raw`mc ?do|mcdonald|burger king|\bkfc\b|\bquick\b|subway|five guys|o'?tacos`, "Restaurants"],
  [String.raw`starbucks|columbus caf`, "Restaurants"],
  [String.raw`restaurant|brasserie|pizzeria|sushi|bistro|trattoria`, "Restaurants"],
  [String.raw`totalenergies|total access|relais total|\besso\b|\bshell\b|\bavia\b|station u\b`, "Carburant"],
  [String.raw`autoroute|escota|\baprr\b|\bsanef\b|vinci autoroutes`, "Péage & stationnement"],
  [String.raw`\bindigo\b|\beffia\b|\bsaemes\b|onepark|parking|stationnement`, "Péage & stationnement"],
  [String.raw`navigo|\bratp\b`, "Train, bus, location"],
  [String.raw`\bsncf\b|ouigo|trainline`, "Train, bus, location"],
  [String.raw`pharmacie|pharma\b`, "Pharmacie"],
  [String.raw`decathlon|intersport|go sport`, "Articles de sport"],
  [String.raw`kiabi|\bzara\b|\bh ?& ?m\b|uniqlo|celio|\bjules\b|primark|vinted`, "Vêtements"],
  [String.raw`\bfnac\b|darty|boulanger\b|ldlc`, "High-tech"],
  [String.raw`netflix|spotify|disney ?plus|deezer|canal ?\+`, "Services en ligne"],
  [String.raw`leroy merlin|castorama|bricomarch|brico d[eé]p[oô]t|mr\.? bricolage`, "Maison divers"],
  [String.raw`jardiland|truffaut|botanic|gamm vert`, "Jardin, déco, travaux"],
  [String.raw`coiffure|coiffeur|barber`, "Coiffeur"],
  [String.raw`sephora|nocib[eé]|yves rocher|marionnaud`, "Esthétique & cosmétique"],
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

// Indispensable par défaut (render.py), corrigeable d'un clic sur la dépense
const POSTES_ESSENTIELS = new Set(["Santé", "Impôts", "Enfants", "Auto & Transports", "Maison"]);
const CATS_ESSENTIELLES = new Set(["Courses", "Coiffeur", "Pharmacie"]);
const CATS_ACCESSOIRES = new Set(["Amendes", "Frais bancaires"]);
export const essentielParDefaut = (categorie: string, poste: string) =>
  !CATS_ACCESSOIRES.has(categorie) && (POSTES_ESSENTIELS.has(poste) || CATS_ESSENTIELLES.has(categorie));

// Catégories qui sortent une dépense du budget, proposées en plus des sous-catégories
export const HORS_BUDGET = ["Epargne", "Virements internes", "Dépenses pro"];
