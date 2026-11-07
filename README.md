# FSC — Fucking Simple Calendar

Un calendrier partagé pour deux, avec un choix **Commun / Solo** à chaque création.
Interface française en HTML natif et CSS, au format compact, avec la police Manrope hébergée localement. Licence [WTFPL v2](LICENSE).

## Fonctionnalités

- Comptes individuels e-mail/mot de passe, vérification d’adresse et réinitialisation via Better Auth.
- Un agenda solo privé par compte et un calendrier commun à deux, avec invitations nominatives de sept jours.
- Accueil chronologique, navigation mensuelle, événements horaires ou sur plusieurs journées entières, tags multiples.
- Onglet Todo : tâches Solo / Commun, échéance facultative, modification, fin/réouverture et suppression ; récapitulatif quotidien des retards par e-mail.
- Modification partagée des événements communs ; seul le créateur peut changer leur visibilité.
- Préférences de rappel personnelles : délai, e-mail, Web Push, tous les événements ou au moins un tag sélectionné. Un rappel personnalisé peut remplacer ces réglages pour un événement précis, pour soi uniquement.
- Exports et abonnements ICS distincts, secrets et révocables, pour Commun et Solo.
- Calendriers externes liés par URL ICS HTTPS/webcal : actualisation automatique, ajouts/modifications/suppressions et rappels personnels FSC.
- Connecteur MCP OAuth pour Claude : lecture des agendas/événements et création avec visibilité obligatoire.

Pas de création de séries récurrentes natives, de CalDAV ni de synchronisation bidirectionnelle. Les calendriers ICS liés sont lus et actualisés dans FSC, avec développement de leurs récurrences courantes.

## Images publiées sur GitHub Container Registry

Le workflow `.github/workflows/publish-container.yml` construit et publie l’image
unique du Dockerfile sur GHCR, sans secret ni variable à créer : il utilise le
`GITHUB_TOKEN` fourni automatiquement et les permissions déclarées dans le workflow.
Le nom du dépôt et sa branche principale sont détectés automatiquement.

Publication à chaque push sur la branche principale, sur les tags `v*`, ou depuis
**Actions → Publish containers to GHCR → Run workflow**. Les autres branches ne
publient pas automatiquement. Les images Linux `amd64` partagent le package
`ghcr.io/<propriétaire>/<dépôt>`, en minuscules :

| Image | Branche principale | Tag Git `v1.2.3` | Commit précis |
| --- | --- | --- | --- |
| FSC (app + worker + migrations) | `latest` | `v1.2.3` | `sha-<SHA complet>` |

Un lancement manuel hors branche principale produit les tags de commit, sans
remplacer `latest`. Les paramètres de
base de données et authentification restent des variables d’exécution (le SMTP se configure dans l’application) :
aucun n’est requis pour construire ou publier les images.

## Démarrage Docker

Prérequis : Docker Compose v2 et un serveur SMTP, à renseigner ensuite dans Réglages. Pour un déploiement public, ajouter un
domaine HTTPS et un reverse proxy.

```sh
cp .env.example .env
```

