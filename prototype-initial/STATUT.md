# Statut de ce prototype

Prototype fonctionnel initial (HTML/CSS/JS statique, `localStorage`, 13 gabarits) créé avant la cascade de spécifications actuelle. Déplacé ici depuis `app-comores-transport/validapharm/` le 23/08/2026, conservé tel quel (aucune modification), car il représente un travail réel antérieur — pas jeté, mais **pas la base de la conception qui démarre le 23/08/2026**.

## Écart avec la conception actuelle

Ce prototype ne couvre pas :
- La persistance fichier-par-enregistrement + Git comme source de vérité (SDS §3, §5)
- Le cycle de vie des statuts et le verrouillage des documents approuvés (FS/FDS)
- Le chat expert / routeur IA multi-fournisseurs (`ProviderAdapter`, SDS §6)
- Les connecteurs QMS tiers (`QMSConnectorAdapter`, SDS §6bis)
- La Structure Système, le dossier vivant, l'export PDF d'historique, le statut de qualification (SDS §8bis)
- La séparation Couche Présentation / Couche Logique métier (SDS §2, principe FDS §8bis)

Son moteur de rendu générique par déclaration de module (`js/data.js` → `MODULES`) reste une référence de conception utile (gabarits/formulaires génériques), à réévaluer lors du choix de framework (SDS §10) plutôt qu'à reprendre tel quel.

## Utilisation

Ne pas relier ce dossier au futur code de conception sans revue explicite — à considérer comme une preuve de concept archivée, pas comme un point de départ automatique.
