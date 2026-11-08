# FSC (Fucking Simple Calendar)

FSC est un calendrier partagé pour deux personnes, auto-hébergeable. Chaque création d'événement ou de tâche se fait en **Commun** (visible par les deux membres) ou en **Solo** (privé). L'interface est en français. Licence [WTFPL v2](LICENSE).

## Fonctionnalités

* Comptes e-mail et mot de passe (12 caractères minimum), avec vérification de l'adresse et réinitialisation.
* Un calendrier Solo privé par compte et un calendrier Commun à deux, relié par invitation nominative (7 jours, révocable). Quitter le Commun est possible.
* Événements horaires (fuseau IANA) ou sur journées entières, tags libres, type facultatif (spectacle, sortie, vacances, visio, travail), lien http(s) et billets joints (PDF, PNG, JPEG, WebP).
* Todo Solo ou Commun, avec échéance facultative. Une tâche non terminée est en retard dès le lendemain, et un récapitulatif par e-mail part chaque jour dès 9 h locales (activé par défaut).
* Rappels par e-mail ou Web Push, réglables par profil (délai, canaux, tags) et par événement, pour soi seul.
* Export et abonnement ICS par URL secrète, pour chaque calendrier.
* Calendriers externes liés par URL ICS HTTPS, en lecture seule, synchronisés toutes les 15 minutes.
* Jours de déplacement partagés avec le partenaire.
* Connecteur MCP pour Claude et API REST `/api/v1` documentée en OpenAPI, avec clés d'API.

## Limites assumées

* Pas de récurrence native : seules les récurrences des calendriers ICS importés sont développées.
* Pas de CalDAV ni de synchronisation bidirectionnelle.
* Un calendrier Commun compte au plus deux membres (contrôlé côté serveur).
* Un seul réplica de l'application : le conteneur embarque le worker.
* Les billets sont stockés sur disque local et se sauvegardent séparément de la base.

## Démarrage rapide avec Docker

Ce démarrage construit l'image localement et lance l'application sur `http://localhost:3000`.

Prérequis :

* Docker avec Docker Compose v2
* Un clone de ce dépôt

1. Copiez le fichier d'exemple.

   ```sh
   cp .env.example .env
   ```

2. Dans `.env`, définissez `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` (32 caractères aléatoires minimum) et `BETTER_AUTH_URL=http://localhost:3000`.

3. Construisez et démarrez les services.

   ```sh
   docker compose up -d --build
   ```

   Résultat attendu : `docker compose ps` affiche les services `db`, `app` et `mailpit` démarrés, puis `app` passe en `healthy`.

