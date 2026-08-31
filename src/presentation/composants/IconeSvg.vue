<script setup lang="ts">
// Jeu d'icônes minimal en SVG inline (ajouté v20, refonte UX guidée) —
// aucune dépendance externe (cohérent avec le principe local-first déjà
// acté pour la police, FDS §2bis) : chaque tracé est vendorisé ici,
// tiré de Lucide (licence ISC, tracés recopiés à la main, pas de paquet
// npm ajouté pour une dizaine de pictogrammes). `stroke="currentColor"`
// systématique — la couleur suit toujours le texte parent, jamais fixée
// ici (cohérent avec la discipline couleur+icône+texte, jamais la
// couleur seule, URS-NF-054ter).
export type NomIcone =
  | 'accueil'
  | 'dossier'
  | 'livre'
  | 'batiment'
  | 'engrenage'
  | 'utilisateur'
  | 'chevron-droit'
  | 'coche-cercle'
  | 'horloge'
  | 'oeil'
  | 'cercle-pointille'
  | 'etincelles'
  | 'plus'
  | 'archive'
  | 'reseau'
  | 'bouclier'
  | 'flux'
  | 'alerte-triangle'
  | 'lien'
  | 'nuage'
  | 'reglettes'
  | 'flacon'
  | 'graphique'
  | 'cadenas'

const props = withDefaults(defineProps<{ nom: NomIcone; taille?: number }>(), { taille: 18 })

const TRACES: Record<NomIcone, string> = {
  accueil: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  dossier: 'M3 6.5h6l2 2h10V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  livre: 'M4 4.5A2 2 0 0 1 6 3h14v16H6a2 2 0 0 0-2 2z M20 19H6a2 2 0 0 0-2 2',
  batiment: 'M4 21V6l8-3 8 3v15 M9 21v-6h6v6 M9 10h.01 M15 10h.01 M9 14h.01 M15 14h.01',
  engrenage:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 17.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 6.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V1a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V7a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 13z',
  utilisateur: 'M20 21a8 8 0 1 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'chevron-droit': 'm9 6 6 6-6 6',
  'coche-cercle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.5 12.5l2.5 2.5 5-5',
  horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2',
  oeil: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'cercle-pointille': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  etincelles:
    'M12 2v4M12 18v4M2 12h4m12 0h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19',
  plus: 'M12 5v14M5 12h14',
  archive:
    'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v2A1.5 1.5 0 0 1 19.5 9h-15A1.5 1.5 0 0 1 3 7.5z M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9 M10 13h4',
  reseau:
    'M6 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 21.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M6 6.5V13a3 3 0 0 0 3 3h1 M18 6.5V13a3 3 0 0 0-3 3h-1',
  bouclier: 'M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5z',
  flux: 'M4 5h9a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H8a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h11M4 5l3-3M4 5l3 3M17 20l3-3M17 20l3 3',
  'alerte-triangle': 'M12 3 2 20h20L12 3z M12 9v5 M12 17h.01',
  lien: 'M9.5 14.5 14.5 9.5 M7 12 5.5 13.5a3.5 3.5 0 0 0 5 5L12 17 M17 12l1.5-1.5a3.5 3.5 0 0 0-5-5L12 7',
  nuage: 'M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-2A5 5 0 0 0 6.5 19z',
  reglettes: 'M4 6h16M4 12h10M4 18h13',
  flacon: 'M9 2h6 M10 2v5.5L4.5 17a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 7.5V2 M7.5 14h9',
  graphique: 'M4 20V10 M10 20V4 M16 20v-7 M4 20h16',
  cadenas: 'M6 10.5V7a6 6 0 1 1 12 0v3.5 M5 10.5h14V21H5z',
}
</script>

<template>
  <svg
    :width="props.taille"
    :height="props.taille"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="TRACES[props.nom]" />
  </svg>
</template>
