# Archive — comptes-rendus de revues et audits

Historique complet des revues multi-experts (panel E1-E7) et audits simulés (Swissmedic, FDA, cabinet-conseil GxP, QA spécialisés) qui ont produit les documents vivants de `docs/` (URS, AR, FS, FDS, SDS). Conservé intégralement — jamais supprimé — conformément au principe ALCOA+/GxP déjà appliqué dans la conception de l'outil lui-même (aucune version antérieure d'un livrable n'est supprimée, voir SDS §3 « révisions »).

Ces documents sont des **enregistrements clos** : ils ne sont plus mis à jour. Pour l'état courant d'une exigence, se référer au document vivant correspondant dans `docs/` (jamais à un enregistrement d'archive).

## Structure

```
archive/
  revues-audits/
    URS/               revues qui ont fait évoluer l'URS (v01 → v20)
    FS/                revues + audits Swissmedic/FDA sur la FS
    FDS/               revues + audits (Swissmedic/FDA/cabinet GxP/QA spécialisés) sur la FDS
    SDS/               revues + audits Swissmedic/FDA sur la SDS
    besoins-nouveaux/  revues dédiées aux 5 besoins ajoutés après clôture initiale
                        (connecteurs QMS, Structure Système, dossier vivant,
                        export historique, statut de qualification)
    charte-graphique/  revue + audit accessibilité dédiés à la charte graphique
  autres/              supports annexes (ex. préparation présentation dirigeants)
```

## Index

| Dossier | Documents | Portée |
|---|---|---|
| `revues-audits/URS/` | 4 | Revues multi-experts ayant fait évoluer l'URS |
| `revues-audits/FS/` | 6 | Revue + audits Swissmedic/FDA (FS initiale et FS v06→v08) |
| `revues-audits/FDS/` | 7 | Revue + 4 audits (Swissmedic/FDA/cabinet GxP/QA) (FDS initiale et FDS v05→v10) |
| `revues-audits/SDS/` | 6 | Revue + audits Swissmedic/FDA (SDS initiale et SDS v04→v06) |
| `revues-audits/besoins-nouveaux/` | 5 | Revues des 5 besoins (connecteurs QMS, Structure Système, dossier vivant, export PDF, statut de qualification) |
| `revues-audits/charte-graphique/` | 2 | Revue multi-experts + audit accessibilité (contraste WCAG) de la charte graphique |
| `autres/` | 1 | Préparation présentation dirigeants |

**Total : 31 documents archivés.**
