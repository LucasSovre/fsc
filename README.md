# FSC — Fucking Simple Calendar

Un calendrier partagé pour deux, avec un choix **Commun / Solo** à chaque création.
Interface française en HTML natif, sans CSS. Licence [WTFPL v2](LICENSE).

## Fonctionnalités

- Comptes individuels e-mail/mot de passe, vérification d’adresse et réinitialisation via Better Auth.
- Un agenda solo privé par compte et un calendrier commun à deux, avec invitations nominatives de sept jours.
- Accueil chronologique, navigation mensuelle, événements horaires ou sur plusieurs journées entières, tags multiples.
- Modification partagée des événements communs ; seul le créateur peut changer leur visibilité.
- Préférences de rappel personnelles : délai, e-mail, Web Push, tous les événements ou au moins un tag sélectionné.
- Exports et abonnements ICS distincts, secrets et révocables, pour Commun et Solo.
- Connecteur MCP OAuth pour Claude : lecture des agendas/événements et création avec visibilité obligatoire.

Pas de récurrences, CalDAV, import ICS ou synchronisation bidirectionnelle dans cette V1.

## Démarrage Docker

Prérequis : Docker Compose v2, un domaine HTTPS, un SMTP et un reverse proxy.

```sh
cp .env.example .env
```

Configurer au minimum :

- `POSTGRES_PASSWORD` : mot de passe URL-safe, par exemple généré par `openssl rand -hex 32`.
- `BETTER_AUTH_SECRET` : secret aléatoire d’au moins 32 caractères, stable entre déploiements.
- `BETTER_AUTH_URL` : origine HTTPS publique exacte, sans chemin, par exemple `https://calendar.example.com`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` : vérification, invitations, reset et rappels.
- Facultatif : clés Web Push générées une fois avec `bunx web-push generate-vapid-keys`, puis `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f app worker migrate
```

Compose démarre PostgreSQL, applique la migration initiale, puis démarre l’application et
un worker unique. Une migration en échec empêche leur démarrage. L’application est exposée
sur `127.0.0.1:3000` par défaut ; la base reste dans le réseau Docker. Les images tournent
avec un utilisateur non-root. Les identifiants ne sont pas nécessaires au build.

**Cette version repart de zéro** : l’ancien schéma de démonstration et ses migrations
ont été remplacés. Utiliser une base vide et, pour une installation à côté de l’ancienne,
un autre projet Compose (`docker compose -p fsc-v1 …`) et un autre port. Aucun script
ne supprime ni ne réinitialise une base ou un volume existant.

`docker compose down` conserve le volume PostgreSQL. Ne pas changer son mot de passe
dans `.env` sans le changer également dans PostgreSQL. Une mise à jour normale utilise
`docker compose up -d --build` ; ne pas régénérer les migrations sur le serveur.

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
passage réussi. Ne pas lancer plusieurs réplicas du worker.

### E-mails de développement

Pour capturer les e-mails sans les envoyer à leurs destinataires :

```sh
# Dans .env : SMTP_HOST=mailpit, SMTP_PORT=1025, SMTP_SECURE=false,
# SMTP_USER et SMTP_PASSWORD vides.
docker compose --profile mailpit up -d --build
```

Boîte de réception locale : <http://localhost:8025>. Le profil Mailpit ne relaie pas
les messages vers Internet. Utiliser un SMTP réel lors du déploiement public.

## Développement direct

Prérequis : Bun, Node compatible avec Next.js, PostgreSQL 17 et un SMTP de développement.

```sh
bun install
# Dans .env : DATABASE_URL accessible depuis l’hôte,
# BETTER_AUTH_URL=http://localhost:3000 et SMTP de développement.
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
- `migrations/` contient une seule nouvelle migration initiale, son snapshot et son ref `db`.

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

## Tests

```sh
bun run lint
bun run typecheck
bun test tests/unit.test.ts
bun run build
```

Les tests d’intégration exigent volontairement un nom de base terminant par `_test`.
Ils créent des comptes uniques et n’effacent pas une base existante. Préparer une
base migrée et un Mailpit local, puis définir `DATABASE_URL`, `SMTP_HOST`,
`SMTP_PORT`, `MAILPIT_URL` et `BETTER_AUTH_URL=http://localhost:3000` :

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
avec un PostgreSQL de restauration dont `DATABASE_URL` désigne la nouvelle base :

```sh
pg_restore --no-owner --dbname="$DATABASE_URL" fsc.dump
```

Restaurer aussi `BETTER_AUTH_SECRET` et les clés VAPID pour conserver la validité des
sessions/clients chiffrés et abonnements push. Après restauration, exécuter les migrations
en attente avant de redémarrer application et worker. Ne pas remettre automatiquement
en attente des rappels `dispatching`, `uncertain` ou `sent`.
