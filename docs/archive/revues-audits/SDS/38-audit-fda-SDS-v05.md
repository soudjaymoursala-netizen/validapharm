# Rapport d'audit — FDA (simulation) — SDS v05

| | |
|---|---|
| **Référence** | AUDIT-FDA-VALIDAPHARM-2026-006 |
| **Version** | 01 (close) |
| **Statut** | Close — constat intégré en SDS v06 |

---

## Constat

### MAJ-01 — Moment de génération du `transaction_id` non précisé, risque de rupture d'idempotence

**Constat** : §6bis exige un `transaction_id` pour garantir l'idempotence du retry (URS-F-092quater), mais ne précise pas **quand** il est généré. S'il est régénéré à chaque tentative (plutôt que généré une fois et réutilisé), un scénario classique casse l'idempotence : le premier envoi réussit côté serveur mais la réponse de confirmation se perd (timeout réseau) — ValidaPharm retente avec un **nouveau** `transaction_id`, créant un doublon côté système cible malgré le mécanisme censé l'empêcher.

**Sévérité** : Majeur — mine directement la garantie déjà promise pour AR-R-50.

## Suite donnée

SDS v06 : le `transaction_id` est généré et **persisté localement avant** le premier appel réseau (jamais régénéré) ; tout retry (manuel ou automatique) réutilise ce même identifiant jusqu'à confirmation de réception explicite du système cible ou décision explicite de l'utilisateur d'abandonner l'envoi.