Configurer au minimum :

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` : identifiants PostgreSQL. L’URL de connexion est construite automatiquement, avec encodage des caractères spéciaux.
- `BETTER_AUTH_SECRET` : secret aléatoire d’au moins 32 caractères, stable entre déploiements.
- `BETTER_AUTH_URL` : `http://localhost:3000` pour Docker local, ou l’origine HTTPS publique exacte, sans chemin, par exemple `https://calendar.example.com`.
- Facultatif : clés Web Push générées une fois avec `bunx web-push generate-vapid-keys`, puis `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Le mode production des images Docker accepte HTTP sur `localhost`, `127.0.0.1` et
`::1` pour les essais locaux. Une adresse publique exige HTTPS, notamment pour
connecter Claude. Le message « Next.js Ready » affiche l’écoute interne HTTP du
conteneur ; le reverse proxy assure le HTTPS public.

Compose démarre PostgreSQL, démarre le conteneur `app` qui applique les migrations, puis lance l’application et
un worker unique dans le même conteneur. Une migration en échec empêche leur démarrage ; ne pas lancer plusieurs réplicas de `app`. L’application est exposée
sur le port `3000` de l’hôte par défaut (`APP_PORT`) ; la base reste dans le réseau Docker. Les images tournent
avec un utilisateur non-root. Les identifiants ne sont pas nécessaires au build.

**Cette version repart de zéro** : l’ancien schéma de démonstration et ses migrations
ont été remplacés. Utiliser une base vide et, pour une installation à côté de l’ancienne,
un autre projet Compose (`docker compose -p fsc-v1 …`) et un autre port. Aucun script
ne supprime ni ne réinitialise une base ou un volume existant.

`docker compose down` conserve le volume PostgreSQL. Ne pas changer son mot de passe
dans `.env` sans le changer également dans PostgreSQL. Une mise à jour normale utilise
`docker compose up -d --build` ; ne pas régénérer les migrations sur le serveur.

### Créer les comptes (CLI uniquement)

L’inscription publique est désactivée côté serveur. Seul l’administrateur ayant
accès au terminal peut créer un compte ; les invitations ne créent pas de compte.

Avec Docker, après le démarrage de la base et les migrations :

```sh
docker compose exec app node --import tsx scripts/create-account.ts --email alice@example.com --name Alice
```

En développement local (connexion PostgreSQL configurée dans `.env`) :

```sh
bun run account:create --email alice@example.com --name Alice
```

Le mot de passe est demandé deux fois, sans affichage. Pour une automatisation,
`--password-stdin` lit le mot de passe sur l’entrée standard ; ne pas le mettre
dans les arguments de commande. Un e-mail de vérification est envoyé et reste
obligatoire avant connexion. Une tentative de connexion à un compte non vérifié
renvoie cet e-mail si nécessaire. La réinitialisation du mot de passe reste disponible.

### Administrateur et configuration SMTP

Le SMTP se configure dans Réglages, section « E-mail (SMTP) », visible uniquement
par les administrateurs, avec un bouton de test d’envoi. Le mot de passe SMTP est
stocké chiffré en base. Créer le premier administrateur (compte déjà vérifié, sans
SMTP requis) :

```sh
docker compose exec app node --import tsx scripts/create-account.ts --email admin@example.com --name Admin --admin
```

Pour promouvoir un compte existant : même commande avec `--email` et `--admin` seulement.

### HTTPS et proxy

Pointer le proxy sur `127.0.0.1:3000`, conserver les chemins et les méthodes HTTP, et
transmettre l’origine HTTPS publique. Exemple de directives Nginx à placer dans un
serveur TLS configuré pour ton domaine :

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_buffering off;
}
```

Le proxy doit **remplacer** les en-têtes d’adresse client, pas reprendre ceux envoyés
par le navigateur. Ils servent à la limitation des tentatives de connexion. Garder le
port de l’application inaccessible directement depuis Internet. Désactiver le cache
sur les pages authentifiées, `/api/auth`, `/mcp`, `/exports` et `/abonnements`.
Ne pas enregistrer les URL complètes d’invitations, abonnements ou reset dans les logs
du proxy : elles contiennent des secrets.

`GET /health` vérifie la configuration de production et l’accès au schéma. Le worker
met à jour un heartbeat PostgreSQL ; son healthcheck échoue après deux minutes sans
passage réussi. Ne pas lancer plusieurs réplicas de `app` (il embarque le worker).

### E-mails de développement

Pour capturer les e-mails sans les envoyer à leurs destinataires :

```sh
docker compose --profile mailpit up -d --build
```

Dans Réglages, section E-mail (SMTP), saisir l’hôte `mailpit`, le port `1025`, sans
connexion sécurisée ni identifiants, puis utiliser « Tester le SMTP ».
Boîte de réception locale : <http://localhost:8025>. Le profil Mailpit ne relaie pas
les messages vers Internet. Utiliser un SMTP réel lors du déploiement public.

## Développement direct

Prérequis : Bun, Node compatible avec Next.js, PostgreSQL 17 et un serveur SMTP de développement.

```sh
bun install
# Dans .env : POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB,
# POSTGRES_HOST=localhost et POSTGRES_PORT=5432 (ou ton serveur PostgreSQL),
# BETTER_AUTH_URL=http://localhost:3000.
bun run migrate
bun run dev
# Dans un second terminal avec la même configuration :
bun run worker
```

Le serveur de développement utilise Webpack pour éviter une boucle Fast Refresh
observée avec Turbopack dans cette version de Next.js. Le build de production reste
celui de Next.js.