4. Créez le premier administrateur (voir [Créer des comptes](#créer-des-comptes)), puis ouvrez `http://localhost:3000`.

Le service `mailpit` démarre toujours avec `docker-compose.yaml`. Son interface est sur `http://127.0.0.1:8025`. Il capture les e-mails sans les envoyer : dans **Réglages**, renseignez l'hôte `mailpit` et le port `1025`.

Au démarrage, le conteneur applique les migrations, puis lance le worker et Next.js. Une migration en échec empêche le démarrage.

## Déployer l'image GHCR

`docker-compose-prod.yaml` utilise l'image publiée `ghcr.io/lucassovre/fsc:latest` au lieu d'un build local. Il définit PostgreSQL 17 et l'application, sans Mailpit, avec le port `3000:3000` fixe.

Prérequis :

* Un serveur avec Docker Compose v2
* Un nom de domaine en HTTPS devant l'application (voir [Reverse proxy et sécurité](#reverse-proxy-et-sécurité))
* Un serveur SMTP, à renseigner dans **Réglages** après le premier démarrage

1. Créez un `.env` à côté du fichier Compose avec `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` et `BETTER_AUTH_URL` (par exemple `https://calendar.example.com`).
2. Démarrez les services.

   ```sh
   docker compose -f docker-compose-prod.yaml up -d
   ```

3. Vérifiez l'état : `docker compose -f docker-compose-prod.yaml ps` doit afficher `app` en `healthy`.
4. Pour mettre à jour, récupérez la nouvelle image puis recréez le conteneur.

   ```sh
   docker compose -f docker-compose-prod.yaml pull app
   docker compose -f docker-compose-prod.yaml up -d
   ```

> **Warning**
> `docker-compose-prod.yaml` ne définit ni volume `uploads` ni `UPLOAD_DIR`. Les billets joints sont écrits dans le système de fichiers du conteneur et sont perdus quand il est recréé. Ajoutez un volume monté sur `/data/uploads` et la variable `UPLOAD_DIR=/data/uploads` avant d'utiliser les billets.

## Configuration

Les variables se lisent dans `.env` (Compose) ou dans l'environnement du processus.

| Variable | Défaut | Description |
| --- | --- | --- |
| `POSTGRES_DB` | `fsc` | Nom de la base. |
| `POSTGRES_USER` | `fsc` | Utilisateur PostgreSQL. |
| `POSTGRES_PASSWORD` | aucun | Mot de passe PostgreSQL. Obligatoire en production, non vide. |
| `POSTGRES_HOST` | `localhost` | Hôte de la base. Docker impose `db`. |
| `POSTGRES_PORT` | `5432` | Port de la base. |
| `APP_PORT` | `3000` | Port publié par `docker-compose.yaml`. |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Origine publique, sans chemin. Obligatoire en production. |
| `BETTER_AUTH_SECRET` | aucun | Secret d'au moins 32 caractères en production. |
| `UPLOAD_DIR` | `./uploads` | Dossier des billets. Docker utilise `/data/uploads`. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | vides | Clés Web Push. Sans elles, Web Push est refusé. |
| `VAPID_SUBJECT` | `mailto:admin@example.com` | Contact associé aux clés VAPID. |

En production, l'application refuse de démarrer correctement sans un secret de 32 caractères minimum, un mot de passe PostgreSQL non vide et une URL en HTTPS. HTTP reste accepté sur `localhost`, `127.0.0.1` et `[::1]`.

> **Important**
> `BETTER_AUTH_SECRET` chiffre aussi le mot de passe SMTP et les URL des calendriers liés. Le changer rend le mot de passe SMTP illisible et invalide les calendriers liés. Conservez-le avec vos sauvegardes.

Il n'existe pas de variable SMTP applicative : le SMTP se règle dans l'interface.

### Créer des comptes

L'inscription publique est désactivée. Les comptes se créent uniquement en ligne de commande, et une invitation ne crée pas de compte.

1. Créez l'administrateur. L'option `--admin` marque l'adresse comme vérifiée, sans SMTP.

   ```sh
   docker compose exec app node --import tsx scripts/create-account.ts --email admin@example.com --name Admin --admin
   ```

   Le mot de passe est demandé sans affichage. Pour un script, ajoutez `--password-stdin` et fournissez le mot de passe sur l'entrée standard.

2. Connectez-vous, puis ouvrez **Réglages** pour configurer le SMTP.
3. Créez les autres comptes avec la même commande, sans `--admin`. L'e-mail de vérification est obligatoire avant la connexion.

Avec `--admin` sur un compte existant, la commande le promeut administrateur. Avec Compose de production, ajoutez `-f docker-compose-prod.yaml` après `docker compose`.

### Configurer le SMTP

Prérequis : être administrateur.

1. Dans **Réglages**, ouvrez la section E-mail (SMTP).
2. Renseignez l'hôte, le port, l'option sécurisée, l'expéditeur, et si besoin l'utilisateur et le mot de passe.
3. Lancez le test d'envoi.

Tant que le SMTP n'est pas configuré, les e-mails de vérification ne partent pas. Un administrateur peut alors vérifier une adresse depuis la liste des utilisateurs, ou en ligne de commande :

```sh
docker compose exec app node --import tsx scripts/verify-account.ts --email alice@example.com
```

Ajoutez `--resend` pour renvoyer l'e-mail de vérification au lieu de valider l'adresse.

### Activer Web Push

1. Générez une paire de clés.

   ```sh
   bunx web-push generate-vapid-keys
   ```

2. Placez-les dans `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY`, puis redémarrez l'application.
3. Sur chaque appareil, activez-le dans les réglages et autorisez les notifications.

Sur iPhone, Web Push exige iOS 16.4 ou plus récent et FSC ajouté à l'écran d'accueil. Les notifications sont génériques : le détail est chargé après authentification.

## Reverse proxy et sécurité

Placez FSC derrière un reverse proxy HTTPS et gardez le port de l'application inaccessible depuis Internet. Exemple Nginx, à placer dans un serveur TLS :

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

* Le proxy doit écraser `X-Real-IP` et `X-Forwarded-For` : la limitation de débit des connexions, stockée en base, s'appuie sur ces en-têtes.
* Ne mettez pas en cache les pages authentifiées, `/api/auth`, `/api/v1`, `/mcp`, `/exports` et `/abonnements`.
* Excluez des journaux du proxy les URL d'invitation, d'abonnement et de réinitialisation : elles contiennent des secrets.
* Les secrets ICS, les invitations et les clés d'API sont stockés hachés. Les jetons OAuth sont revérifiés à chaque appel.

`GET /health` répond 503 si la configuration de production ou la base est invalide. Le healthcheck du worker échoue si son heartbeat a plus de deux minutes.

## Connecter Claude (MCP)

Prérequis : une instance en HTTPS et un compte vérifié.

1. Dans FSC, ouvrez la page **Connecter Claude** (`/claude`) et copiez l'adresse `https://VOTRE-DOMAINE/mcp`.
2. Dans Claude, ajoutez un connecteur personnalisé avec cette adresse.
3. Choisissez OAuth et l'identité publiée de Claude, connectez-vous à FSC, puis autorisez l'accès.

Chaque membre utilise son propre compte. Révoquez une connexion depuis la page `/claude` : l'accès et le renouvellement sont refusés aussitôt.

Caractéristiques du serveur :

* Endpoint `/mcp`, requêtes POST uniquement, corps de 64 Ko maximum.
* OAuth Better Auth : `authorization_code` et `refresh_token`, PKCE, CIMD, jeton d'accès de 3600 s. L'enregistrement dynamique de clients est désactivé.
* Audience `https://VOTRE-DOMAINE/mcp`. Métadonnées sous `/.well-known/oauth-authorization-server` et `/.well-known/oauth-protected-resource`.
* Scopes : `calendar:read`, `event:write`, `todo:write`, `settings:write`, `linked:write`, `travel:write`, `admin` (SMTP, réservé aux administrateurs) et `offline_access`.

Les outils couvrent les fonctions du site, sauf la connexion, le mot de passe, la création de compte et l'abonnement push. Les actions destructives exigent `confirm: true`, et la création d'événement ou de tâche exige une visibilité explicite.

| Domaine | Outils |
| --- | --- |
| Calendriers et événements | `list_calendars`, `list_events`, `get_event`, `create_event`, `update_event`, `delete_event`, `set_event_reminder`, `export_ics` |
| Todo | `list_todos`, `create_todo`, `update_todo`, `set_todo_status`, `delete_todo`, `set_todo_email` |
| Réglages et partage | `get_settings`, `save_preferences`, `invite_partner`, `revoke_invitation`, `accept_invitation`, `leave_common_calendar`, `rotate_feed`, `revoke_feed`, `list_oauth_connections`, `revoke_oauth_connection` |
| Calendriers liés et déplacements | `list_linked_calendars`, `add_linked_calendar`, `refresh_linked_calendar`, `set_linked_calendar_enabled`, `remove_linked_calendar`, `list_travel_days`, `set_travel_days` |
| Administration | `get_smtp_config`, `save_smtp_config`, `test_smtp` |

## API REST

L'API `/api/v1` expose 35 opérations, miroir des outils MCP, avec les mêmes scopes et règles métier. La spécification OpenAPI est publique : `GET /api/v1/openapi.json`.

* Authentification : en-tête `X-API-Key: fsc_…` ou `Authorization: Bearer` avec un jeton OAuth.
* `GET` et `DELETE` : paramètres en query string. `POST` et `PUT` : corps JSON de 64 Ko maximum.
* Les identifiants de ressource sont dans le chemin. Pour modifier ou supprimer, envoyez la `version` lue.
* Erreurs : `{ "error": "message" }` avec le statut HTTP. Les réponses portent `Cache-Control: no-store`.

### Créer une clé d'API

Prérequis : un compte à l'adresse vérifiée.

1. Dans **Réglages**, ouvrez la section des clés d'API et créez une clé.
2. Choisissez ses scopes. Le scope `admin` est réservé aux administrateurs.
3. Copiez la clé : elle n'est affichée qu'une fois.
4. Appelez l'API.

   ```sh
   curl -H "X-API-Key: fsc_VOTRE-CLE" https://VOTRE-DOMAINE/api/v1/todos
   ```

   Résultat attendu : la liste JSON de vos tâches.

Un compte peut avoir 20 clés. Seul le hash SHA-256 est stocké, et une clé n'est valable que sur `/api/v1`, pas sur `/mcp`.

## Développement local

Prérequis :

* Bun 1.4.2
* Node.js 26
* PostgreSQL 17

1. Installez les dépendances.

   ```sh
   bun install
   ```

2. Créez `.env` depuis `.env.example`, avec `POSTGRES_HOST=localhost`.
3. Appliquez les migrations.

   ```sh
   bun run migrate
   ```

4. Lancez le serveur sur `http://localhost:3000`.

   ```sh
   bun run dev
   ```

5. Dans un second terminal, lancez le worker.

   ```sh
   bun run worker
   ```

Commandes utiles : `bun run lint`, `bun run typecheck`, `bun run build`, `bun run account:create`, `bun run account:verify`. Le serveur de développement utilise Webpack (`next dev --webpack`).

### Contrat de données et migrations

Prisma 8 (version candidate) porte le contrat de stockage. Le fichier `src/prisma/contract.prisma` est assemblé par `bun run auth:contract` à partir des schémas Better Auth et de `src/prisma/domain.prisma`. Les fichiers `contract.json` et `contract.d.ts` sont générés : ne les modifiez pas à la main.

1. Éditez `src/prisma/domain.prisma`.
2. Régénérez le contrat avec `bun run auth:contract`, puis `bun run contract:emit`.
3. Planifiez la migration avec `bun run migration:plan --name DESCRIPTION`.
4. Appliquez-la avec `bun run migrate`, puis contrôlez avec `bun run db:verify`.

Versionnez le contrat, ses artefacts et le dossier `migrations/`. N'utilisez pas la commande de migration de Better Auth.

## Tests et CI

| Commande | Contenu |
| --- | --- |
| `bun run test` | Tests unitaires et API. |
| `bun run test:integration` | Tests d'intégration. Exigent une base migrée dont le nom finit par `_test` et un Mailpit local. |
| `bun run test:e2e` | Tests Playwright sur un viewport de téléphone. Démarrent `bun run dev --port 3038`. |

Les tests d'intégration lisent `SMTP_HOST` et `SMTP_PORT` (défauts `127.0.0.1` et `1025`) et `MAILPIT_URL`. Pour Playwright, installez d'abord le navigateur avec `bunx playwright install chromium`.

La CI (`.github/workflows/ci.yml`) s'exécute sur les push hors `main`, les pull requests et le lancement manuel. Elle comprend trois jobs : `checks` (lint, types, tests, build), `integration` (PostgreSQL 17 et Mailpit) et `e2e` (Playwright, Chromium).

## Publication de l'image

Le workflow `.github/workflows/publish-container.yml` publie l'image sur GHCR une fois la CI réussie. Il se déclenche sur la branche par défaut, sur les tags `v*` ou à la main. Il n'utilise aucun secret en dehors de `GITHUB_TOKEN`.

| Tag | Quand |
| --- | --- |
| `sha-<SHA complet>` | Chaque publication. |
| `latest` | Publication depuis la branche par défaut. |
| `v1.2.3` | Publication d'un tag Git `v1.2.3`. |

L'image est construite en `linux/amd64` sous `ghcr.io/<propriétaire>/<dépôt>`, en minuscules.

## Architecture

* `src/app` : routes App Router, actions serveur et composants.
* `src/server` : logique métier (calendrier, todo, worker, e-mail, push, ICS, calendriers liés, billets, clés d'API), avec `mcp/` et `api/`.
* `src/prisma` : contrat de données.
* `migrations/app` : migrations horodatées.
* `scripts` : worker, création et vérification de comptes, outils de contrat.
* `tests` : tests unitaires, API, intégration et end-to-end.
* `public/sw.js` : service worker pour les notifications, sans cache.

Le worker boucle toutes les 30 secondes. Il réessaie un envoi temporairement rejeté jusqu'à 4 fois. Un envoi interrompu passe en `uncertain` et n'est jamais rejoué. Voir [PRODUCT.md](PRODUCT.md) et [DESIGN.md](DESIGN.md) pour le produit et le design.

## Sauvegarde

Sauvegardez la base, le dossier des billets et `.env`.

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > fsc.dump
```

Restaurez dans une base vide avec `pg_restore --no-owner`. Conservez `BETTER_AUTH_SECRET` et les clés VAPID pour que les données chiffrées et les abonnements push restent valides.

## Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `docker compose` s'arrête avec « Set POSTGRES_PASSWORD in .env » | Variable obligatoire absente. | Renseignez `POSTGRES_PASSWORD`, `BETTER_AUTH_URL` et `BETTER_AUTH_SECRET` dans `.env`. |
| Le conteneur `app` ne démarre pas | Une migration échoue. | Lisez `docker compose logs app` et corrigez la cause avant de relancer. |
| `/health` répond 503 | Configuration de production ou base invalide. | Vérifiez le secret (32 caractères), l'URL HTTPS et le mot de passe PostgreSQL. |
| `app` reste `unhealthy` | Le worker n'a pas écrit son heartbeat depuis plus de 2 minutes. | Consultez les journaux de `app`. |
| Aucun e-mail de vérification | SMTP non configuré. | Configurez le SMTP, ou vérifiez l'adresse avec `account:verify`. |
| Les notifications push sont refusées | Clés VAPID absentes. | Générez et définissez les clés VAPID. |
| Les billets disparaissent après une mise à jour | Pas de volume sur `UPLOAD_DIR`. | Montez un volume sur `/data/uploads`. |
| Le mot de passe SMTP est illisible, les calendriers liés échouent | `BETTER_AUTH_SECRET` a changé. | Rétablissez l'ancien secret, ou resaisissez le SMTP et recréez les liens. |
| Claude ne peut pas se connecter | URL non HTTPS ou proxy qui filtre `/mcp`. | Utilisez une origine HTTPS et laissez passer `/mcp` et `/.well-known`. |

## Licence

[WTFPL v2](LICENSE).
