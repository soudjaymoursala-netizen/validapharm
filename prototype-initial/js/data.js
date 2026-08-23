/* ValidaPharm — Référentiel de données
   Normes citées à titre indicatif (bibliothèque interne) — se référer aux
   textes officiels en vigueur (dossier "00 - Normes et guideline GMP" / ISO / ATSM / EudraLex / ISPE / PIC-S / CSV-CQV). */

const STANDARDS = {
  ich_q9:  { code: "ICH Q9 (R1)",      title: "Quality Risk Management",                                   scope: "Management du risque qualité" },
  ich_q10: { code: "ICH Q10",          title: "Pharmaceutical Quality System",                              scope: "Système qualité pharmaceutique" },
  ich_q7:  { code: "ICH Q7",           title: "GMP for Active Pharmaceutical Ingredients",                  scope: "BPF substances actives" },
  gamp5:   { code: "ISPE GAMP 5 (2e éd.)", title: "A Risk-Based Approach to Compliant GxP Computerized Systems", scope: "Validation des systèmes informatisés (CSV)" },
  iso13485:{ code: "ISO 13485:2016",   title: "Dispositifs médicaux — Systèmes de management de la qualité",scope: "SMQ dispositifs médicaux" },
  iso14971:{ code: "ISO 14971:2019",   title: "Dispositifs médicaux — Application de la gestion des risques",scope: "Analyse de risque produit DM" },
  iso9001: { code: "ISO 9001:2015",    title: "Systèmes de management de la qualité — Exigences",           scope: "SMQ générique" },
  iec60812:{ code: "IEC 60812:2018",   title: "Failure modes and effects analysis (FMEA and FMECA)",        scope: "Méthodologie AMDEC/FMEA/FMECA" },
  astm_e2500:{ code: "ASTM E2500-20",  title: "Specification, Design, and Verification of Pharma & Biopharma Manufacturing Systems and Equipment", scope: "Approche Qualification par vérification (V&V)" },
  annex11: { code: "EudraLex Vol.4 Annexe 11", title: "Computerised Systems",                                scope: "Systèmes informatisés (UE)" },
  annex15: { code: "EudraLex Vol.4 Annexe 15", title: "Qualification and Validation",                        scope: "Qualification & validation (UE)" },
  annex1:  { code: "EudraLex Vol.4 Annexe 1",  title: "Manufacture of Sterile Medicinal Products",           scope: "Produits stériles" },
  cfr_part11:{ code: "21 CFR Part 11", title: "Electronic Records; Electronic Signatures",                  scope: "Enregistrements/signatures électroniques (US)" },
  cfr_211: { code: "21 CFR Part 210/211", title: "cGMP for Finished Pharmaceuticals",                        scope: "BPF produit fini (US)" },
  cfr_820: { code: "21 CFR Part 820 / QMSR", title: "Quality System Regulation — Medical Devices",           scope: "SMQ dispositifs médicaux (US)" },
  mdr:     { code: "Règlement (UE) 2017/745 (MDR)", title: "Medical Device Regulation",                     scope: "Marquage CE dispositifs médicaux" },
  pics_pi006:{ code: "PIC/S PI 006",  title: "Recommendation on Validation Master Plan, IQ, OQ, PQ",         scope: "Guide qualification" },
  pics_pi041:{ code: "PIC/S PI 041",  title: "Good Practices for Data Management and Integrity",             scope: "Intégrité des données (ALCOA+)" },
  who_ti:  { code: "OMS TRS 1019 Annexe 3", title: "Guideline on Data Integrity",                            scope: "Intégrité des données (OMS)" },
  aiag_vda:{ code: "AIAG-VDA FMEA Handbook (2019)", title: "Failure Mode and Effects Analysis Handbook",     scope: "AMDEC Processus/Design (automobile, transposable)" },
  iso11737:{ code: "ISO 11737 / ISO 11607", title: "Stérilisation & emballage des DM",                      scope: "Validation stérilisation/emballage" },
};

function stdBadges(keys) {
  return (keys || []).map(k => STANDARDS[k]
    ? `<span class="std-badge" title="${STANDARDS[k].title}">${STANDARDS[k].code}</span>`
    : "").join("");
}