L’interface utilise les Server Components et Server Actions. Il n’existe aucune API
REST de calendrier. Les mêmes services dans `src/server/calendar.ts` sont appelés
par le site, MCP et les flux ICS. Les requêtes sont paramétrées et exécutées avec
`pg` ; Prisma 8 possède le contrat de stockage et les migrations de toutes les tables.
Better Auth utilise son adaptateur PostgreSQL officiel dans cette même base.

### Contrat et migrations

- `src/prisma/domain.prisma` contient les modèles FSC.
- `scripts/auth-contract.ts` lit les schémas des versions installées de Better Auth,
  OAuth Provider et CIMD, puis assemble `src/prisma/contract.prisma`.
- `contract.json` et `contract.d.ts` sont générés par Prisma. Ne pas les modifier à la main.
- `migrations/` contient la migration initiale et les migrations additives, leurs snapshots et le ref `db`. La migration `event_reminder_preferences` ajoute les réglages personnels par événement sans modifier les événements existants.

Après une évolution métier ou une mise à jour de Better Auth :

```sh
bun run auth:contract
bun run contract:emit
bun run migration:plan --name describe_change
# Relire les opérations, puis avancer le ref db au hash cible affiché :
bunx prisma migration ref set db HASH_CIBLE
bun run migrate
bun run db:verify
```

Conserver dans Git le contrat, ses artefacts, la migration, le snapshot et le ref.
Ne pas lancer la commande de migration propre à Better Auth : Prisma est l’unique
responsable du schéma. La migration initiale est rejouable sans nouvelle opération
quand elle est déjà appliquée.

## Dates, rappels et confidentialité

Les horaires sont enregistrés comme instants UTC accompagnés d’un fuseau IANA. Une
heure locale inexistante ou ambiguë est refusée ; le formulaire propose un champ
avec décalage explicite pour les heures ambiguës. Les journées entières ont une fin
exclusive : pour le 10 mars uniquement, début le 10 et fin le 11.

Le fuseau du navigateur est proposé au premier usage, avec repli `Europe/Paris`.
Les préférences initiales sont 30 minutes, Tous les événements, canaux désactivés.

Sur la création, la modification ou la fiche d’un événement, **Mon rappel** propose :

- **Utiliser mes réglages habituels** : délai, canaux et filtre de tags personnels.
- **Aucun rappel** : désactive uniquement les rappels de ce compte pour cet événement.
- **Personnaliser ce rappel** : un délai en minutes, heures ou jours, et au moins un canal e-mail ou notification web. Ce choix remplace les réglages habituels, y compris le filtre de tags ; il reste indépendant des choix du partenaire.

Le délai personnalisé est compris entre zéro et un an. Zéro vise l’heure de début ;
pour une journée entière, la référence reste 9 h dans le fuseau du destinataire.
Les notifications web exigent un appareil activé dans les réglages. Les changements
de date replanifient les rappels en attente. Un rappel déjà envoyé ou dont le résultat
est incertain n’est pas renvoyé. Si le délai est déjà passé mais que l’événement reste
futur, le rappel peut partir au prochain passage du worker. La suppression d’un
événement efface aussi ses préférences ; une perte d’accès retire les préférences
personnelles correspondantes et annule les rappels en attente.

Avant d’utiliser cette fonctionnalité sur une installation existante, appliquer les
migrations (`bun run migrate` en local, ou la procédure Docker ci-dessus), puis
redémarrer l’application (en Docker, redémarrer le conteneur `app` applique les migrations).

Pour une journée entière, le rappel vise 9 h le premier jour dans le fuseau du
destinataire, moins son délai. En mode Tags sélectionnés, un seul tag correspondant
suffit ; une sélection vide ne déclenche rien.

Le worker parcourt la file persistante toutes les 30 secondes. Une transaction
recalcule les tâches en attente lors des modifications ou pertes d’accès. Un verrou
PostgreSQL partagé avec les mutations protège la vérification finale et l’envoi.
Les envois déjà effectués ne sont pas reprogrammés. Les rejets temporaires explicites
sont réessayés avec délai ; un timeout ou un arrêt pendant l’envoi passe en résultat
incertain et n’est jamais rejoué automatiquement. Un rattrapage n’est envoyé que si
le point de référence de l’événement reste futur. Consulter les états `failed` ou
`uncertain` dans les tables `reminder` et `delivery` pour diagnostiquer une livraison.
Un délai de zéro minute bénéficie d’une tolérance de 60 secondes autour du début
pour permettre le passage normal du worker ; au-delà, le rappel est périmé.

