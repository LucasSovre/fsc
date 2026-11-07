# Revue de la refonte FSC

Disposition du reviewer impeccable : **ship**.

Revue basée sur la direction explicitement approuvée, le code et 29 captures requises : calendrier, formulaires et pages principales aux largeurs 320, 390, 480 et 1440 px ; sélection Solo au clavier ; connexion ; titre long ; zoom CSS à 200 %. La référence originale et une carte QUALITY BAR n'étaient pas disponibles au reviewer : la comparaison porte sur le contrat approuvé, sans revendication de reproduction pixel à pixel.

Aucune correction matérielle demandée. Manrope locale, colonne compacte, cartes pastel, calendrier circulaire, navigation basse et sélecteur Solo / Commun validés dans ce périmètre. Les captures complètes affichent la barre fixe à la position du viewport d'origine ; des captures du viewport et du formulaire défilé complètent cette preuve.

Validation : lint, TypeScript, 11 tests unitaires, build de production et 3 tests Playwright réussis. Le test de présentation a été rejoué pour capturer la couleur définitive après la transition. Tests sur PostgreSQL et Mailpit isolés, sans modification des données existantes.

Les captures sont générées dans `test-results/`, ignoré par Git. Le détecteur statique a parcouru les sources sans signalement ; ses vérifications de contraste sur DOM n'ont pas été exécutées.

## Ajustements demandés ensuite

Le logo ouvre désormais un sous-menu natif du compte, refermé par clic extérieur, Échap ou navigation. Les touches basses ont une hauteur commune et l'engrenage Réglages est symétrique. Ces comportements ont été couverts par les tests navigateur avant la demande d'arrêt des vérifications visuelles.

À la demande de l'utilisateur, les commandes mensuelles sont ensuite devenues des chevrons compacts à côté du mois, la grille reçoit un balayage tactile gauche/droite et le bouton de création est remonté sous le titre. Pour cette dernière modification, validation limitée au lint, à TypeScript et au build : la vérification dans le navigateur est laissée à l'utilisateur.

## Todo

Ajout d'une cinquième destination Todo, des tâches Solo / Commun et d'un récapitulatif personnel à partir de 9 h locales, désactivable dans la page Todo. Les tâches sont en retard après leur date d'échéance ; les tâches sans échéance ou terminées sont exclues. Vérifications sans navigateur, conformément à la demande utilisateur : lint, TypeScript, build, 16 tests unitaires et 11 tests d'intégration réussis. Les tests couvrent les droits, les conflits, la date locale et le changement d'heure, l'absence de doublons, les réessais explicites et la reprise après interruption. La migration additive a été appliquée uniquement à la base isolée de test.

## Calendriers liés

À la demande de l'utilisateur, ajout de calendriers externes liés par URL ICS HTTPS/webcal, actualisés environ toutes les 15 minutes et manuellement. Choix Solo / Commun explicite, liens chiffrés non réaffichés, événements source en lecture seule et rappels personnels maintenus. Fenêtre documentée d'un an passé et deux ans futurs ; les erreurs conservent le dernier instantané réussi. Vérifications sans navigateur : lint, TypeScript, build, 23 tests unitaires et 13 tests d'intégration réussis. Couverture des fuseaux, récurrences courantes, exclusions/annulations, mises à jour sans doublons, suppressions, chiffrement, filtrage d'adresses réseau et permissions. Les flux des tests sont injectés ; aucun calendrier privé réel n'a été téléchargé. La migration additive a été appliquée uniquement à la base isolée de test.
