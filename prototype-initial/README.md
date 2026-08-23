# ValidaPharm

Assistant de rédaction pour la **qualité, la validation et la gestion du risque** dans l'industrie **pharmaceutique** et des **dispositifs médicaux**.

Application web autonome (HTML/CSS/JS, aucune dépendance, aucune installation) qui fonctionne entièrement dans le navigateur — les données restent en local (`localStorage`), rien n'est envoyé sur un serveur.

## Ouvrir l'outil

Ouvrir simplement `index.html` dans un navigateur (double-clic, ou glisser-déposer dans le navigateur). Aucun serveur ni build n'est nécessaire.

## Modules disponibles

**Documents qualité**
- Change Control (gestion des changements) — évaluation d'impact ICH Q9
- CAPA — analyse de cause racine (5 Pourquoi, Ishikawa), actions correctives/préventives, vérification d'efficacité
- Validation de nettoyage — pire cas, MACO, plan d'échantillonnage, résultats

**Qualification d'équipement**
- FAT, SAT, IQ, OQ, PQ — protocole + rapport (prérequis, critères d'acceptation, tableau de tests, écarts, conclusion)
- Cycle en V — diagramme URS/FS/DS ↔ IQ/OQ/PQ + matrice de traçabilité des exigences

**Systèmes informatisés**
- CSV (Computerized System Validation) — approche par catégorie GAMP 5, livrables du cycle de vie, gestion des accès/audit trail
- Data Integrity — grille d'évaluation ALCOA+

**Analyse de risque**
- Analyse de risque qualité (ICH Q9) — registre des risques (probabilité × gravité, niveau de risque, mesures de maîtrise)
- AMDEC / FMEA / FMECA — tableau avec calcul automatique de l'IPR (S × O × D), code couleur par criticité, colonnes avant/après action

Chaque document généré comprend automatiquement : en-tête (référence, titre, version), historique des révisions, et bloc d'approbation (rédacteur/vérificateur/approbateur).

## Fonctions transverses

- **Export Word (.doc)** : génère un fichier ouvrable directement dans Microsoft Word.
- **Impression / PDF** : mise en page dédiée à l'impression (masque le menu et les boutons).
- **Export/Import JSON** : sauvegarde ou transfère l'ensemble de vos documents.
- **Bibliothèque de normes** : liste consultable des référentiels cités par les modules (ICH, ISO, GAMP 5, ASTM E2500, EudraLex Annexes 1/11/15, 21 CFR Part 11/210/211/820, PIC/S, AIAG-VDA...).

## Avertissement

Les gabarits et références normatives fournis sont une aide à la rédaction et une structuration méthodologique ; ils ne remplacent pas :
- la consultation des textes réglementaires en vigueur,
- les procédures qualité internes du site,
- la revue et l'approbation par les fonctions qualité compétentes.

Les seuils (ex. IPR/RPN) et échelles de cotation proposés sont des valeurs indicatives à adapter et à justifier dans la procédure de gestion du risque qualité du site.

## Structure du projet

```
validapharm/
  index.html          Page principale
  css/style.css        Styles (écran + impression)
  js/data.js            Référentiel de normes + définition des 13 modules
  js/render.js           Moteur de rendu générique (formulaires, tableaux, document)
  js/fmea.js              Module AMDEC/FMEA (calcul IPR) + diagramme cycle en V (SVG)
  js/export.js             Export Word / impression / JSON
  js/app.js                 Navigation, état, bibliothèque de normes
```

Pour ajouter un nouveau type de document, il suffit d'ajouter une entrée dans `MODULES` (`js/data.js`) : le moteur de rendu générique s'occupe du formulaire, du document et des exports.