Un rappel push correspond à un rappel logique par canal, livré une fois à chaque
appareil abonné. Son contenu reste générique ; les détails sont chargés après
authentification dans FSC. Les abonnements expirés sont supprimés. La déconnexion
désabonne l’appareil courant. Aucun service worker ne met en cache les événements.

Sur iPhone, Web Push nécessite iOS 16.4 ou plus récent et l’ouverture de FSC depuis
son icône sur l’écran d’accueil. Dans les réglages, activer l’appareil, autoriser la
notification, puis cocher Notifications web et enregistrer les préférences.

Quitter le couple retire l’accès aux événements communs, même à ceux qu’on a créés,
et annule les rappels correspondants. Le membre restant conserve les événements.
Les tags personnels et préférences restent utilisables après le départ.

Les abonnements ICS appartiennent à un compte et à un seul agenda. Leurs secrets
sont stockés sous forme de hash, renouvelables et révocables. Les droits sont
revérifiés à chaque lecture. Un téléphone ou destinataire peut cependant conserver
une copie déjà téléchargée ; FSC ne contrôle pas sa fréquence d’actualisation.

## Calendriers externes liés

Depuis **Calendrier → Lier un autre calendrier**, ou le menu du logo, ouvrir
**Calendriers liés**. Fournir un nom, le lien d’abonnement ICS HTTPS/webcal du
calendrier source, puis choisir explicitement **Solo** ou **Commun**. L’adresse
doit donner accès au flux ICS sans connexion interactive, et non à une page web.

Le premier chargement a lieu à l’ajout, puis le worker vérifie les sources actives
environ toutes les **15 minutes**. **Actualiser maintenant** force une vérification.
Les événements, leurs titres, descriptions, lieux, horaires et catégories sont mis
à jour ; les annulations et suppressions à la source retirent les copies FSC.
Les identifiants FSC restent stables tant que l’UID et l’occurrence source restent
identiques ; une actualisation sans changement ne modifie pas leur version.

Les occurrences de l’**année passée et des deux années à venir** sont conservées.
Les séries quotidiennes, hebdomadaires, mensuelles et annuelles courantes sont
développées avec leurs exclusions et modifications d’occurrences. Les journées
entières gardent leur fin exclusive ; les fuseaux IANA et les définitions
VTIMEZONE sont pris en charge. Pour une date sans fuseau, celui du propriétaire
du lien est utilisé ; un fuseau personnalisé est converti en UTC. Les événements
sans titre deviennent « Sans titre ». Les sources doivent fournir des UID stables.

Les séries `THISANDFUTURE`, les RDATE sous forme de périodes et les récurrences
sous-journalières/complexes sont refusées. Le flux est limité à 2 Mo, 5 000 VEVENT,
5 000 occurrences conservées et 50 000 itérations de récurrence. Un téléchargement
ou une lecture invalide conserve intégralement la dernière copie réussie ; l’erreur
est affichée dans la page du calendrier lié. Un calendrier ICS valide mais vide
retire ses copies. La synchronisation applique chaque instantané dans une transaction.

Les événements liés sont en lecture seule dans FSC : les modifier ou les supprimer
dans le calendrier source. Les **rappels personnels** FSC restent configurables ;
les VALARM, invitations et destinataires du flux ne sont pas importés. Les rappels
en attente suivent les changements de date ; ceux déjà envoyés ne sont pas rejoués.

Seul le propriétaire du lien peut l’actualiser, le mettre en pause, le reprendre
ou le supprimer. L’autre membre voit les événements et l’état d’un lien Commun,
mais pas son adresse. Une perte d’accès du propriétaire à l’agenda cible arrête
la synchronisation au prochain passage, sans ajouter de nouvelles données. Il peut
toujours supprimer sa connexion. La pause conserve les copies et leurs rappels ;
la suppression confirmée du lien efface uniquement ses événements FSC et leurs
rappels, sans toucher au calendrier distant ni aux événements créés manuellement.

Les URL peuvent contenir des secrets. Elles sont stockées avec un chiffrement
AES-256-GCM dérivé de `BETTER_AUTH_SECRET`, ne sont pas réaffichées et ne figurent
pas dans les messages d’erreur. Conserver ce secret : sa rotation nécessite de
recréer les liens. Le téléchargement accepte seulement HTTPS public sur le port
443, normalise webcal vers HTTPS, contrôle chaque résolution DNS et chaque
redirection, puis fixe les adresses validées à la connexion. Les adresses internes,
locales et réservées sont refusées. Aucun cookie ou identifiant de compte distant
n’est transmis. Les téléchargements sont limités en temps et en taille.

