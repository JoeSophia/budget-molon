const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const euros = (n: number) => EUR.format(n);

// Nombre d'échéances par an
export const PAR_AN = { mensuel: 12, trimestriel: 4, semestriel: 2, annuel: 1 } as const;
export type Periodicite = keyof typeof PAR_AN;
