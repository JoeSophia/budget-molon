# Budget Molon : cahier des charges (v1)

Application web (installable sur téléphone) de suivi des dépenses de la famille Molon (Jonathan et Séverine).
Elle remplace la page actuelle (artifact claude.ai + scripts Python du dossier `Suivi-Depenses`).

## 1. Objectif

- Savoir combien coûtent les **frais fixes** par mois et par an, toutes périodicités confondues.
- Piloter les **frais variables** avec un prévu par catégorie et une jauge par semaine, mois et année.
- Voir à part les **dépenses exceptionnelles**, c'est-à-dire ce qu'on peut réduire.
- Être **alerté sur le téléphone** quand une dépense est grosse ou qu'une catégorie approche de son prévu.

## 2. Utilisateurs et accès

- Deux comptes, avec les mêmes droits : Jonathan (molon.jonathan@gmail.com) et Séverine (severine.molon@gmail.com).
- Connexion par lien envoyé par e-mail. Seules les deux adresses autorisées peuvent se connecter.
- L'app est pensée d'abord pour le téléphone. On l'installe sur l'écran d'accueil (PWA), ce qui est nécessaire pour recevoir les notifications sur iPhone.

## 3. Données bancaires

- Source : Enable Banking (Crédit Agricole), soit le compte joint et les 2 cartes à débit différé. La session est valable jusqu'au 08/04/2027.
- Une tâche planifiée GitHub Actions appelle l'app environ 4 fois par jour (offre Vercel gratuite : une seule tâche Vercel par jour). Les règles bancaires européennes (DSP2) limitent à 4 consultations par jour sans action de l'utilisateur.
- La banque ne donne que **90 jours**. Chaque transaction reçue est donc gardée en base pour toujours. Les doublons sont détectés par `entry_reference`, et la donnée la plus récente l'emporte.
- Les cartes à débit différé ne renvoient que les achats en attente : il ne faut jamais supprimer un achat parce qu'il n'est plus renvoyé.
- Au premier lancement, on importe l'historique déjà sur le PC (`data/eb_*.json`), qui remonte au 01/08/2026.
- La clé privée Enable Banking est stockée dans les secrets Vercel et ne va jamais dans le dépôt.
- Une alerte prévient 14 jours avant l'expiration de l'autorisation bancaire.

## 4. Catégories

- On reprend les deux niveaux actuels, poste et sous-catégorie (`GROUPES` dans `analyse.py`), Padel compris.
- La catégorie est attribuée automatiquement, dans cet ordre :
  1. choix fait à la main pour cette transaction ;
  2. règle « toujours pour ce commerçant » ;
  3. motifs d'enseigne (`ENSEIGNES`) ;
  4. code commerçant (MCC) ;
  5. sinon « À catégoriser ».
- La catégorie se change d'un clic sur la dépense, avec une case « toujours pour ce commerçant ».

## 5. Frais fixes

- **Un frais fixe contient** :
  - un libellé ;
  - une catégorie ;
  - une périodicité : mensuelle, trimestrielle, semestrielle ou annuelle ;
  - un montant, saisi à la main ou calculé ;
  - un motif de libellé, qui sert à rattacher automatiquement les prélèvements ;
  - la prochaine échéance.
- **Montant ramené au mois** = montant × nombre d'échéances par an ÷ 12. Exemple : 600 € par an donnent 50 € par mois.
- **Montant qui varie** (électricité, eau) : on prend la **moyenne des 3 dernières échéances** rattachées.
- **Écran**
  - Liste par catégorie, avec un sélecteur **mois / année**.
  - Total mensualisé et total annuel.
  - Pour chaque frais fixe : le dernier prélèvement et son écart avec le montant attendu.
- **Bouton « passer en frais fixe »** sur n'importe quelle dépense.
  - Il ouvre le formulaire, pré-rempli avec le libellé, le montant et la catégorie de la dépense.
  - On choisit la périodicité ; l'app affiche alors le coût mensuel et annuel.
  - On peut aussi enlever une dépense des frais fixes.
- **Au démarrage**, on importe les frais fixes reconnus par les règles actuelles (`FIXES`), en mensuel. Ils restent ajustables.

## 6. Frais variables

- **Enveloppe du mois** = revenus du mois précédent − épargne (1 000 €, réglable) − frais fixes mensualisés. C'est la règle actuelle.
- **Prévu par poste**
  - Chaque poste (Alimentation, Loisirs…) a un montant prévu par mois. La somme des prévus est égale à l'enveloppe.
  - Quand on modifie un prévu, l'app demande **quelle catégorie compense** la différence, pour garder le total.
  - Si l'enveloppe change d'un mois à l'autre, l'écart va sur une ligne « non réparti », à répartir par l'utilisateur.
- **Périodes**
  - Semaine du lundi au dimanche ; prévu de la semaine = prévu du mois × 12 ÷ 52.
  - Mois civil.
  - Année civile ; prévu de l'année = somme des prévus mensuels.
- **Écran**
  - Une ligne par poste, avec le montant dépensé et le prévu.
  - Une **jauge** : verte sous 80 %, orange de 80 à 99 %, rouge à partir de 100 %.
  - Un repère indique la part de la période déjà écoulée.
  - Un clic sur un poste ouvre ses dépenses, groupées par sous-catégorie puis triées par montant décroissant.