La migration `linked_calendars` est additive. Appliquer `bun run migrate` avant de
redémarrer l’application (en Docker, redémarrer le conteneur `app` applique les migrations).
Les tests serveur utilisent des flux de test, sans appeler de calendrier privé réel.

## Todo et récapitulatif quotidien

L’onglet **Todo** permet d’ajouter des tâches **Solo** ou **Commun**, avec une
échéance facultative. Les membres peuvent modifier, terminer, rouvrir et supprimer
les tâches communes ; les tâches Solo restent privées. Une modification concurrente
est refusée avec une invitation à recharger. La visibilité reste celle choisie lors
de la création.

Une échéance est une date, valable jusqu’à la fin de cette journée dans le fuseau de
chaque utilisateur. Dès le lendemain, une tâche non terminée apparaît **En retard**.
Les tâches sans échéance ne deviennent pas en retard.

Le worker existant envoie à partir de **9 h locales**, au premier passage disponible,
un e-mail contenant les tâches en retard auxquelles le compte a encore accès.
Il n’envoie rien si la liste est vide, si le compte n’est pas vérifié ou si le
récapitulatif est désactivé. Une indisponibilité du worker peut décaler l’envoi
jusqu’à sa reprise dans la même journée ; les journées précédentes ne sont pas
rattrapées. Les tâches terminées, supprimées ou devenues inaccessibles sont retirées
avant l’envoi. Les rappels d’événements restent indépendants.

L’envoi quotidien est activé par défaut et peut être désactivé personnellement dans
**Todo → Récapitulatif quotidien par e-mail**. Il utilise le fuseau défini dans les
réglages et nécessite le SMTP déjà configuré pour FSC.

Le journal `todoDigest`, unique par compte et date locale, évite les doublons, même
avec des passages concurrents. Un rejet temporaire explicite est réessayé jusqu’à
quatre tentatives ; un timeout ou un envoi interrompu devient `uncertain` et n’est
pas rejoué automatiquement ce jour-là. Les échecs de la veille ne bloquent pas
le récapitulatif du lendemain.

La migration `todos_daily_digest` ajoute les tables Todo et leur journal d’envoi,
ainsi que la préférence personnelle. Appliquer `bun run migrate` avant de
redémarrer l’application (en Docker, redémarrer le conteneur `app` applique les migrations).

## Claude et MCP

Depuis **Connecter Claude** dans FSC, copier `https://TON-DOMAINE/mcp`. Dans Claude :
Personnaliser → Connecteurs → Ajouter un connecteur personnalisé, coller l’adresse,
choisir OAuth et **l’identité publiée de Claude**, puis se connecter à FSC et autoriser.
Chaque membre utilise son propre compte. Un espace Team/Enterprise peut nécessiter
un administrateur pour ajouter le connecteur.

FSC utilise Better Auth OAuth Provider, PKCE S256, CIMD et des jetons opaques.
La vérification interne du fournisseur contrôle chaque requête et chaque outil,
avec audience `/mcp` et scopes `calendar:read` / `event:create`. `offline_access`
permet la rotation des refresh tokens. Les inscriptions OAuth dynamiques et les
interfaces d’administration des clients/ressources sont désactivées ; utiliser
l’option d’identité publiée de Claude.

Outils disponibles :

| Outil | Entrées principales |
| --- | --- |
| `list_calendars` | aucune |
| `list_events` | `calendarId`, `from`, `to`, `cursor` facultatif ; plage ISO avec décalage, maximum 366 jours |
| `create_event` | `calendarId`, `visibility` (`common` ou `solo`), `title`, `temporalData`, tags/description/lieu facultatifs |

`temporalData` vaut soit `{ "allDay": false, "start": "2027-03-10T19:00:00+01:00",
"end": "2027-03-10T20:00:00+01:00", "timeZone": "Europe/Paris" }`, soit
`{ "allDay": true, "startDate": "2027-03-10", "endDate": "2027-03-11" }`.

