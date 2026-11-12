-- Schéma Budget Molon (spec §11). Idempotent : rejouable sans perte (scripts/migrate.mjs).

-- Toutes les transactions reçues de la banque, gardées pour toujours (la banque ne donne que 90 jours)
create table if not exists transactions (
  id            text primary key,                 -- entry_reference Enable Banking
  compte        text not null check (compte in ('cc', 'cj', 'cs')),  -- compte joint, carte Jonathan, carte Séverine
  date          date not null,                    -- date d'achat (transaction_date, sinon booking_date)
  date_debit    date,                             -- booking_date
  libelle       text not null,
  montant       numeric(12, 2) not null,          -- négatif = dépense
  statut        text not null,                    -- BOOK / PDNG
  mcc           text,
  categorie     text not null default 'A catégoriser',
  categorie_manuelle boolean not null default false,
  cle           text not null,                    -- AAAA-MM-JJ_<centimes>_<compte> : clé de l'ancienne page
  exceptionnel  boolean not null default false,
  essentiel     boolean,                          -- null : classement par défaut selon la catégorie
  note          text,
  recu_le       timestamptz not null default now()
);
create index if not exists transactions_date on transactions (date);
create index if not exists transactions_cle on transactions (cle);

-- « Toujours pour ce commerçant »
create table if not exists regles_commercant (
  motif     text primary key,                     -- début normalisé du libellé
  categorie text not null
);

create table if not exists frais_fixes (
  id           serial primary key,
  libelle      text not null,
  categorie    text not null,
  periodicite  text not null check (periodicite in ('mensuel', 'trimestriel', 'semestriel', 'annuel')),
  montant      numeric(12, 2),                    -- null : moyenne des 3 dernières échéances rattachées
  motif        text,                              -- regex sur le libellé pour rattacher les prélèvements
  prochaine_echeance date,
  actif        boolean not null default true
);

-- Prévu du mois par poste ; « non réparti » absorbe l'écart quand l'enveloppe change
create table if not exists previsions (
  mois    date not null,                          -- 1er du mois
  poste   text not null,
  montant numeric(12, 2) not null,
  primary key (mois, poste)
);

-- Dépense remboursée par une entrée d'argent (totalement ou en partie)
create table if not exists remboursements (
  depense_id text not null references transactions (id) on delete cascade,
  entree_id  text not null references transactions (id) on delete cascade,
  montant    numeric(12, 2) not null check (montant > 0),
  primary key (depense_id, entree_id)
);

create table if not exists tags (
  id            serial primary key,
  nom           text not null unique,
  motif_libelle text,                             -- regex : tag automatique sur le libellé
  motif_note    text,                             -- regex : tag automatique sur la note
  debut         date,
  fin           date
);
create table if not exists transaction_tags (
  transaction_id text not null references transactions (id) on delete cascade,
  tag_id         int  not null references tags (id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create table if not exists alertes (
  id      serial primary key,
  cle     text not null unique,                   -- dédoublonnage : une alerte par poste, seuil et mois
  type    text not null,
  message text not null,
  cree_le timestamptz not null default now(),
  lu      boolean not null default false
);

create table if not exists parametres (
  cle    text primary key,
  valeur jsonb not null
);
insert into parametres (cle, valeur) values
  ('seuil_grosse_depense', '100'),
  ('seuils_jauge', '[80, 90, 100]'),
  ('epargne_mensuelle', '1000')
on conflict (cle) do nothing;

create table if not exists abonnements_push (
  endpoint    text primary key,
  utilisateur text not null,
  abonnement  jsonb not null,
  cree_le     timestamptz not null default now()
);
