---
name: FSC — Fucking Simple Calendar
description: Un calendrier quotidien compact, commun ou solo.
colors:
  background: "#f6f6f6"
  surface: "#ffffff"
  ink: "#272725"
  muted: "#62625e"
  neutral: "#f1f1f1"
  common: "#d0e8b8"
  solo: "#aaa0d0"
  travel: "#f4d4b8"
  border: "#d3d3ce"
  error: "#9d2929"
  focus: "#62528e"
  field-border: "#92928c"
  button-hover: "#42423e"
  button-active: "#171716"
  nav-text: "#e8e8e3"
  nav-hover: "#41413e"
  error-background: "#fceeee"
typography:
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Manrope, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  event-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.6
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
rounded:
  card: "24px"
  field: "16px"
  pill: "999px"
  visibility: "20px"
  navigation: "28px"
  desktop-shell: "32px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  control-gap: "10px"
  md: "12px"
  field: "14px"
  lg: "16px"
  card: "20px"
  gutter: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-primary-active:
    backgroundColor: "{colors.button-active}"
  button-account:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  card-common:
    backgroundColor: "{colors.common}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  card-solo:
    backgroundColor: "{colors.solo}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  visibility-option:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.visibility}"
    padding: "16px 12px"
  navigation:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.nav-text}"
    rounded: "28px 28px 0 0"
    padding: "14px 12px calc(14px + env(safe-area-inset-bottom))"
  calendar-day:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
---

# Design System: FSC

## Overview

**Creative North Star: "Un calendrier quotidien compact"**

Un calendrier quotidien compact, lisible, commun ou solo. Le blanc, les pastels et les formes arrondies reprennent la direction mobile approuvée, dans une colonne étroite sur tous les écrans.

La couleur porte la visibilité des événements. La typographie locale Manrope et la navigation basse anthracite donnent une continuité aux formulaires, au calendrier et aux réglages.

**Key Characteristics:**
- Colonne blanche compacte, même sur grand écran.
- Vert pour Commun, lavande pour Solo, avec libellés explicites.
- Cartes rondes, boutons en pilule et jours circulaires.
- Contrôles natifs, focus visible et mouvement réduit respecté.

## Colors

Deux pastels identifient la portée d'un événement, sur une base blanche et anthracite. Les valeurs normatives sont celles du frontmatter, extraites de `src/app/globals.css`.

### Primary
- **Vert Commun** : fond des événements partagés et de la tuile Commun sélectionnée ou survolée.

### Secondary
- **Lavande Solo** : fond des événements privés et de la tuile Solo sélectionnée ou survolée.
- **Violet de focus** : contours clavier, curseur de saisie et repère du jour courant.

### Neutral
- **Blanc surface** : colonne, champs et destination active de la navigation.
- **Gris de fond** : extérieur de la colonne ; **gris neutre** : contrôles au repos et statuts.
- **Anthracite** : texte, boutons, navigation et contours de sélection.
- **Gris atténué** : informations secondaires ; les bordures de champs restent plus contrastées que les séparateurs.
- **Rouge erreur sur rose pâle** : messages d'alerte.

**The Visibility Rule.** Commun reste vert, Solo reste lavande ; le libellé accompagne toujours la couleur.

## Typography

**Display Font:** Manrope, sans-serif. **Body Font:** Manrope, sans-serif.

Manrope est chargée localement depuis `src/app/fonts/Manrope.ttf`, avec une plage de graisses de 400 à 700 et `display: swap`. Les titres sont compacts et légèrement resserrés ; le texte courant conserve une interligne généreuse.

### Hierarchy
- **Headline** : titre principal, rôle `headline` du frontmatter.
- **Section** : titres secondaires, rôle `section` ; les titres de troisième niveau utilisent 18 px et une interligne de 1,25.
- **Event title** : titre cliquable de carte, rôle `event-title`.
- **Body** : texte courant, rôle `body`.
- **Label** : champs, rôle `label` ; boutons, rôle `button`.
- **Metadata** : horaires 13 px avec chiffres tabulaires ; visibilité et tags 12 px ; destinations de navigation 11 px, graisse 600.

## Layout

La colonne blanche est centrée, d'une largeur maximale de 480 px et d'une hauteur minimale de 100dvh. Le contenu garde des gouttières de 24 px ; les cartes se suivent avec un intervalle de 12 px. Les sections successives sont espacées de 32 px.

À partir de 520 px, la colonne reçoit une marge verticale de 28 px et des coins de 32 px ; la navigation devient une barre de 456 px, située à 16 px du bas. En dessous de 360 px, les gouttières et le rembourrage des cartes passent à 16 px. Aucune disposition en plusieurs colonnes n'est introduite sur ordinateur.

La navigation conserve cinq destinations égales. Le contenu réserve 112 px plus la zone de sécurité inférieure ; les ancres et le défilement prévoient 130 px sous la cible. Le choix de visibilité conserve deux colonnes égales, Solo à gauche et Commun à droite, avec un intervalle de 10 px.

**The Compact Column Rule.** La largeur maximale de 480 px vaut pour toutes les pages et toutes les tailles d'écran.

## Elevation & Depth