// ---- Colonnes réutilisables pour les tableaux ----
const COL_TXT = (key, label, width) => ({ key, label, type: "text", width });
const COL_TA  = (key, label, width) => ({ key, label, type: "textarea", width });
const COL_NUM = (key, label, width, opts) => ({ key, label, type: "number", width, ...opts });
const COL_SEL = (key, label, options, width) => ({ key, label, type: "select", options, width });

const OUI_NON = ["", "Conforme", "Non conforme", "N/A"];
const SEV5 = ["1 - Négligeable","2 - Mineure","3 - Modérée","4 - Majeure","5 - Critique"];
const OCC5 = ["1 - Très rare","2 - Rare","3 - Occasionnelle","4 - Fréquente","5 - Très fréquente"];
const DET5 = ["1 - Détection quasi certaine","2 - Élevée","3 - Modérée","4 - Faible","5 - Détection quasi impossible"];

const RISK_LEVELS = ["", "Faible", "Modéré", "Élevé", "Critique"];

// ==================== DEFINITION DES MODULES ====================
const MODULES = [
  // ---------- 1. CHANGE CONTROL ----------
  {
    id: "change_control", category: "Documents qualité", title: "Change Control (Gestion des changements)",
    docPrefix: "CC", standards: ["ich_q9","ich_q10","iso9001","iso13485"],
    intro: "Formulaire de demande, d'évaluation d'impact et d'approbation d'un changement (équipement, procédé, système, document, fournisseur).",
    sections: [
      { id: "desc", label: "1. Description du changement", type: "group", fields: [
        { key: "titre", label: "Titre du changement", type: "text" },
        { key: "initiateur", label: "Initiateur / Service demandeur", type: "text" },
        { key: "description", label: "Description détaillée du changement", type: "textarea" },
        { key: "justification", label: "Justification / raison du changement", type: "textarea" },
        { key: "classification", label: "Classification proposée", type: "select", options: ["", "Mineur", "Majeur", "Critique"] },
      ]},
      { id: "impact", label: "2. Évaluation d'impact (ICH Q9)", type: "table",
        note: "Évaluer l'impact potentiel sur chaque domaine ; conclure sur la nécessité d'actions associées.",
        columns: [ COL_TXT("domaine","Domaine impacté"), COL_SEL("impact","Impact", ["","Aucun","Faible","Modéré","Fort"]), COL_TA("commentaire","Commentaire / action associée") ],
        rows: ["Qualité produit","Réglementaire / dossier d'enregistrement","Validation (procédé/nettoyage/système)","Documentation (SOP, dossier de lot)","Formation du personnel","Fournisseurs / sous-traitants","Système informatisé (CSV)","Sécurité / environnement"].map(d => ({ domaine: d })) },
      { id: "risque", label: "3. Analyse de risque associée", type: "group", fields: [
        { key: "risque_desc", label: "Risques identifiés si le changement n'est pas maîtrisé", type: "textarea" },
        { key: "mesures", label: "Mesures de maîtrise proposées", type: "textarea" },
      ]},
      { id: "plan", label: "4. Plan de mise en œuvre", type: "table",
        columns: [ COL_TXT("action","Action"), COL_TXT("responsable","Responsable"), COL_TXT("echeance","Échéance"), COL_SEL("statut","Statut", ["","Planifié","En cours","Terminé"]) ],
        rows: [{},{},{}] },
      { id: "revue", label: "5. Revue post-implémentation", type: "group", fields: [
        { key: "efficacite", label: "Vérification de l'efficacité du changement", type: "textarea" },
        { key: "cloture", label: "Conclusion / clôture", type: "select", options: ["", "Changement clôturé - efficace", "Changement clôturé - actions complémentaires requises", "Changement rejeté"] },
      ]},
    ],
  },

  // ---------- 2. CAPA ----------
  {
    id: "capa", category: "Documents qualité", title: "CAPA (Actions Correctives et Préventives)",
    docPrefix: "CAPA", standards: ["ich_q10","iso9001","iso13485","cfr_211"],
    intro: "Traitement d'une non-conformité / déviation / réclamation via analyse de cause racine, actions correctives et préventives et vérification d'efficacité.",
    sections: [
      { id: "probleme", label: "1. Description du problème", type: "group", fields: [
        { key: "source", label: "Source (déviation, audit, réclamation, OOS...)", type: "text" },
        { key: "description", label: "Description factuelle du problème", type: "textarea" },
        { key: "impact_produit", label: "Impact potentiel sur le produit / patient", type: "textarea" },
        { key: "confinement", label: "Actions immédiates de confinement (correction)", type: "textarea" },
      ]},
      { id: "rca", label: "2. Analyse de cause racine — 5 Pourquoi", type: "table",
        columns: [ COL_TXT("niveau","Niveau"), COL_TA("pourquoi","Pourquoi ?"), COL_TA("reponse","Réponse") ],
        rows: [1,2,3,4,5].map(n => ({ niveau: "Pourquoi " + n })) },
      { id: "ishikawa", label: "2bis. Catégories Ishikawa (5M) explorées", type: "table",
        columns: [ COL_TXT("categorie","Catégorie"), COL_TA("constat","Constat / cause potentielle") ],
        rows: ["Main d'œuvre","Méthode","Matière","Matériel / Machine","Milieu"].map(c => ({ categorie: c })) },
      { id: "cause", label: "3. Cause racine retenue", type: "group", fields: [
        { key: "cause_racine", label: "Cause racine identifiée", type: "textarea" },
      ]},
      { id: "actions", label: "4. Actions correctives et préventives", type: "table",
        columns: [ COL_SEL("type","Type", ["","Corrective","Préventive"]), COL_TA("action","Action"), COL_TXT("responsable","Responsable"), COL_TXT("echeance","Échéance"), COL_SEL("statut","Statut", ["","Planifiée","En cours","Réalisée"]) ],
        rows: [{},{},{}] },
      { id: "efficacite", label: "5. Vérification d'efficacité", type: "group", fields: [
        { key: "criteres", label: "Critères de vérification de l'efficacité", type: "textarea" },
        { key: "resultat", label: "Résultat de la vérification", type: "textarea" },
        { key: "cloture", label: "Décision de clôture", type: "select", options: ["", "CAPA efficace - clôturée", "Inefficace - réouverture", "En attente de délai d'observation"] },
      ]},
    ],
  },

  // ---------- 3-7 : FAT / SAT / IQ / OQ / PQ (générateur générique) ----------
  ...["FAT","SAT","IQ","OQ","PQ"].map(kind => {
    const meta = {
      FAT: { title: "FAT — Factory Acceptance Test (Essais en usine)", intro: "Vérification des performances de l'équipement chez le fournisseur avant expédition." },
      SAT: { title: "SAT — Site Acceptance Test (Essais sur site)", intro: "Vérification de la conformité de l'équipement après installation sur site, avant qualification." },
      IQ:  { title: "IQ — Installation Qualification (Qualification d'installation)", intro: "Vérification que l'équipement/système est installé conformément aux spécifications et aux exigences du fabricant." },
      OQ:  { title: "OQ — Operational Qualification (Qualification opérationnelle)", intro: "Vérification que l'équipement/système fonctionne conformément aux spécifications sur toute la plage opératoire prévue." },
      PQ:  { title: "PQ — Performance Qualification (Qualification des performances)", intro: "Vérification que l'équipement/système fonctionne de manière reproductible dans les conditions réelles/routine de production." },
    }[kind];
    return {
      id: kind.toLowerCase(), category: "Qualification d'équipement", title: meta.title,
      docPrefix: kind, standards: ["annex15","pics_pi006","astm_e2500","gamp5"],
      intro: meta.intro,
      sections: [
        { id: "generalites", label: "1. Généralités", type: "group", fields: [
          { key: "equipement", label: "Désignation de l'équipement / système", type: "text" },
          { key: "modele_sn", label: "Modèle / N° de série / Tag", type: "text" },
          { key: "fournisseur", label: "Fournisseur / Fabricant", type: "text" },
          { key: "objectif", label: "Objectif", type: "textarea" },
          { key: "portee", label: "Portée / périmètre du document", type: "textarea" },
          { key: "references", label: "Documents de référence (URS, FS/DS, plan de validation)", type: "textarea" },
        ]},
        { id: "prerequis", label: "2. Prérequis", type: "table",
          columns: [ COL_TXT("prerequis","Prérequis"), COL_SEL("statut","Statut", OUI_NON), COL_TA("commentaire","Commentaire") ],
          rows: (kind === "FAT" ? ["Dossier de conception disponible","Instruments de mesure étalonnés"] :
                 kind === "SAT" ? ["FAT réalisé et clôturé","Équipement livré conforme au bon de commande"] :
                 kind === "IQ" ? ["Documentation fabricant disponible (manuels, schémas)","Instruments de mesure étalonnés","Zone/utilités prêtes (fluides, électricité)"] :
                 kind === "OQ" ? ["IQ approuvé sans écart bloquant","Procédures d'exploitation rédigées"] :
                 ["OQ approuvé sans écart bloquant","Personnel formé","Matières/lots de test disponibles"]
                ).map(p => ({ prerequis: p })) },
        { id: "criteres", label: "3. Critères d'acceptation généraux", type: "group", fields: [
          { key: "criteres_generaux", label: "Critères d'acceptation", type: "textarea" },
        ]},
        { id: "tests", label: "4. Protocole de tests / résultats", type: "table",
          note: "Un test = une exigence vérifiable avec un critère d'acceptation mesurable et traçable à l'URS/FS.",
          columns: [ COL_TXT("ref","Réf. test"), COL_TA("description","Description du test"), COL_TA("critere","Critère d'acceptation"), COL_TA("resultat","Résultat obtenu"), COL_SEL("conformite","Conformité", OUI_NON), COL_TXT("execute_par","Exécuté par / Date") ],
          rows: [{},{},{},{}] },
        { id: "deviations", label: "5. Écarts / Déviations", type: "table",
          columns: [ COL_TXT("ref","N°"), COL_TA("description","Description de l'écart"), COL_TA("analyse","Analyse d'impact"), COL_TA("action","Action corrective"), COL_SEL("statut","Statut", ["","Ouvert","Clos"]) ],
          rows: [{}] },
        { id: "conclusion", label: "6. Conclusion", type: "group", fields: [
          { key: "conclusion", label: "Conclusion générale", type: "textarea" },
          { key: "decision", label: "Décision", type: "select", options: ["", "Approuvé sans réserve", "Approuvé avec réserves (actions listées)", "Non approuvé"] },
        ]},
      ],
    };
  }),

  // ---------- 8. VALIDATION DE NETTOYAGE ----------
  {
    id: "cleaning_validation", category: "Documents qualité", title: "Validation de nettoyage",
    docPrefix: "VN", standards: ["annex15","pics_pi006","ich_q9","cfr_211"],
    intro: "Démonstration documentée que la procédure de nettoyage élimine les résidus (produit, agent de nettoyage, bioburden) à un niveau acceptable et reproductible.",
    sections: [
      { id: "generalites", label: "1. Généralités", type: "group", fields: [
        { key: "equipement", label: "Équipement / ligne concerné(e)", type: "text" },
        { key: "procedure_nettoyage", label: "Référence de la procédure de nettoyage", type: "text" },
        { key: "approche", label: "Approche", type: "select", options: ["", "Produit par produit", "Approche par familles / bracketing (pire cas)", "Approche matricielle"] },
      ]},
      { id: "worst_case", label: "2. Justification du (des) produit(s) pire cas", type: "group", fields: [
        { key: "criteres_wc", label: "Critères de sélection (solubilité, toxicité, dose thérapeutique, difficulté de nettoyage...)", type: "textarea" },
        { key: "produit_wc", label: "Produit(s) retenu(s) comme pire cas", type: "textarea" },
      ]},
      { id: "maco", label: "3. Limites d'acceptation (MACO)", type: "table",
        note: "Retenir le critère le plus contraignant parmi : dose thérapeutique (1/1000e), 10 ppm, seuil visuel.",
        columns: [ COL_TXT("critere","Critère"), COL_TA("valeur","Valeur / méthode de calcul"), COL_TA("commentaire","Commentaire") ],
        rows: ["Critère dose thérapeutique (ex. 1/1000e dose min.)","Critère 10 ppm","Critère visuel (surface propre à l'œil nu)","MACO retenue (la plus contraignante)"].map(c => ({ critere: c })) },
      { id: "echantillonnage", label: "4. Méthode d'échantillonnage et d'analyse", type: "group", fields: [
        { key: "methode_prelevement", label: "Méthode de prélèvement (écouvillonnage / rinçage)", type: "textarea" },
        { key: "points_prelevement", label: "Points de prélèvement (localisation, justification pire cas)", type: "textarea" },
        { key: "methode_analytique", label: "Méthode analytique utilisée et sa validation", type: "textarea" },
      ]},
      { id: "essais", label: "5. Résultats des essais (3 runs consécutifs typiquement)", type: "table",
        columns: [ COL_TXT("run","Run n°"), COL_TXT("point","Point de prélèvement"), COL_TA("resultat","Résultat (résidu chimique)"), COL_TA("bioburden","Résultat microbiologique"), COL_SEL("conformite","Conformité", OUI_NON) ],
        rows: [{},{},{}] },
      { id: "conclusion", label: "6. Conclusion et statut de requalification", type: "group", fields: [
        { key: "conclusion", label: "Conclusion", type: "textarea" },
        { key: "periodicite", label: "Périodicité de requalification / nettoyage vérifié en routine", type: "text" },
      ]},
    ],
  },

  // ---------- 9. CYCLE EN V / PLAN DE VALIDATION ----------
  {
    id: "vmodel", category: "Qualification d'équipement", title: "Cycle en V — Plan de validation d'équipement",
    docPrefix: "VMP", standards: ["annex15","pics_pi006","astm_e2500","gamp5"],
    intro: "Structuration de la qualification selon le cycle en V : exigences utilisateur descendent vers la conception, puis remontent via IQ/OQ/PQ pour vérifier chaque niveau.",
    sections: [
      { id: "vdiagram", label: "1. Diagramme du cycle en V", type: "vmodel" },
      { id: "generalites", label: "2. Généralités", type: "group", fields: [
        { key: "systeme", label: "Système / équipement concerné", type: "text" },
        { key: "strategie", label: "Stratégie de validation retenue", type: "textarea" },
        { key: "criticite_gamp", label: "Catégorie GAMP 5 (si système informatisé associé)", type: "select", options: ["", "N/A", "Catégorie 1 - Infrastructure", "Catégorie 3 - Logiciel non configuré", "Catégorie 4 - Logiciel configuré", "Catégorie 5 - Logiciel sur mesure"] },
      ]},
      { id: "matrice", label: "3. Matrice de traçabilité des exigences", type: "table",
        note: "Chaque exigence utilisateur (URS) doit être tracée jusqu'à sa vérification (IQ/OQ/PQ).",
        columns: [ COL_TXT("urs_id","ID URS"), COL_TA("exigence","Exigence utilisateur"), COL_TXT("fs","Réf. FS"), COL_TXT("ds","Réf. DS"), COL_TXT("test_iq_oq_pq","Réf. test IQ/OQ/PQ"), COL_SEL("statut","Statut", ["","Non vérifié","Vérifié conforme","Non conforme"]) ],
        rows: [{},{},{},{}] },
      { id: "livrables", label: "4. Livrables attendus", type: "table",
        columns: [ COL_TXT("livrable","Livrable"), COL_SEL("statut","Statut", ["","À faire","En cours","Terminé"]) ],
        rows: ["URS (User Requirement Specification)","Analyse de risque (ICH Q9)","FS (Functional Specification)","DS (Design Specification)","Protocole et rapport IQ","Protocole et rapport OQ","Protocole et rapport PQ","Rapport de validation final / synthèse"].map(l => ({ livrable: l })) },
      { id: "conclusion", label: "5. Conclusion", type: "group", fields: [
        { key: "conclusion", label: "Statut global de validation / mise en service", type: "textarea" },
      ]},
    ],
  },

  // ---------- 10. CSV ----------
  {
    id: "csv", category: "Systèmes informatisés", title: "CSV — Computerized System Validation",
    docPrefix: "CSV", standards: ["gamp5","annex11","cfr_part11","pics_pi041"],
    intro: "Validation d'un système informatisé selon une approche basée sur le risque (GAMP 5), incluant l'intégrité des données.",
    sections: [
      { id: "generalites", label: "1. Généralités", type: "group", fields: [
        { key: "systeme", label: "Nom du système", type: "text" },
        { key: "editeur", label: "Éditeur / Fournisseur", type: "text" },
        { key: "gamp_cat", label: "Catégorie GAMP 5", type: "select", options: ["", "1 - Infrastructure", "3 - Logiciel non configuré (standard)", "4 - Logiciel configuré (paramétrable)", "5 - Logiciel sur mesure (bespoke)"] },
        { key: "hebergement", label: "Mode d'hébergement", type: "select", options: ["", "On-premise", "Cloud / SaaS", "Hybride"] },
        { key: "criticite_gxp", label: "Impact GxP du système", type: "select", options: ["", "Direct (données GxP)", "Indirect", "Aucun (non GxP)"] },
      ]},
      { id: "approche", label: "2. Approche de validation", type: "group", fields: [
        { key: "strategie", label: "Stratégie de validation retenue (proportionnelle au risque et à la catégorie GAMP)", type: "textarea" },
        { key: "fournisseur_audit", label: "Évaluation / audit fournisseur", type: "textarea" },
      ]},
      { id: "livrables", label: "3. Livrables du cycle de vie", type: "table",
        columns: [ COL_TXT("livrable","Livrable"), COL_SEL("statut","Statut", ["","À faire","En cours","Terminé","N/A"]) ],
        rows: ["Plan de validation","URS","Analyse de risque fonctionnelle","Spécifications fonctionnelles/config (FS)","Qualification d'installation (IQ)","Qualification opérationnelle (OQ)","Qualification de performance (PQ)","Matrice de traçabilité","Plan de gestion des données / sauvegarde-restauration","Procédures d'exploitation et de gestion des accès","Plan de formation des utilisateurs","Rapport de validation final"].map(l => ({ livrable: l })) },
      { id: "acces", label: "4. Gestion des accès et piste d'audit", type: "group", fields: [
        { key: "gestion_acces", label: "Gestion des comptes / droits d'accès / niveaux de privilège", type: "textarea" },
        { key: "audit_trail", label: "Configuration de la piste d'audit (audit trail) et sa revue périodique", type: "textarea" },
        { key: "signature_electronique", label: "Signature électronique (le cas échéant — conformité 21 CFR Part 11 / Annexe 11)", type: "textarea" },
      ]},
      { id: "revue", label: "5. Revue périodique et maintien de l'état validé", type: "group", fields: [
        { key: "periodicite", label: "Périodicité de revue périodique", type: "text" },
        { key: "gestion_changement", label: "Gestion des changements (patchs, montées de version)", type: "textarea" },
      ]},
      { id: "conclusion", label: "6. Conclusion", type: "group", fields: [
        { key: "conclusion", label: "Conclusion / décision de mise en production", type: "textarea" },
      ]},
    ],
  },

  // ---------- 11. DATA INTEGRITY ----------
  {
    id: "data_integrity", category: "Systèmes informatisés", title: "Évaluation de l'intégrité des données (Data Integrity)",
    docPrefix: "DI", standards: ["pics_pi041","who_ti","annex11","cfr_part11"],
    intro: "Évaluation ALCOA+ d'un processus, système ou flux de données GxP.",
    sections: [
      { id: "perimetre", label: "1. Périmètre de l'évaluation", type: "group", fields: [
        { key: "processus", label: "Processus / système / flux de données évalué", type: "text" },
        { key: "type_donnees", label: "Type de données (papier, hybride, électronique)", type: "select", options: ["", "Papier", "Hybride", "Électronique"] },
      ]},
      { id: "alcoa", label: "2. Évaluation ALCOA+", type: "table",
        columns: [ COL_TXT("principe","Principe"), COL_TA("exigence","Exigence attendue"), COL_TA("constat","Constat / évaluation"), COL_SEL("risque","Niveau de risque", RISK_LEVELS), COL_TA("action","Action corrective / CAPA associée") ],
        rows: [
          {principe:"Attribuable", exigence:"Toute donnée est associée à la personne/système l'ayant générée, horodatée"},
          {principe:"Lisible", exigence:"Donnée lisible durablement, y compris les corrections"},
          {principe:"Contemporaine", exigence:"Donnée enregistrée au moment de l'action"},
          {principe:"Originale", exigence:"Donnée source ou copie certifiée conforme préservée"},
          {principe:"Exacte", exigence:"Donnée correcte, complète, sans altération non tracée"},
          {principe:"Complète", exigence:"Toutes les données, y compris répétitions/reprises, sont conservées"},
          {principe:"Cohérente", exigence:"Séquence chronologique cohérente et horodatage fiable"},
          {principe:"Pérenne", exigence:"Donnée conservée sur toute la durée de rétention réglementaire"},
          {principe:"Disponible", exigence:"Donnée accessible/consultable pour revue et inspection"},
        ]},
      { id: "audit_trail", label: "3. Piste d'audit (audit trail)", type: "group", fields: [
        { key: "audit_trail_review", label: "Modalités et fréquence de revue de la piste d'audit", type: "textarea" },
      ]},
      { id: "conclusion", label: "4. Synthèse et plan d'action", type: "group", fields: [
        { key: "conclusion", label: "Conclusion générale", type: "textarea" },
      ]},
    ],
  },

  // ---------- 12. ANALYSE DE RISQUE (ICH Q9) ----------
  {
    id: "risk_analysis", category: "Analyse de risque", title: "Analyse de risque qualité (ICH Q9)",
    docPrefix: "AR", standards: ["ich_q9","iso14971","iso13485"],
    intro: "Identification, évaluation et maîtrise des risques qualité selon une approche structurée (ICH Q9) — applicable procédé, produit, système ou organisation.",
    sections: [
      { id: "contexte", label: "1. Contexte et périmètre", type: "group", fields: [
        { key: "objet", label: "Objet de l'analyse de risque", type: "text" },
        { key: "perimetre", label: "Périmètre / limites de l'étude", type: "textarea" },
        { key: "equipe", label: "Équipe pluridisciplinaire impliquée", type: "textarea" },
        { key: "methode", label: "Méthode utilisée", type: "select", options: ["", "Matrice Probabilité x Gravité", "FMEA/AMDEC (voir module dédié)", "HACCP", "Arbre de défaillances (FTA)", "Autre"] },
      ]},
      { id: "registre", label: "2. Registre des risques", type: "table",
        columns: [ COL_TXT("danger","Danger / situation dangereuse"), COL_TA("cause","Cause"), COL_TA("effet","Effet potentiel"), COL_SEL("gravite","Gravité", SEV5), COL_SEL("probabilite","Probabilité", OCC5), COL_TA("maitrise","Mesures de maîtrise existantes/proposées"), COL_SEL("risque_residuel","Risque résiduel", RISK_LEVELS) ],
        rows: [{},{},{},{}] },
      { id: "conclusion", label: "3. Conclusion et acceptabilité", type: "group", fields: [
        { key: "criteres_acceptabilite", label: "Critères d'acceptabilité du risque retenus", type: "textarea" },
        { key: "conclusion", label: "Conclusion générale et suivi", type: "textarea" },
      ]},
    ],
  },

  // ---------- 13. AMDEC / FMEA / FMECA ----------
  {
    id: "fmea", category: "Analyse de risque", title: "AMDEC / FMEA / FMECA (Procédé, Produit ou Système)",
    docPrefix: "FMEA", standards: ["iec60812","iso14971","aiag_vda","ich_q9"],
    intro: "Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité — pharma (procédé, système) et dispositifs médicaux (produit/design & procédé).",
    sections: [
      { id: "generalites", label: "1. Généralités", type: "group", fields: [
        { key: "perimetre", label: "Objet / périmètre de l'AMDEC", type: "text" },
        { key: "type_amdec", label: "Type d'AMDEC", type: "select", options: ["", "AMDEC Procédé (pFMEA)", "AMDEC Produit / Conception (dFMEA)", "AMDEC Système / Équipement", "AMDEC Software / CSV"] },
        { key: "echelle", label: "Échelles de cotation utilisées", type: "select", options: ["", "1 à 5", "1 à 10"] },
        { key: "seuil", label: "Seuil d'acceptabilité de l'IPR/RPN (à définir selon la politique qualité du site)", type: "text" },
      ]},
      { id: "table_fmea", label: "2. Tableau AMDEC", type: "fmea" },
      { id: "conclusion", label: "3. Synthèse et plan d'actions prioritaires", type: "group", fields: [
        { key: "conclusion", label: "Conclusion générale", type: "textarea" },
      ]},
    ],
  },
];

// Colonne calculée "niveau" pour le registre de risques (Probabilité x Gravité qualitatif)
MODULES.find(m => m.id === "risk_analysis").sections
  .find(s => s.id === "registre").columns.splice(5, 0, { key: "niveau", label: "Niveau de risque estimé", type: "select", options: RISK_LEVELS });