- **Section « Exceptionnel »** dans la vue variable.
  - Une dépense marquée exceptionnelle garde sa catégorie (cadeau, sortie…) et reste comptée dans les jauges.
  - Elle apparaît en plus dans un tableau dédié, par catégorie, en semaine, mois et année : c'est ce qu'on peut réduire.

## 7. Ligne de dépense (partout)

Chaque ligne de dépense affiche :
- ♂ ou ♀ selon la carte utilisée (Jonathan ou Séverine) ; rien pour le compte joint ;
- la date, le libellé, le montant, la catégorie (modifiable au clic) ;
- trois icônes :
  - **📝 Note** : texte libre affiché sous la ligne. Les notes déjà saisies sur la page actuelle sont importées.
  - **↺ Remboursement** : ouvre la liste des **entrées d'argent** des 90 derniers jours qui ne sont pas encore rattachées. On en choisit une, avec possibilité de n'en prendre qu'une partie.
    - Si le remboursement couvre toute la dépense, la dépense est **masquée** des totaux.
    - Sinon, seul le reste (net) compte.
    - L'entrée d'argent rattachée ne compte plus comme revenu.
    - On peut annuler le rattachement.
  - **◆ Exceptionnel** : bascule la dépense dans la section Exceptionnel.
  - **Indispensable / accessoire** : étiquette cliquable, classement par défaut selon la catégorie (courses, santé, transport, école, impôts, logement = indispensable).
  - **🏷 Tag** : étiquettes libres (ex. « Paris », « Grand Est ») ajoutées à la main ; un tag peut aussi avoir une règle automatique (mot dans le libellé ou dans la note, sur une période).
- Les catégories, notes, remboursements et ponctuels déjà saisis sur la page actuelle sont importés. Les ponctuels deviennent des exceptionnels.

## 7 bis. Vues transversales : tags et indispensable / accessoire

- Comme la section Exceptionnel, chaque **tag** a sa vue globale : total et détail par catégorie, en semaine / mois / année (ex. combien a coûté « Paris »).
- Vue **indispensable / accessoire** : part de chacun, par personne (♂ / ♀ / compte joint) et par catégorie, avec le total accessoire (le superflu).
- Ces vues ne changent pas les totaux : une dépense reste dans sa catégorie et dans les jauges.

## 8. Alertes (notification sur le téléphone)

| Alerte | Déclencheur | Réglage |
|---|---|---|
| Grosse dépense variable | Dépense variable ≥ seuil | Seuil dans Paramètres, 100 € par défaut |
| Jauge 80 % | Un poste atteint 80 % de son prévu du mois | Seuils dans Paramètres |
| Jauge 90 % | idem, 90 % | |
| Jauge 100 % | idem, 100 % | |
| Autorisation bancaire | Expire dans 14 jours ou moins | |

- Une alerte n'est envoyée qu'une fois par poste, par seuil et par mois.
- Les alertes sont vérifiées après chaque synchronisation. Elles arrivent donc avec quelques heures de décalage au maximum, pas en temps réel.
- Un écran « Alertes » garde l'historique et le statut lu / non lu.

## 9. Paramètres

- Seuil de la grosse dépense.
- Seuils des jauges (80, 90, 100).
- Épargne mensuelle déduite de l'enveloppe (1 000 €).
- Activer ou couper les notifications, par personne.
- Gestion des règles « toujours pour ce commerçant ».

## 10. Ce qui n'est pas repris (à confirmer)

- Évitables ✗ et le curseur d'économies de la vue « Octobre V2 ».
- Le rapport du dimanche et le carnet de conseils : les alertes les remplacent.

## 11. Technique

- **Application** : Next.js (App Router, TypeScript), déployée sur le compte Vercel existant, avec un nouveau dépôt GitHub privé.
- **Base de données** : Postgres (Neon, via l'intégration Vercel). Tables principales :
  - `transactions`, `categories`, `regles_commercant` ;
  - `frais_fixes`, `previsions` ;
  - `remboursements` (lien dépense → entrée d'argent, avec le montant) ;
  - `notes`, `tags`, `transaction_tags`, `alertes`, `parametres`, `abonnements_push`.
- **Synchronisation** : tâche planifiée GitHub Actions (4 fois par jour, gratuite) qui appelle une route protégée de l'app, puis appel de l'API Enable Banking (JWT RS256), puis enregistrement en base, puis vérification des alertes.
- **Notifications** : Web Push avec des clés VAPID.
- **Connexion** : Auth.js avec un lien envoyé par e-mail (fournisseur d'e-mail, par ex. Resend).

## 12. Étapes

1. Mise en place : dépôt, projet Vercel, base, connexion, schéma des tables.
2. Import de l'historique (fichiers `eb_*.json`) et des choix de la page actuelle.
3. Synchronisation bancaire planifiée.
4. Frais fixes.
5. Frais variables, avec prévus, jauges et rééquilibrage.
6. Ligne de dépense : notes, remboursement, exceptionnel, catégorie ; section Exceptionnel.
7. Alertes et notifications.
8. Paramètres, puis bascule : la page actuelle s'arrête.

## 13. Décisions prises

- Dépôt GitHub privé `budget-molon`, projet Vercel sur le compte existant (offre Hobby).
- Synchronisation par GitHub Actions.
- Indispensable / accessoire et tags conservés (section 7 bis).