Les surfaces sont plates : pas d'ombre portée. Les fonds, contours et espacements différencient les zones. L'unique ombre CSS est un contour intérieur de 2 px pour le jour courant ; il ne crée pas d'élévation. Le focus clavier utilise un contour violet de 3 px décalé de 4 px, vert et rapproché dans la navigation sombre.

## Shapes

Les cartes et états vides partagent le rayon `card`, les champs et messages le rayon `field`. Les boutons sont des pilules ; les jours et la flèche de carte sont circulaires. Les tuiles de visibilité utilisent leur rayon propre et un contour de sélection de 2 px. La barre basse arrondit seulement ses coins supérieurs sur petit écran, puis tous ses coins sur grand écran.

## Components

### Buttons

Action principale anthracite, texte blanc, hauteur minimale de 48 px. Le survol éclaircit le fond, l'activation l'assombrit ; la transition de fond dure 180 ms en `ease-out`. Un bouton désactivé affiche une opacité de 0,55 et un curseur d'indisponibilité. Le bouton de compte utilise un fond transparent et une bordure, puis un fond neutre au survol.

### Cards / Containers

Les cartes d'événement utilisent la couleur de visibilité, un titre dont le lien couvre toute la carte, l'horaire en tête. La visibilité est aussi écrite ; les horaires emploient des chiffres tabulaires. Les tags sont du texte derrière un séparateur, pas des chips. L'état vide est blanc, bordé et arrondi.

### Inputs / Fields

Champs blancs bordés, hauteur minimale de 48 px et marge supérieure de 8 px sous leur libellé. Les champs en lecture seule ont un fond neutre ; les contrôles désactivés ont une opacité de 0,6. Les alertes restent textuelles avec un fond pâle. Radios et cases ordinaires conservent leur comportement natif et mesurent 20 px.

Les rappels personnels utilisent les mêmes champs natifs : choix hériter / aucun / personnalisé, puis délai et unité côte à côte avec un intervalle de 12 px. Les explications restent en texte secondaire de 13 px.

### Navigation

Cinq liens avec SVG de 22 px et libellés français : Accueil, Calendrier, Todo, Créer, Réglages. Sur les écrans de moins de 360 px, les libellés passent à 10 px et les marges horizontales à 2 px. La destination correspondant exactement à la route porte `aria-current="page"`, un fond blanc et un texte anthracite. Le survol éclaircit le fond sombre ; le focus est vert. Les informations du compte, l'accès Claude et la déconnexion sont dans un sous-menu natif ouvert par le logo. Un clic extérieur, Échap ou un changement de page le referme. Les touches basses ont une hauteur identique de 62 px ; chaque SVG garde un carré de 22 px, avec un engrenage symétrique pour Réglages.

### Visibility tiles

Deux radios natifs obligatoires dans un fieldset avec légende. Les inputs transparents occupent toute leur tuile et restent accessibles au clavier. À la création, aucun choix n'est coché ; en édition, la visibilité actuelle est reprise. La sélection combine fond pastel, contour anthracite et coche SVG. Le survol peut montrer le pastel, mais n'ajoute ni coche ni contour de sélection. Les descriptions accessibles distinguent Solo et Commun. L'indisponibilité conserve les règles existantes, un fond neutre, une bordure grise et le curseur désactivé.

### Calendriers liés

Accès par le calendrier et le sous-menu du logo. Formulaire repliable avec nom, URL non préremplie et choix Solo / Commun ; chaque connexion affiche son état, sa dernière actualisation et ses actions de synchronisation. Les erreurs sont textuelles et les événements externes portent une explication de lecture seule sur leur fiche.

### Todo

Liste séparée par des traits fins, titre de 18 px, badge Solo lavande / Commun vert et échéance textuelle. Les retards utilisent la couleur d’erreur, accompagnée du libellé En retard. Les tâches terminées portent un titre barré dans une section repliable. Création et édition utilisent des formulaires natifs ; les préférences d’e-mail sont repliées dans la page Todo.

### Calendar days

Le bouton de création précède le calendrier, juste sous le titre. Le mois et ses commandes compactes partagent une ligne : chevrons précédent/suivant et Aujourd’hui. Un balayage tactile horizontal sur la grille change de mois (gauche : suivant ; droite : précédent), tandis que le défilement vertical et le zoom restent natifs. Les liens restent utilisables au clavier.

Les jours sont des liens circulaires, au maximum 48 px, sur fond neutre. Le survol devient vert ; la date active devient anthracite avec texte blanc. Le jour courant porte un contour intérieur violet, lavande quand il est aussi actif.

Les transitions de navigation, boutons et tuiles durent 180 ms en `ease-out`. `prefers-reduced-motion: reduce` supprime les transitions.

## Do's and Don'ts

### Do:
- Do conserver la même association de couleur entre cartes et choix de visibilité.
- Do maintenir les libellés Solo / Commun et la coche de sélection.
- Do conserver les radios natifs, leurs descriptions accessibles et le choix obligatoire sans valeur par défaut à la création.
- Do garder la colonne compacte et réserver la place de la navigation fixe.

### Don't:
- Don't élargir les pages sur ordinateur au-delà du format compact approuvé.
- Don't remplacer les icônes SVG par des glyphes de police.
- Don't masquer les états désactivés ni rendre Commun sélectionnable quand il est indisponible.