Claude reçoit l’instruction de demander Commun ou Solo si l’utilisateur n’a pas
précisé ce choix. Le schéma de l’outil refuse toute création sans visibilité.
Les règles de tags, dates, accès et rappels sont identiques à celles du site.
La révocation dans FSC supprime le consentement et tous les jetons de la connexion
pour ce compte ; les connexions de l’autre membre restent valides.

Références : [Better Auth OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider),
[connexion Claude](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp),
[Web Push sur iPhone](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Jours en déplacement

Dans Calendrier, « Marquer un déplacement » permet d’ajouter ou retirer ses propres
jours, du début à la fin inclus (366 jours maximum). « Afficher les déplacements »
colore les jours concernés en pêche et affiche les noms dans le détail du jour,
sans masquer les événements. Ce choix est mémorisé par compte dans le navigateur.
Les jours sont partagés uniquement avec le partenaire actuel du calendrier commun.
Ils ne figurent ni dans les exports/abonnements ICS, ni dans les rappels ou le MCP.

La migration `travel_days` doit être appliquée avec `bun run migrate` avant de
servir cette version. Elle ajoute une table indépendante sans modifier les événements.

## Tests

```sh
bun run lint
bun run typecheck
bun test tests/unit.test.ts
bun run build
```

Les tests d’intégration exigent volontairement un nom de base terminant par `_test`.
Ils créent des comptes uniques et n’effacent pas une base existante. Préparer une
base migrée et un Mailpit local, puis définir les variables `POSTGRES_*`, `SMTP_HOST`
et `SMTP_PORT` (lues uniquement par les tests, qui enregistrent la config SMTP en base), `MAILPIT_URL` et `BETTER_AUTH_URL=http://localhost:3000` :

```sh
bun run migrate
bun run test:integration
```

Pour les tests navigateur, utiliser `BETTER_AUTH_URL=http://localhost:3038` et
les mêmes autres variables. Le runner démarre et arrête son propre serveur :

```sh
bunx playwright install chromium
bun run test:e2e
```

Les tests couvrent deux membres et un tiers : permissions, conflits de versions,
invitations, tags, changements de visibilité, abonnements/révocation ICS, rappels
par personne et canal, reprise du worker, dates et changements d’heure, ainsi qu’un
parcours OAuth local complet (PKCE, consentement, scopes, expiration, renouvellement,
MCP et révocation). Le navigateur vérifie les formulaires sur une largeur de téléphone.

### Recette réelle HTTPS — à effectuer après déploiement

Les tests locaux n’attestent pas la connexion à un vrai compte Claude ni la réception
Web Push sur un vrai téléphone. Avant d’annoncer cette validation complète :

1. Créer deux comptes vérifiés et les relier au même calendrier commun.
2. Connecter chacun à l’instance HTTPS depuis un vrai connecteur Claude.
3. Créer depuis Claude un événement commun avec tags ; vérifier sa présence dans les deux comptes.
4. Créer un solo ; vérifier qu’il est visible seulement par son propriétaire sur le site,
   via MCP et dans son ICS, y compris après un essai d’accès direct par l’autre membre.
5. Choisir des tags et canaux différents pour les deux comptes ; vérifier les e-mails
   et notifications réels attendus pour le même événement commun, sans doublons.
6. Modifier dates/tags/préférences puis tester suppression et départ du couple avant échéance.
7. Révoquer Claude depuis FSC ; vérifier le refus immédiat de l’ancien accès et du
   renouvellement, puis reconnecter et vérifier un nouveau consentement.

## Sauvegarde et restauration

Sauvegarder PostgreSQL et conserver séparément `.env` dans un stockage privé :

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > fsc.dump
```

Restaurer dans une **nouvelle base vide**, puis pointer FSC vers cette base. Par exemple,
avec les variables `POSTGRES_*` désignant le serveur et la nouvelle base :

```sh
PGHOST="${POSTGRES_HOST:-localhost}" PGPORT="${POSTGRES_PORT:-5432}" \
PGUSER="$POSTGRES_USER" PGPASSWORD="$POSTGRES_PASSWORD" \
pg_restore --no-owner --dbname="$POSTGRES_DB" fsc.dump
```

Restaurer aussi `BETTER_AUTH_SECRET` et les clés VAPID pour conserver la validité des
sessions/clients chiffrés et abonnements push. Après restauration, exécuter les migrations
en attente avant de redémarrer l’application (en Docker, le conteneur `app` les applique au démarrage). Ne pas remettre automatiquement
en attente des rappels `dispatching`, `uncertain` ou `sent`.
