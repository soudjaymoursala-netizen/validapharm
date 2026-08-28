# Questionnaire de conception du cerveau de ValidaPharm

**Source** : Google Drive, dossier `11 - Couche IA` (`Questionnaire Couche IA.docx`, id `1qjjg0trjZa5ls0EOfCHsydaQMexXVKXi`). Synchronisé le 28/08/2026.

**Statut** : **en cours de rédaction par l'utilisateur** — réponses complètes pour la Partie 1 (Modèle mental) et le début de la Partie 2 (lecture de SOP jusqu'aux notes/annexes/références croisées/contradictions/anciens livrables/hiérarchie source-méthode-exemple-inspiration). Tout le reste, à partir de « Comment exploites-tu un P&ID ? » (fin de Partie 2) jusqu'à la Partie 30, reste à ce jour uniquement des questions **sans réponse** — ne pas les traiter comme des réponses vides ou des "non applicable", elles sont simplement pas encore rédigées par l'utilisateur.

**Usage** : ce document capture la méthodologie de raisonnement réelle d'un expert CQV/CSV (l'auteur de ValidaPharm) — objectif explicite : "apprendre aux agents comment je travaille ma logique de travail pour qu'ils soient hyper spécialisés". Ce n'est pas une spécification technique à implémenter telle quelle : c'est une source de grounding pour la conception future du Reasoning Engine et des futurs agents spécialisés (§4.21, Phase 15 et suivantes). À enrichir au fur et à mesure — ne pas resynchroniser silencieusement sans le signaler : toute mise à jour de ce fichier doit refléter une nouvelle synchronisation explicite depuis le document Drive source, jamais une réponse inventée pour combler un vide.

---

## PARTIE 1 — TON MODÈLE MENTAL

### 1.1 Ta manière générale de travailler

Quand on te donne une nouvelle mission, quelle est la toute première chose que tu cherches à comprendre ?

Réponse : Quand on me confie une nouvelle mission, ma première priorité est de comprendre le contexte et l’objectif réel de la mission : pourquoi elle est lancée, quel problème ou besoin elle doit résoudre, et quel résultat concret est attendu.Avant de réfléchir aux livrables ou à la méthodologie, je veux comprendre le “pourquoi” et le “quoi” de la mission. Cela me permet ensuite d’adapter mon approche au contexte, au périmètre et aux enjeux qualité/GxP.

je commence généralement par le document à l’origine de la mission : par exemple un Change Control, une Deviation/CAPA, un projet, une URS, un audit finding ou une demande de qualification/validation.

C’est ce document qui me permet généralement de comprendre le contexte, le besoin, le périmètre, la justification et le résultat attendu. Ensuite, je consulte les documents de référence nécessaires pour confirmer et approfondir ce contexte. des foi il est donnée oralement.

Quelles sont les 5 premières questions que tu te poses mentalement ?

Réponse : Dans l’ordre, en général, je me pose ces 5 questions :

Quel est le contexte de la mission ou du projet ? Pourquoi la mission est lancée, d’où vient le besoin et quel est l’objectif recherché ?

Quel est le process concerné et comment il fonctionne ? Je veux comprendre comment le produit est fabriqué, quels sont les CPP, les spécifications, les étapes du process et dans quels documents je peux retrouver ces informations.

Quelle est l’architecture du site et quelles sont les relations avec l’équipement ou le système concerné ? Je cherche à comprendre les équipements, les systèmes, les locaux, les utilités, les automates, les SCADA/PLC, les interfaces, etc. Je pars généralement de l’équipement concerné et je remonte toutes les relations qui peuvent avoir un impact sur la mission.

Quelles sont les procédures et les règles métier qui s’appliquent à cette mission ? Par exemple, les procédures de qualification/validation, de risk analysis, d’impact assessment, de rédaction et d’exécution des protocoles, etc. Je veux savoir quelles règles internes je dois respecter avant de définir mon approche.

Qu’est-ce qui doit être réalisé à la fin de la mission ? Quels sont les livrables attendus, mais surtout quelles décisions doivent être prises : est-ce qu’on doit qualifier, valider, faire uniquement du commissioning, réaliser une analyse de risque, un CSV assessment, un process impact assessment, etc. ? Les livrables vont ensuite découler de cette analyse.

Comment détermines-tu rapidement si tu as suffisamment de contexte pour commencer ?

Réponse : Je considère que j’ai suffisamment de contexte quand je suis capable de comprendre le besoin, le process concerné, le périmètre et les impacts potentiels, sans avoir besoin de faire des suppositions importantes. En général, je dois être capable de répondre à quelques questions simples : qu’est-ce qu’on veut faire, pourquoi on le fait, sur quoi ça va avoir un impact, comment le process ou le système fonctionne, quelles sont les exigences applicables et qu’est-ce qui est attendu à la fin de la mission.Si j’ai encore des zones importantes que je ne comprends pas, par exemple une relation entre deux systèmes, un point du process, une exigence GMP ou la raison d’un changement, je considère que je n’ai pas encore suffisamment de contexte pour commencer réellement l’analyse. Je vais d’abord chercher l’information dans les documents disponibles ou auprès des personnes concernées.Pour moi, avoir suffisamment de contexte ne veut pas dire avoir lu tous les documents. Ça veut dire que j’ai suffisamment d’informations pour commencer à travailler sans partir sur des hypothèses qui pourraient fausser mon analyse ou ma stratégie CQV/CSV.

Qu'est-ce qui te fait dire : « je ne peux pas encore travailler, il me manque des informations » ?

Réponse : Ce qui me fait dire que je ne peux pas encore travailler, c’est surtout quand une information manquante peut changer ma compréhension du périmètre, mon analyse de risque ou la stratégie que je vais appliquer.

Par exemple, si je ne comprends pas clairement ce qui est modifié, comment le process fonctionne, quel équipement ou système est concerné, quelles sont ses interfaces, quelles exigences GMP s’appliquent ou quel est l’objectif du changement, je préfère ne pas commencer directement.

Je regarde aussi si les documents que j’ai sont cohérents entre eux. Si par exemple l’URS, le document process, les spécifications techniques et les documents existants donnent des informations différentes, je considère que j’ai un point à clarifier avant d’aller plus loin.

En pratique, je me demande simplement : « Est-ce que l’information qui me manque peut avoir un impact sur ma décision ou sur la conclusion de mon travail ? » Si oui, je vais chercher cette information avant de continuer.

Quelles informations cherches-tu presque systématiquement ?

Réponse : Il y a certaines informations que je cherche presque systématiquement, même si ça dépend évidemment du type de mission.

Je cherche d’abord le contexte et l’objectif : pourquoi la mission est lancée, quel est le changement ou le problème, et quel résultat est attendu.

Ensuite, je cherche à comprendre le process et le périmètre technique : comment le process fonctionne, quel équipement ou système est concerné, ses fonctions, ses composants, ses interfaces avec les autres équipements ou systèmes, ainsi que les utilités associées.

Je cherche également à comprendre le flux de travail de l’entreprise et l’ordre dans lequel les activités sont réalisées. Je veux savoir qui intervient, à quel moment, quelles équipes se passent les informations, dans quel ordre les documents sont créés, revus et approuvés, et comment un document ou une activité déclenche la suivante. C’est important parce que les activités CQV/CSV ne sont pas isolées : elles s’inscrivent dans un workflow global du projet ou du changement.

Je cherche aussi les informations GMP/Qualité : les CQA/CPP concernés, les exigences GMP applicables, les risques qualité potentiels, les exigences de Data Integrity lorsqu’il y a un système informatisé, ainsi que les éventuels impacts réglementaires.

Après ça, je regarde les documents et procédures applicables : URS, spécifications fonctionnelles et techniques, documents process, plans, manuels, alarmes, procédures de qualification/validation, analyses de risques, impact assessments, Change Control, Deviation ou CAPA selon le contexte.

Enfin, je cherche à comprendre ce qui existe déjà et ce qui doit être modifié ou créé : qualification/validation existante, état actuel du système, historique des changements ou problèmes, documentation déjà disponible et livrables attendus.

L’objectif est d’avoir une vision globale du système, du process et du workflow, et pas uniquement de l’élément technique qui m’a été donné.

Lesquelles sont indispensables ?

Réponse : Pour moi, les informations indispensables sont d’abord le contexte et l’objectif de la mission, parce que sans savoir pourquoi on fait quelque chose et ce qu’on cherche à obtenir, il est difficile de définir une bonne approche.

Ensuite, il me faut absolument comprendre le process et le périmètre concerné : ce qui est modifié, comment ça fonctionne, quels équipements ou systèmes sont impliqués et quelles sont leurs interactions.

Je considère également comme indispensables les exigences applicables et les règles métier de l’entreprise : exigences GMP/Qualité, procédures internes, règles de qualification/validation, analyse de risques, Data Integrity si nécessaire, etc.

Il me faut aussi comprendre le workflow, c’est-à-dire dans quel ordre les activités sont réalisées, quelles équipes interviennent et comment les documents circulent, sont revus et approuvés.

Enfin, je dois savoir quel résultat est attendu, quels sont les livrables et surtout quelles décisions doivent être prises à la fin de la mission. Si une de ces informations essentielles manque et qu’elle peut modifier mon analyse, je ne vais pas simplement faire une hypothèse : je vais chercher l’information avant de continuer.

Lesquelles sont simplement utiles ?

Réponse : Les informations simplement utiles sont celles qui permettent surtout de mieux comprendre le contexte ou d’affiner mon analyse, mais dont l’absence ne m’empêche pas de commencer à travailler.

Par exemple, l’historique détaillé du système ou de l’équipement, les anciens projets similaires, les anciennes versions de certains documents, les retours d’expérience des équipes, les détails techniques qui ne sont pas directement liés au périmètre, ou encore certaines informations sur la manière dont des missions similaires ont été réalisées auparavant.

Je peux commencer sans forcément avoir toutes ces informations, mais elles peuvent m’aider à mieux comprendre pourquoi certaines décisions ont été prises, identifier des points de vigilance et éviter de reproduire des erreurs du passé. Donc je fais une distinction entre les informations indispensables pour prendre une décision correctement et celles qui sont surtout utiles pour enrichir ma compréhension et sécuriser davantage mon analyse.

Lesquelles peux-tu généralement déduire ?

Réponse : Je peux généralement déduire les informations qui sont la conséquence logique d’informations déjà disponibles, à condition que la déduction soit suffisamment fiable et qu’elle n’ait pas d’impact critique sur ma décision.

Par exemple, à partir de l’architecture du système, des documents techniques et du process, je peux souvent déduire les interactions entre les équipements, certains flux de données ou de matière, les dépendances entre systèmes, ou quelles équipes sont probablement impliquées.

À partir du workflow documentaire, je peux également comprendre l’ordre logique dans lequel certaines activités doivent être réalisées : par exemple qu’une exigence doit être définie avant sa vérification, ou qu’une qualification ne peut pas être clôturée avant d’avoir traité les écarts associés.

Mais je fais attention à ne pas transformer une déduction en fait confirmé. Si l’information est critique pour une décision CQV/CSV, une analyse de risque ou une conformité GMP, je vais chercher une preuve documentaire ou une confirmation auprès du métier plutôt que de partir sur une hypothèse.

Qu'est-ce que tu refuses de déduire ?

Réponse : Je refuse de déduire tout ce qui pourrait avoir un impact direct sur la qualité, la conformité GMP, la sécurité du patient ou la stratégie de qualification/validation.

Par exemple, je ne vais pas déduire qu’un équipement est GMP ou non-GMP, qu’un système est GxP, qu’une fonction est critique, qu’un process ou un paramètre est critique, qu’une qualification ou une validation n’est pas nécessaire, ou qu’une exigence réglementaire s’applique simplement parce que cela semble logique.

Je ne vais pas non plus déduire une exigence qui n’est pas explicitement définie, une limite ou un critère d’acceptation, une responsabilité entre équipes, ou une décision qui devrait normalement être documentée et approuvée.

Dans ces situations, je préfère dire « l’information n’est pas disponible ou doit être confirmée » et aller chercher la preuve nécessaire. En CQV/CSV, une hypothèse peut servir à orienter une investigation, mais elle ne doit pas devenir une justification ou une preuve de conformit

Comment distingues-tu une hypothèse raisonnable d'une information qui doit être confirmée ?

Réponse : Pour moi, la différence dépend surtout de l’impact que l’information peut avoir sur ma décision.

Une hypothèse raisonnable, c’est quelque chose que je peux déduire logiquement à partir des informations que j’ai déjà, et qui me sert à avancer dans mon analyse. Par exemple, si je vois dans l’architecture qu’un équipement est connecté à un PLC, je peux raisonnablement supposer qu’il y a un échange de données entre les deux pour orienter mon investigation.

Par contre, si cette information va me permettre de prendre une décision CQV/CSV, définir un niveau de criticité, déterminer un impact GMP ou justifier une qualification/validation, alors je considère qu’elle doit être confirmée par une source fiable : document approuvé, spécification, procédure, analyse de risque, ou confirmation du métier.

Donc ma règle est assez simple : je peux faire des hypothèses pour chercher et comprendre, mais je ne transforme pas une hypothèse en fait lorsqu’elle sert à justifier une décision.

Comment identifies-tu les livrables nécessaires pour une nouvelle mission ou un nouveau projet ?

Réponse : En général, je commence par vérifier si les livrables attendus sont déjà définis dans les documents du projet. Souvent, dans le Project Master Plan, le scope, le cahier des charges ou dans les documents de gouvernance du projet, on a déjà une liste des livrables attendus.

Si ce n’est pas défini, ou si on m’appelle justement pour définir les livrables du projet, je vais regarder plusieurs choses.

D’abord, je regarde les procédures métier du site, notamment les procédures CQV et QA. En fonction du site, ces procédures peuvent définir quels livrables sont attendus selon le type de projet ou selon les résultats des différents Impact Assessments. Par exemple, un impact assessment peut déterminer qu’un équipement est GMP ou non, qu’une qualification est nécessaire ou non, qu’une validation CSV est nécessaire, qu’une analyse de risques doit être réalisée, etc. Et derrière chaque décision, il peut y avoir une liste de livrables à produire.

Je regarde donc les impacts identifiés : Process Impact Assessment, CQV Assessment, CSV Assessment, Regulatory Assessment, HSE Assessment, etc., ainsi que les analyses de risques comme l’ACFC/FMEA/FMECA, HAZOP, HACCP ou autres selon le contexte.

Ensuite, je reconstruis le flux documentaire du projet : quels documents viennent avant, lesquels servent d’entrées aux suivants, dans quel ordre ils sont rédigés, revus et approuvés, et comment les résultats d’un document vont alimenter les documents suivants.

C’est important parce que la liste des livrables dépend vraiment du contexte. Pour un même type de projet, on peut avoir des livrables différents selon le site, les procédures applicables, l’impact GMP, le niveau de risque et le système concerné.

C’est justement pour ça que j’ai structuré la « Liste des livrables – CQV/CSV/Qualité Pharma » avec les relations entre les documents. Elle me sert plutôt de base de connaissances et de checklist, mais elle ne remplace pas les documents du projet ni les procédures du site. Je l’utilise pour m’assurer que je n’oublie pas un livrable potentiel et pour comprendre pourquoi il est nécessaire, ce qui le déclenche et avec quels autres documents il est lié.

### 1.2 Comprendre avant d'agir

Préfères-tu d'abord comprendre l'ensemble du système ou commencer par le problème précis ?

**Réponse :**
En tant que responsable technique CQV/CSV, je préfère généralement comprendre d’abord le système et son environnement avant de rentrer dans le problème précis. Je n’ai pas besoin de tout connaître dans le détail, mais j’ai besoin d’avoir suffisamment de vision globale pour comprendre où se situe le sujet et quels peuvent être ses impacts.Je commence donc par regarder le contexte du projet ou du changement, le process, le système ou l’équipement concerné, son architecture, ses fonctions, ses interfaces avec les autres systèmes et son utilisation dans le processus de fabrication. Je regarde également les impacts déjà identifiés côté GMP, qualité produit, process, CSV, HSE et réglementaire.

Une fois que j’ai cette vision, je descends progressivement au niveau du problème. Par exemple, si on me demande d’analyser une alarme sur un équipement, je ne vais pas uniquement regarder l’alarme. Je vais chercher à comprendre quelle fonction elle protège, quel composant ou paramètre est concerné, dans quelle étape du process elle intervient, ce qui se passe lorsqu’elle est déclenchée, quelles données sont générées et quelles sont les conséquences potentielles sur le produit et sur l’état validé du système.

Ensuite, je peux déterminer si le problème relève uniquement du CQV/CSV ou s’il nécessite également l’intervention d’autres fonctions : Engineering, Production, Maintenance, QA, IT, Automation, Process, HSE, etc.

Donc ma logique est plutôt : comprendre le système et le contexte → identifier les interactions et les impacts → cadrer le problème → analyser en profondeur → déterminer l’action appropriée.

Pour moi, c’est important en CQV/CSV parce qu’une anomalie qui paraît très technique au départ peut en réalité avoir un impact GMP, qualité produit, data integrity, sécurité, qualification ou validation.

Comment passes-tu du problème général au périmètre exact ?

Réponse : Je pars d’abord du problème tel qu’il m’est présenté, puis je le décompose progressivement pour identifier précisément ce qui est réellement concerné. En tant que responsable technique CQV/CSV, je cherche surtout à éviter de définir le périmètre trop rapidement sur la base de la première information disponible

Je commence par clarifier ce qui a déclenché le sujet, ce qui est attendu, ce qui ne fonctionne pas ou ce qui doit être changé. Ensuite, je regarde le process concerné et je remonte vers le système, l’équipement, les fonctions et les interfaces impliquées.

Je vérifie notamment : quel équipement ou système est concerné, quelles fonctions sont impactées, quels composants ou paramètres sont concernés, quelles interfaces avec d’autres systèmes existent, quelles données sont générées ou utilisées et quelles étapes du process sont touchées.

Ensuite, je confronte cette analyse aux documents de référence : scope projet, URS, spécifications, architecture, schémas, procédures, analyses de risques, ACFC/FMEA/FMECA, Impact Assessments, documentation existante de qualification/validation, etc.

À partir de là, je définis un périmètre avec des limites claires : ce qui est inclus, ce qui est exclu et surtout pourquoi. Je vérifie également si le problème a des impacts en dehors du périmètre initial, par exemple sur un autre équipement, une autre fonction, une interface, le process, la qualité produit, le statut GMP ou la partie CSV.

Donc je passe généralement de « quel est le problème ? » → « où se manifeste-t-il ? » → « quelles fonctions et quels éléments sont impliqués ? » → « quelles interfaces et quels impacts ? » → « quel est exactement le périmètre CQV/CSV ? ».

Et si certaines limites ne peuvent pas être démontrées avec les informations disponibles, je ne les considère pas comme acquises : je les identifie comme points à confirmer avant de finaliser le périmètre.

Comment identifies-tu les objets concernés ?

Réponse : Je les identifie en partant du process et du périmètre défini, puis je descends progressivement jusqu’aux objets techniques et fonctionnels réellement concernés.

Concrètement, je cherche d’abord à identifier le système, l’équipement ou le processus concerné, puis je regarde sa décomposition : fonctions, composants, instruments, automates/PLC, SCADA/HMI, logiciels, interfaces, données, utilités, locaux, etc., selon le sujet.

Je m’appuie sur les documents disponibles : P\&ID, schémas d’architecture, Functional/Technical Specifications, Equipment List, Asset List, Tag List, I/O List, liste des alarmes, matrice des interfaces, plans, documentation constructeur, mais aussi sur les documents qualité comme les Impact Assessments, analyses de risques, ACFC/FMEA/FMECA, URS et documents de qualification/validation existants.

Je fais également attention aux relations entre les objets. Par exemple, si un équipement est concerné, je ne m’arrête pas à son tag : je cherche dans quel local il se trouve, à quelle ligne il appartient, quelles utilités lui sont associées, quel PLC ou SCADA le contrôle, quelles interfaces existent avec d’autres systèmes et quelles fonctions GMP dépendent de lui.

Ensuite, je vérifie les informations croisées dans plusieurs documents pour m’assurer que je parle bien du même objet physique, fonctionnel ou informatique et que son identification est cohérente.

Pour moi, un objet concerné peut donc être beaucoup plus large qu’un simple équipement : cela peut être un équipement, une fonction, un composant, un système automatisé, un logiciel, une interface, une donnée, une utilité ou même un document/processus, en fonction de la problématique analysée.

Comment identifies-tu les objets potentiellement concernés mais non explicitement mentionnés ?

Réponse : Je les identifie surtout en regardant les relations et les dépendances autour de l’objet explicitement mentionné. En CQV/CSV, un objet qui n’est pas cité dans le problème initial peut quand même être concerné s’il intervient dans la fonction, le process, le contrôle ou le flux de données étudié.

C’est pour cette raison que, pour moi, il est indispensable de connaître l’architecture globale du site et des systèmes. Je dois pouvoir comprendre comment les différents objets sont reliés entre eux, aussi bien physiquement que fonctionnellement et informatiquement.

Par exemple, même une architecture récupérée depuis SAP, même si elle n’est pas complète, peut déjà me donner une première vision des relations entre les équipements et le process. Je peux partir d’un équipement identifié dans SAP et chercher à quelle ligne il appartient, dans quel process il intervient, dans quel local il se trouve, quelles sondes ou quels composants lui sont associés, quel système le contrôle, vers quel PLC ou SCADA les informations remontent, etc. Dans l’exemple que j’ai pu rencontrer, SAP permet par exemple de retrouver des équipements et des instruments avec leur identification et leur localisation, ce qui constitue une première base pour reconstruire l’architecture du site.

Ensuite, je complète cette information avec les autres sources disponibles : P\&ID, schémas d’architecture, Functional/Technical Specifications, Equipment List, Asset List, Tag List, I/O List, matrices d’interfaces, documentation des systèmes, listes d’alarmes, analyses de risques et Impact Assessments.

L’objectif est de pouvoir reconstruire une chaîne du type : Process → Ligne → Équipement → Composant/Sonde → PLC → SCADA/HMI → Serveur → Base de données → autres systèmes, tout en comprenant les flux physiques, les flux de contrôle et les flux de données.

Je regarde également les éléments métier liés au process : quel produit ou format est fabriqué sur la ligne, quelles recettes sont utilisées, combien de recettes sont concernées, quels paramètres sont critiques, quelles fonctions sont GMP et quelles données doivent être enregistrées ou conservées.

C’est cette vision qui me permet d’identifier les objets potentiellement concernés qui ne sont pas mentionnés au départ. Je distingue ensuite l’objet explicitement concerné, les objets potentiellement impactés et les objets finalement exclus après analyse.

Donc je ne me limite pas à rechercher des mots-clés dans le problème initial. Je cherche à reconstruire les relations entre les objets et à comprendre l’architecture du système, puis je vérifie ces relations dans les documents de référence et les analyses d’impact/risques.

Comment détermines-tu les dépendances ?

Réponse : Je détermine les dépendances en regardant comment les différents objets, fonctions, systèmes et processus sont reliés entre eux, et surtout si le fonctionnement ou la conformité de l’un dépend de l’autre.

Je pars généralement de l’objet ou du problème étudié et je remonte en amont et en aval. Je cherche par exemple : qu’est-ce qui alimente cet équipement, qu’est-ce qui le contrôle, quelles informations il reçoit, quelles informations il envoie, quel autre système utilise ces informations et quel process dépend de son fonctionnement.

C’est là que la connaissance de l’architecture du site est importante. Je peux avoir une chaîne comme : sonde → équipement → PLC → SCADA → serveur/base de données → MES, avec également des dépendances côté utilités, réseau, alimentation électrique, systèmes de sécurité ou autres équipements du process.

Je regarde aussi les dépendances fonctionnelles et métier. Par exemple, un équipement peut dépendre d’une certaine recette, d’un paramètre process ou d’une autre étape de production. Une donnée peut être utilisée par plusieurs systèmes. Une fonction GMP peut dépendre du bon fonctionnement de plusieurs composants.

Pour déterminer ces relations, je croise les informations provenant des schémas d’architecture, P\&ID, Functional Specifications, Technical Specifications, listes d’équipements et de tags, I/O List, matrices d’interfaces, documentation automatisme/IT, documentation SAP, mais également des analyses de risques et Impact Assessments.

Je regarde également les dépendances documentaires : par exemple, une URS peut être une entrée pour une spécification fonctionnelle, qui elle-même va servir à la conception et à la qualification. De la même manière, une analyse de risques peut identifier une fonction critique qui va ensuite déterminer certains tests de qualification.

Enfin, je ne considère pas une relation comme une dépendance simplement parce qu’elle existe techniquement. Je cherche à déterminer la nature de la dépendance et sa conséquence : est-ce une dépendance nécessaire au fonctionnement, une dépendance de données, une dépendance GMP, une dépendance qualité, une dépendance de sécurité, ou simplement une relation technique sans impact ?

Mon objectif est donc de pouvoir répondre à : « Si je modifie ou si je perds cet élément, qu’est-ce qui est susceptible d’être impacté autour de lui, et pourquoi ? »

Comment détermines-tu ce qui est hors périmètre ?

Réponse : Je détermine ce qui est hors périmètre en partant d’abord du scope défini pour le projet ou le changement, puis je vérifie que les objets que j’ai identifiés comme potentiellement concernés ont réellement un impact sur le sujet. Je regarde d’abord ce qui est explicitement défini dans le Project Master Plan, le Change Control, l’URS, le scope technique ou les autres documents de cadrage. Ensuite, je compare avec les résultats des Impact Assessments et des analyses de risques pour voir si certains éléments qui semblent liés techniquement ont réellement un impact GMP, qualité, process, CQV/CSV, réglementaire ou HSE.

Par exemple, si je modifie un équipement qui communique avec un SCADA, le SCADA est potentiellement concerné. Mais je ne vais pas automatiquement mettre tout le SCADA dans le périmètre. Je vais regarder quelle donnée est échangée, quelle fonction est concernée, si cette donnée est GMP, si elle est utilisée par une fonction critique, si la modification change son traitement ou son stockage, etc. Si l’analyse démontre qu’il n’y a aucun impact, je peux alors justifier que cette partie est hors périmètre.

Je regarde également les dépendances en amont et en aval. Un équipement peut être physiquement connecté à un autre système sans que celui-ci soit réellement impacté par le changement.

Pour moi, il est donc important de ne pas définir le hors périmètre uniquement par exclusion technique. Il faut pouvoir expliquer pourquoi un élément est exclu.

Je formalise généralement la logique sous la forme : objet identifié → relation avec le sujet → analyse de l’impact → décision : dans le périmètre ou hors périmètre → justification.

Et si je n’ai pas suffisamment d’informations pour démontrer qu’un élément est hors périmètre, je préfère le laisser « potentiellement concerné / à confirmer » plutôt que de l’exclure trop rapidement. En CQV/CSV, l’exclusion doit être justifiable et traçable, notamment lorsqu’il existe un potentiel impact GMP ou qualité.

Cherches-tu systématiquement les impacts indirects ? Si oui, comment ?

**Réponse :**

Oui, systématiquement. Pour moi, un impact indirect est justement ce qu’il faut chercher en CQV/CSV, parce que l’élément modifié n’est pas forcément celui qui porte le risque principal.

Je pars de l’objet directement concerné et je regarde ses dépendances en amont et en aval : quel équipement l’alimente, quel système le contrôle, quelles données il génère ou reçoit, quelles interfaces utilisent ces données et quelles fonctions du process dépendent de lui.

Je regarde ensuite les différents niveaux d’impact : technique, process, qualité, GMP, CSV, data integrity, HSE et disponibilité de la production.

Par exemple, si une sonde est modifiée, je ne regarde pas uniquement la sonde. Je vais suivre son signal : sonde → équipement → PLC → SCADA → serveur/base de données → autres systèmes ou fonctions qui utilisent la donnée. Je vérifie également si cette mesure intervient dans une recette, un CPP, une alarme, une fonction GMP ou une décision opérateur.

Pour identifier ces impacts, je croise l’architecture du site avec les P\&ID, Functional Specifications, Technical Specifications, listes d’équipements et de tags, I/O List, matrices d’interfaces, documentation des systèmes, Impact Assessments et analyses de risques comme l’ACFC/FMEA/FMECA.

Je regarde également les impacts documentaires et opérationnels : procédures, instructions, maintenance, calibration, formation, qualification/validation, etc.

Donc ma logique est vraiment de suivre la chaîne : objet modifié → dépendances → fonctions impactées → conséquences → risques → actions nécessaires.

Et surtout, je distingue bien une simple relation technique d’un impact réel. Un système peut être connecté à l’équipement sans être impacté par le changement ; dans ce cas, je cherche à pouvoir le justifier et, si nécessaire, le documenter comme hors périmètre.

Jusqu'à quel niveau remontes-tu dans la chaîne de dépendances ?

Réponse : Je remonte jusqu’au niveau nécessaire pour comprendre l’impact, pas jusqu’à un niveau prédéfini. En CQV/CSV, je considère qu’une dépendance doit être suivie tant que je n’ai pas démontré qu’elle n’a plus d’influence sur le sujet analysé.

Je pars de l’objet directement concerné et je remonte et descends dans la chaîne : composant → équipement → ligne → process → système de contrôle → système informatique → infrastructure, selon le cas.

Par exemple, si je travaille sur une sonde, je peux remonter de la sonde vers l’équipement, puis regarder sur quelle ligne et dans quel process l’équipement intervient, quel PLC traite le signal, quel SCADA l’utilise, sur quel serveur il fonctionne, où les données sont stockées et quels autres systèmes ou fonctions dépendent de ces données.

Je peux également remonter jusqu'au niveau métier et GMP : pourquoi cette donnée est nécessaire, quelle fonction elle supporte, si elle intervient dans une recette ou un CPP, si elle est GMP, si elle est utilisée pour une décision de production ou si elle doit être conservée comme donnée réglementaire.

À l’inverse, je m’arrête lorsqu’une dépendance n’a plus de conséquence sur le périmètre ou les impacts étudiés, ou lorsque les éléments disponibles permettent de démontrer qu’il n’y a pas d’impact.

Donc je ne définis pas une profondeur arbitraire. Mon critère est plutôt : « Est-ce que cet élément peut encore modifier mon évaluation du risque, du périmètre, de la qualité, du statut GMP ou des activités CQV/CSV ? » Si oui, je continue à remonter dans la chaîne ; si non, je peux m’arrêter et justifier pourquoi.

À quel moment considères-tu que ton contexte est suffisamment complet ?

**Réponse :**

Je considère que mon contexte est suffisamment complet lorsque je peux comprendre le sujet, définir clairement le périmètre et expliquer les impacts potentiels sans avoir besoin de faire des suppositions importantes.

En pratique, je dois être capable de répondre clairement à plusieurs questions : qu’est-ce qui est concerné, pourquoi, comment cela fonctionne, dans quel process et quelle architecture cela s’inscrit, quelles sont les dépendances, quels sont les impacts potentiels et quelles sont les exigences ou procédures applicables.

Je vérifie également que j’ai suffisamment d’informations pour déterminer ce qui est dans le périmètre et ce qui est hors périmètre, et pour identifier les activités CQV/CSV nécessaires : commissioning, qualification, validation, tests, analyses de risques, documentation, etc.

Un autre point important pour moi est de savoir où se trouve l’information et quelle est sa source. Si une information importante n’est disponible que sous forme d’hypothèse ou si deux documents donnent des informations différentes, je considère que mon contexte n’est pas encore suffisamment fiable. Je vais chercher à confirmer avant de prendre une décision.

Donc, je ne cherche pas forcément à avoir 100 % des informations du projet avant de commencer. Je considère que j’ai suffisamment de contexte lorsque les informations disponibles me permettent de raisonner correctement, identifier les risques et les impacts, prendre une première décision technique et savoir précisément quelles informations restent éventuellement à confirmer.

Pour moi, le vrai critère est donc : « Est-ce que je peux commencer à travailler sans prendre le risque de partir sur une mauvaise compréhension du système, du process, du périmètre ou des exigences GMP ? » Si la réponse est oui, je peux commencer. Si la réponse est non, j’identifie précisément ce qui me manque avant d’avancer.

## PARTIE 2 — COMMENT TU LIS ET COMPRENDS LES DOCUMENTS

ValidaPharm doit pouvoir traiter des SOP, Word, PDF, Excel, schémas, images et diagrammes. L'architecture prévoit déjà une Document Intelligence avec OCR, layout, tableaux et compréhension multimodale.

Je veux maintenant comprendre comment toi tu les exploites.

Quand tu reçois une SOP, lis-tu tout ou recherches-tu d'abord certaines sections ?

**Réponse :**

Ça dépend du contexte et surtout de ce que je dois faire avec la SOP. Je ne lis pas systématiquement tout le document ligne par ligne dès le départ. Je commence généralement par identifier la structure du document et rechercher les parties qui vont me permettre de comprendre le contexte et les règles métier applicables.

Je regarde d’abord les éléments comme l’objectif, le scope, les responsabilités, les définitions, les références, les prérequis et le déroulement du processus. Ensuite, selon le sujet, je vais chercher directement les sections qui concernent mon analyse : par exemple les règles métier, les étapes du process, les critères d’acceptation, les actions opérateur, les enregistrements, les contrôles, les exceptions ou la gestion des déviations.

Mais si la SOP est directement applicable au sujet que je dois analyser, je peux ensuite la lire dans son ensemble. C’est important parce qu’une information qui paraît secondaire au départ peut finalement avoir un impact sur mon analyse.

Je fais également attention à la version, la date d’entrée en vigueur, le statut du document et son périmètre d’application. Je veux être certain que je travaille avec la bonne version et que la procédure s’applique bien au site, au process ou à l’équipement concerné.

Et surtout, je ne lis pas une SOP complètement isolée. Je la mets en relation avec les autres documents : documents process, URS, spécifications, analyses de risques, ACFC/FMEA/FMECA, Impact Assessments, protocoles de qualification, formulaires, autres SOP et instructions de travail.

Donc ma logique est plutôt : comprendre la structure → identifier les sections pertinentes → extraire les règles et informations importantes → approfondir si nécessaire → croiser avec les autres documents.

L’objectif n’est pas simplement de « lire » la SOP, mais de comprendre quelle règle elle définit, pourquoi elle existe, à quoi elle s’applique et quelles conséquences elle a sur le process, la qualité et les activités CQV/CSV.

Quelles sections regardes-tu en priorité ?

Réponse : En général, je commence par regarder l’objectif et le scope, parce que ça me permet de savoir pourquoi la procédure existe et à quoi elle s’applique. Ensuite je regarde les responsabilités, les définitions et les références, surtout quand certains termes ou exigences doivent être interprétés dans leur contexte.

Après ça, je vais surtout chercher la partie qui décrit le processus et les règles métier : les étapes à réaliser, les contrôles, les critères, les prérequis, les exceptions et les actions à réaliser dans certaines situations.

Je regarde aussi les parties qui définissent les enregistrements ou documents à produire, parce que ça permet de comprendre le flux documentaire et les preuves attendues.

Enfin, selon le sujet, je vais cibler certaines sections. Par exemple, pour une analyse CQV/CSV, je vais particulièrement regarder ce qui concerne les qualifications, validations, analyses de risques, changements, déviations, exigences documentaires et responsabilités QA/CQV/CSV.

Donc je ne donne pas forcément la même priorité à toutes les sections. Je pars du besoin de l’analyse, mais je commence toujours par le scope et le contexte pour éviter d’interpréter une règle en dehors de son périmètre.

Comment identifies-tu une règle importante dans une procédure ?

Réponse : Je regarde d'abord ce que la règle impose, sur qui elle s’applique et dans quelles conditions. Une règle importante est généralement une information qui va avoir une conséquence sur la manière de réaliser une activité, sur une décision à prendre ou sur une preuve à fournir.

Je fais particulièrement attention aux formulations qui définissent une action obligatoire, une condition, une interdiction, un contrôle, une approbation ou un enregistrement.

Par exemple, si une procédure indique qu’une activité doit être réalisée avant une autre activité, ce n’est pas simplement une information : cela définit un enchaînement obligatoire dans le workflow.

Je regarde aussi les règles qui ont un lien avec la GMP, la qualité produit, la sécurité patiente, la data integrity, la qualification/validation ou la traçabilité. Même une phrase courte peut être très importante si elle impose un contrôle ou une preuve qui conditionne la conformité de l’activité.

Et surtout, je ne regarde pas uniquement la phrase elle-même. Je regarde son contexte, les définitions associées, les responsabilités et les éventuelles exceptions ou conditions décrites ailleurs dans la procédure.

Comment sais-tu qu'une phrase est une obligation et non une recommandation ?

Réponse : Je regarde d’abord la formulation utilisée dans la procédure. Certains termes indiquent clairement une obligation, par exemple « doit », « doivent », « est requis », « est obligatoire », « shall », « must », « required ».

À l’inverse, des termes comme « peut », « pourrait », « il est recommandé de », « devrait », « may », « might », « should » peuvent indiquer une possibilité ou une recommandation, selon le contexte et les conventions documentaires du site.

Mais je ne me limite pas au mot utilisé. Je regarde également la nature de la règle, son contexte, les responsabilités, les conditions d’application et la conséquence si l’action n’est pas réalisée.

Par exemple, si une procédure indique qu’une activité doit être réalisée avant une autre, je retiens bien qu’il existe une dépendance ou un ordre à respecter. Mais je ne vais pas automatiquement interpréter cela comme : « l’activité A doit être complètement terminée avant même que l’activité B puisse commencer ». Il faut comprendre la nature exacte de la dépendance.

Dans certains cas, deux activités peuvent être réalisées en parallèle ou partiellement en parallèle, tout en respectant certaines conditions. Par exemple, une activité peut devoir être suffisamment avancée, validée ou avoir produit un certain livrable avant qu’une autre étape puisse se poursuivre. Dans d’autres cas, la première activité doit effectivement être complètement terminée et approuvée avant de commencer la suivante.

Donc je cherche à comprendre ce que la procédure impose réellement, et pas seulement à appliquer mécaniquement une notion de séquence.

C’est particulièrement important dans un projet CQV/CSV, parce qu’il peut y avoir une différence entre :

A doit être terminé avant B → dépendance séquentielle ;

A doit être approuvé avant B → condition d’approbation ;

A doit être initié avant B → les deux peuvent éventuellement se poursuivre en parallèle ;

A et B peuvent être réalisés en parallèle, mais certains résultats de A sont nécessaires avant une étape précise de B ;

A et B sont indépendants → pas de contrainte de séquence.

Je regarde donc toujours le niveau de dépendance réellement défini par le document, et si ce n’est pas suffisamment clair, je cherche la précision dans les documents associés ou auprès du responsable du processus plutôt que de créer moi-même une règle qui n’existe pas.

Comment identifies-tu les exceptions ?

Réponse : Je cherche d’abord les formulations qui indiquent qu’une règle générale ne s’applique pas dans certains cas : « sauf si », « à l’exception de », « excepté », « sauf dans le cas où », « unless », « except when », « deviation from », etc.

Mais je ne regarde pas uniquement ces mots. Une exception peut aussi être définie dans une phrase qui introduit un cas particulier, une situation différente ou une dérogation à la règle générale.

Je cherche donc toujours à comprendre la relation entre la règle générale → l’exception → la condition d’application → l’action à réaliser.

Par exemple, si une procédure indique qu’une activité est normalement obligatoire, mais qu’elle n’est pas nécessaire pour certains équipements ou dans certaines conditions, je dois identifier précisément quels équipements sont exclus, dans quelles conditions et sur quelle justification.

Pour moi, une exception est importante parce qu’elle peut complètement modifier le workflow, le périmètre, les livrables ou les activités CQV/CSV. Je ne dois donc pas appliquer une règle générale sans vérifier si une exception existe.

Comment identifies-tu les conditions du type « si... alors... » ?

Je les recherche comme des règles conditionnelles. Je cherche ce qui déclenche la règle, puis ce qui doit être fait lorsque cette condition est remplie.

La logique peut être explicite : « si X, alors Y », mais elle peut également être formulée autrement : « lorsque », « dans le cas où », « en cas de », « si applicable », « lorsque les conditions suivantes sont remplies », « if », « when », « in case of ».

Je cherche surtout à reconstruire la logique :

Condition → décision/action → éventuelle conséquence → étape suivante.

Par exemple : si l’Impact Assessment conclut qu’un système a un impact GMP, alors une évaluation CQV/CSV doit être réalisée, et le résultat de cette évaluation peut ensuite déterminer les activités et livrables nécessaires.

Je fais également attention aux conditions multiples : si A et B → alors C, ou si A ou B → alors C. Cela peut changer complètement l’interprétation de la règle.

Et comme pour les séquences, je vérifie si la condition concerne le démarrage, la réalisation, l’approbation ou simplement la poursuite d’une activité. Cela évite de transformer une condition en contrainte plus forte que ce que la procédure prévoit réellement.

Comment traites-tu les tableaux ?

Réponse : Je considère un tableau comme une information structurée et non comme une simple mise en forme du document. Je dois comprendre les relations entre les lignes et les colonnes.

Je regarde d’abord le titre du tableau, les en-têtes, les unités, les lignes, les cellules fusionnées, les notes associées et les éventuelles légendes. Ensuite, j’identifie la logique du tableau : est-ce une liste, une matrice, une correspondance, une décision, une classification, un workflow, des critères d’acceptation, une liste de responsabilités, etc.

Par exemple, une matrice peut permettre de déterminer quel livrable est nécessaire selon le résultat d’un Impact Assessment. Une autre peut faire correspondre une fonction, un risque, un test et un critère d’acceptation.

Je fais particulièrement attention aux tableaux parce qu’une information importante peut être portée uniquement par la relation entre plusieurs cellules, et non par une phrase lisible indépendamment.

Je dois donc conserver la structure logique du tableau et être capable de répondre à une question du type : « pour cette condition et cet objet, quelle est l’exigence applicable ? »

Comment traites-tu les notes ?

Réponse : Je ne considère pas automatiquement une note comme une information secondaire. Je regarde à quoi elle se rapporte et si elle modifie ou précise la règle principale.

Une note peut par exemple apporter une précision, une restriction, une exception, une définition, une condition d’application ou une information importante pour l’exécution de l’activité.

Je rattache donc la note à l’élément auquel elle se rapporte : phrase, étape, tableau, figure ou section. Ensuite, je vérifie si elle change l’interprétation de l’information principale.

Par exemple, une procédure peut définir une règle générale puis ajouter une note précisant que cette règle ne s’applique pas à certains équipements ou dans certaines conditions. Dans ce cas, la note devient essentielle pour déterminer correctement le périmètre.

Donc je ne fais pas de distinction automatique entre « texte principal = important » et « note = secondaire ». Je regarde sa valeur dans le contexte.

Comment traites-tu les annexes ?

Réponse : Je considère les annexes comme faisant partie intégrante de la compréhension du document lorsqu’elles sont référencées ou nécessaires à l’exécution de la procédure.

Je vérifie d’abord quelles annexes existent et à quoi elles servent. Une annexe peut contenir un formulaire à compléter, une checklist, une matrice, un logbook, un arbre de décision, un exemple, une liste d’équipements, des critères ou des informations techniques complémentaires.

Je regarde ensuite si la procédure principale renvoie explicitement vers une annexe, par exemple : « compléter l’Annexe X », « utiliser le formulaire de l’Annexe Y » ou « se référer à l’arbre de décision en Annexe Z ».

Dans ce cas, l’annexe peut être indispensable pour comprendre comment la règle doit être appliquée concrètement.

Je fais également le lien avec le reste de la documentation. Une annexe peut être un livrable, un enregistrement, une preuve d’exécution ou une entrée pour une autre activité.

Donc, pour moi, une annexe n’est pas simplement une pièce jointe à ignorer après la lecture de la procédure : je cherche à déterminer son rôle, son caractère obligatoire ou conditionnel et sa relation avec le document principal et les autres livrables.

Comment traites-tu les références croisées ?

Réponse : Je ne considère pas une référence croisée comme un simple renvoi. Je vais chercher le document, la section ou l’annexe référencée pour comprendre l’information dans son contexte. Par exemple, si une SOP indique « conformément à la procédure de gestion des déviations », je vais regarder cette procédure pour comprendre quelle règle s’applique réellement, quelles sont les responsabilités et quelles sont les étapes attendues.

Je regarde aussi la direction de la relation : ce document fait référence à quel document, pourquoi, et est-ce que le document référencé apporte une exigence, une définition, une méthode, un formulaire ou un livrable ?

C’est particulièrement important en CQV/CSV parce qu’un document peut volontairement rester général et renvoyer vers une procédure métier qui contient les règles détaillées.

Comment traites-tu une information répartie dans plusieurs documents ?

Réponse : Je considère qu’une information peut être répartie sur plusieurs documents et qu’il faut parfois suivre les références croisées pour avoir l’information complète.

Il arrive souvent qu’un document donne uniquement une partie de l’information, puis renvoie vers un autre document pour le détail. Dans ce cas, je ne m’arrête pas au premier document. Je vais chercher le document cité en référence et je prends en compte l’information complémentaire qu’il contient.

Par exemple, une SOP peut expliquer qu’une activité doit être réalisée, mais ne pas détailler comment elle doit être réalisée, avec quels critères ou avec quel formulaire. Elle peut renvoyer vers une autre procédure, une Work Instruction, une annexe ou un formulaire. Pour comprendre correctement l’activité, je dois donc suivre cette référence et intégrer les informations pertinentes.

Je reconstruis ainsi progressivement l’information :

Document principal → référence citée → document de détail → éventuelles autres références → compréhension complète de la règle ou du processus.

Je regarde également si le document référencé apporte une exigence, une exception, une condition, une responsabilité, un critère d’acceptation ou un livrable qui modifie la compréhension du document initial.

C’est particulièrement important en CQV/CSV, car les informations sont souvent distribuées entre SOP, procédures métier, Work Instructions, URS, spécifications, analyses de risques, Impact Assessments, protocoles, formulaires et annexes.

Donc, pour moi, lire un document signifie aussi suivre ses références lorsqu’elles sont nécessaires pour comprendre complètement l’information. Je ne dois pas considérer qu’une information est complète simplement parce qu’elle apparaît dans le document que j’ai initialement reçu.

Comment détectes-tu une contradiction entre deux documents ?

Réponse : Je commence par comparer les informations sur le même sujet, le même objet et le même périmètre, parce qu’une différence entre deux documents n’est pas forcément une contradiction. Elle peut simplement venir d’un périmètre différent, d’une fonction différente ou d’un niveau de détail différent.

Je vérifie d’abord la version, le statut, la date d’entrée en vigueur, le site, le système, l’équipement et le scope des deux documents. Il faut notamment vérifier qu’on compare bien des documents applicables au même contexte.

Ensuite, je compare les informations importantes : exigences, paramètres, limites, responsabilités, classification, séquence des activités, critères d’acceptation, règles métier, livrables, etc.

Par exemple, si une SOP indique qu’une alarme est critique alors qu’une ACFC ou une autre documentation applicable la classe majeure, je ne choisis pas moi-même laquelle est correcte. Je signale la divergence et je cherche la source qui doit faire référence, selon la gouvernance documentaire du site.

Je regarde également les références croisées : il est possible qu’un document plus récent ait modifié une règle et que l’autre document n’ait pas encore été mis à jour.

Donc ma logique est :

différence détectée → vérifier le contexte → vérifier versions/statuts → vérifier les références croisées → déterminer s’il s’agit réellement d’une contradiction → identifier le document faisant autorité → documenter le point à clarifier si nécessaire. Et surtout, je ne corrige pas ou ne réconcilie pas moi-même deux exigences contradictoires. En environnement GMP, si la source de vérité n’est pas clairement identifiable, je considère cela comme un point à clarifier et potentiellement comme une anomalie

Que fais-tu lorsqu'une SOP renvoie vers une autre SOP ?

Réponse : Je vais systématiquement consulter la SOP référencée si elle contient des informations nécessaires pour comprendre ou appliquer correctement la première SOP. Je ne m’arrête pas au document initial.

Je vérifie d’abord pourquoi la première SOP fait cette référence : est-ce que la deuxième SOP contient une règle métier, une méthode, une responsabilité, un workflow, une condition ou un formulaire nécessaire à l’activité ?

Ensuite, je regarde également la version et le statut de la SOP référencée, pour m’assurer que je prends bien en compte le document applicable.

Pour moi, la logique est : SOP principale → référence → SOP détaillée → intégration des informations pertinentes dans ma compréhension du processus.

Si la deuxième SOP renvoie elle-même vers d’autres documents et que ces références sont nécessaires pour comprendre le sujet, je poursuis également l’analyse.

Que fais-tu lorsqu'un document semble obsolète ?

Réponse : Je ne considère pas immédiatement qu’il est inutilisable simplement parce qu’il semble ancien. Je vérifie d’abord son statut documentaire, sa version, sa date d’entrée en vigueur, sa date d’expiration éventuelle et s’il existe une version plus récente ou un document qui l’a remplacé.

Je regarde également les références croisées et les documents qui l’utilisent, parce qu’un ancien document peut parfois être conservé comme référence historique ou comme preuve d’une situation à une date donnée, même s’il n’est plus applicable aujourd’hui.

En revanche, si je dois prendre une décision sur une activité actuelle, je ne vais pas utiliser une ancienne version comme exigence applicable sans avoir confirmé qu’elle est toujours en vigueur.

Si le statut n’est pas clair, je considère l’information comme à confirmer et je cherche la source documentaire applicable auprès du système de gestion documentaire, du document owner ou de QA selon le processus du site.

Que fais-tu lorsqu'une version récente semble contredire une ancienne ?

Réponse : Je commence par vérifier qu’il s’agit réellement d’une contradiction et pas simplement d’une évolution de la règle, d’un changement de périmètre ou d’un changement de niveau de détail.

Je compare les deux versions, mais je regarde également l’historique du document / le revision history. En général, le document contient un historique des modifications qui permet de voir ce qui a été changé, pourquoi, quand et parfois par qui. C’est une information importante pour comprendre l’évolution de l’exigence et éviter de comparer deux versions sans comprendre le contexte du changement.

Je vérifie ensuite la version, le statut, la date d’entrée en vigueur, le scope et les références associées. Si la version récente est officiellement approuvée et applicable, elle devient normalement la référence pour les activités actuelles.

Mais je cherche surtout à comprendre ce qui a changé et pourquoi. Par exemple, si une ancienne SOP demande une étape de qualification et que la nouvelle ne la demande plus, je vais regarder dans l’historique si cette étape a été supprimée, modifiée ou remplacée, puis vérifier s’il existe un Change Control, Impact Assessment ou autre document justificatif associé.

Je regarde également les éventuelles conséquences sur les autres documents : SOP, Work Instructions, analyses de risques, protocoles, matrices, formulaires, documents CQV/CSV, etc.

Si malgré tout l’écart reste inexpliqué ou que je ne peux pas déterminer quelle règle doit s’appliquer, je ne choisis pas moi-même entre les deux versions. Je considère le point comme à clarifier et je sollicite le document owner, le responsable métier ou QA, selon le processus du site.

L’objectif est donc de ne pas seulement savoir « quelle est la dernière version ? », mais de comprendre « qu’est-ce qui a changé, pourquoi, à partir de quand et quelles conséquences ce changement a eues sur les autres documents et activités ? ».

Comment utilises-tu un ancien livrable ?

Réponse : Je peux utiliser un ancien livrable comme base de compréhension et comme référence, mais je ne le considère jamais automatiquement comme applicable au nouveau projet.

Je commence par vérifier dans quel contexte l’ancien livrable a été réalisé : quel site, quel équipement, quelle ligne, quel process, quel système, quel projet, quelle version des documents de référence et quelles exigences étaient applicables à ce moment-là.

Ensuite, je regarde ce qui est réutilisable et ce qui doit être réévalué par rapport au nouveau contexte.

Un ancien protocole, une ancienne analyse de risques ou un ancien rapport peut par exemple m’aider à comprendre la logique utilisée par le site, la structure attendue du document, les tests réalisés, les critères utilisés, les risques identifiés ou les décisions prises précédemment.

Je vérifie également son statut, sa version et son historique, ainsi que les documents sur lesquels il était basé.

Que peux-tu reprendre d'un ancien livrable ?

Réponse : Je peux reprendre d’un ancien livrable la structure, la logique de rédaction, la méthodologie et certains éléments techniques, à condition de vérifier qu’ils sont toujours applicables au nouveau contexte.

Mais il y a aussi un aspect très important pour moi : le retour d’expérience des reviewers. Quand je travaille sur un nouveau livrable, je regarde si des commentaires QA ou des commentaires de revue ont été faits sur des livrables précédents du même type.

L’objectif n’est pas seulement de reprendre le contenu, mais aussi de comprendre pourquoi certains commentaires avaient été faits et comment ils avaient été corrigés. Cela me permet d’éviter de reproduire les mêmes erreurs.

Par exemple, si sur un ancien protocole QA avait demandé de mieux justifier un critère d’acceptation, de préciser une référence, de clarifier une responsabilité ou de mieux faire le lien avec une analyse de risques, je vais intégrer cette logique directement dans mon nouveau document.

De la même manière, la manière dont un ancien document a été rédigé et finalement approuvée me donne une indication sur le niveau de détail et la logique attendue par les reviewers du site.

Je peux donc anticiper certaines remarques en me demandant : « Si je soumets ce document à la même équipe QA ou aux mêmes reviewers, quelles questions ou commentaires vont-ils probablement avoir ? »

C’est une forme de capitalisation du retour d’expérience. L’objectif est de produire dès la première version un document qui soit non seulement techniquement correct, mais également aligné avec les attentes documentaires et qualité du site.

En revanche, je ne reprends jamais automatiquement un commentaire ou une correction d’un ancien document. Je vérifie d’abord le contexte, la cause du commentaire et son applicabilité au nouveau livrable.

Que ne dois-tu jamais reprendre sans vérification ?

Réponse : Je ne dois jamais reprendre sans vérification une information qui dépend du contexte, de la version, de l’état actuel du système ou des exigences applicables.

Par exemple, je ne vais pas reprendre automatiquement :

une URS ou une exigence utilisateur ;

Une spécification technique ou fonctionnelle ;

Une analyse de risques / ACFC / FMEA / FMECA ;

Une classification GMP ou GxP ;

Une catégorisation GAMP ;

Un Impact Assessment ;

Des critères d’acceptation ;

Des paramètres, limites ou setpoints ;

Une configuration système ou architecture ;

Une liste de tags, alarmes, instruments ou composants ;

Une interface entre systèmes ;

Une recette ou un workflow ;

Une référence réglementaire ou une exigence qualité ;

Une conclusion de qualification ou de validation.

Tout cela peut avoir changé depuis l’ancien livrable.

Je vérifie donc toujours la source, la version, le statut et le contexte actuel avant de reprendre ces informations. Je regarde également si des Change Controls, déviations, CAPA, nouvelles analyses de risques ou mises à jour documentaires ont modifié la situation depuis la réalisation de l’ancien livrable.

Pour moi, un ancien livrable est donc avant tout une source d’information et un retour d’expérience, pas une vérité à recopier. Il peut accélérer énormément le travail, mais la décision et le contenu du nouveau livrable doivent être basés sur la situation actuelle et les documents applicables.

Quelle différence fais-tu entre source factuelle, méthode, exemple et inspiration ?

Réponse : Je fais une distinction assez claire entre les quatre, parce que je ne leur donne pas le même niveau de confiance ni le même usage.

Une source factuelle, c’est une information que je peux considérer comme une référence pour prendre une décision : par exemple une SOP approuvée et en vigueur, une URS approuvée, une spécification, un P\&ID, une analyse de risques, un Impact Assessment, une donnée système ou une exigence réglementaire applicable. Si je m’appuie dessus, je dois pouvoir retrouver la source et démontrer d’où vient l’information.

Une méthode, c’est plutôt la manière de réaliser une activité. Elle peut venir d’une procédure, d’une méthodologie CQV/CSV, d’un standard du site ou d’un retour d’expérience validé. Elle m’aide à déterminer comment faire, mais je vérifie toujours qu’elle correspond au contexte et aux procédures applicables.

Un exemple, c’est quelque chose qui me permet de comprendre comment une situation similaire a été traitée auparavant. Un ancien protocole, une ancienne analyse de risques ou un ancien livrable peut être un exemple. Je peux m’en inspirer pour comprendre la logique, mais je ne considère pas son contenu comme automatiquement applicable au nouveau projet.

Enfin, une inspiration, c’est encore différent. Cela peut être une idée provenant d’un ancien document, d’une autre manière de travailler ou d’une expérience précédente qui me permet de réfléchir à une solution. Mais ce n’est ni une exigence, ni une preuve, ni une méthode obligatoirement applicable.

Donc, dans ma logique :

Source factuelle = « Qu’est-ce qui est vrai et applicable ? »  
Méthode = « Comment dois-je faire ? »  
Exemple = « Comment cela a déjà été fait ? »  
Inspiration = « Qu’est-ce que je peux éventuellement reprendre comme idée ? »

Et c’est important pour un outil IA : il ne doit surtout pas transformer un exemple ou une inspiration en exigence, ni utiliser un ancien livrable comme une source factuelle sans vérifier son contexte, son statut et sa version.

Comment exploites-tu un schéma électrique ?

**Réponse :**
Un schéma électrique, je l’exploite surtout pour comprendre l’alimentation, le câblage, les protections, les commandes et les interfaces électriques d’un équipement. Je ne cherche pas forcément à analyser chaque fil au départ ; je pars de la fonction ou du composant qui m’intéresse et je remonte ou descends dans le schéma pour comprendre son environnement.

Je commence généralement par identifier l’équipement, l’armoire électrique, les alimentations et les différents circuits. Ensuite, je regarde comment sont organisés les éléments : disjoncteurs, fusibles, contacteurs, relais, alimentations 24 VDC, moteurs, capteurs, actionneurs, borniers, entrées/sorties PLC, arrêts d’urgence et dispositifs de sécurité, selon l’équipement.

Je cherche surtout à comprendre les relations entre les composants. Par exemple, si une sonde ou un capteur est concerné, je veux savoir comment il est alimenté, où son signal arrive, sur quelle entrée PLC il est raccordé et quelle fonction utilise ensuite cette information. Pour un actionneur, je vais regarder comment il est commandé et quelles conditions doivent être réunies pour permettre son fonctionnement.

Le schéma électrique me permet donc de compléter l’architecture fonctionnelle que je peux avoir avec d’autres documents. Je peux par exemple partir de :

Capteur → câblage → bornier → I/O PLC → logique de contrôle → actionneur → équipement

et vérifier également les alimentations et les circuits de sécurité associés.

Je l’utilise aussi pour identifier des dépendances qui ne sont pas forcément visibles dans une liste d’équipements ou dans une spécification. Par exemple, deux équipements peuvent sembler indépendants fonctionnellement, mais partager une alimentation, un circuit de sécurité ou une commande.

Dans une analyse CQV/CSV, je vais ensuite faire le lien avec les autres documents : P\&ID, architecture système, I/O List, Functional Specification, Electrical Drawing, Control Panel Documentation, documentation PLC/SCADA, listes d’alarmes et documentation constructeur.

Je ne considère toutefois pas le schéma électrique comme une preuve suffisante à lui seul. Je vérifie que ce que je comprends du schéma est cohérent avec la configuration réelle, les autres documents et, lorsque nécessaire, les vérifications terrain.

Donc, même si mon objectif n’est pas de faire une étude électrique complète, je l’exploite comme une source essentielle pour comprendre les dépendances techniques et l’architecture réelle d’un équipement, notamment lorsqu’un changement peut avoir un impact sur le contrôle, les instruments, les I/O, les fonctions de sécurité ou la qualification.

Comment exploites-tu un P\&ID ?

Comment exploites-tu un flowchart avec des décisions YES/NO ?

Comment exploites-tu une capture d'écran HMI ?

Comment exploites-tu un tableau Excel complexe ?

Que dois-tu faire lorsqu'un document est partiellement illisible ?

Comment savoir si différents certificats utilisés en QI sont conformes (Certifcat de calibration, certifcat matier 3.2 ou autres…) ?

Comment comprendre un Cahier de soudre (Il contient quoi ? : DMOS, QMOS, Certification des souderus…)

Commet lire les plan de soudures, isometrie …

## PARTIE 3 — HIÉRARCHIE DES SOURCES

Nous avons déjà décidé que l'IA ne doit pas être la source de vérité et que les conflits doivent être conservés, pas silencieusement écrasés.

Quelle source privilégies-tu lorsqu'il existe plusieurs sources ?

Une SOP client prime-t-elle toujours sur une bonne pratique générale ?

Une instruction locale peut-elle primer sur une procédure corporate ?

Une décision humaine validée peut-elle modifier une connaissance précédemment extraite ?

Un livrable approuvé peut-il servir de référence méthodologique ?

Peut-il servir de référence factuelle ?

Un ancien livrable peut-il être utilisé comme précédent ?

Dans quelles conditions ?

Que dois-tu faire lorsque deux sources fiables se contredisent ?

Est-ce que tu veux que l'IA te montre le conflit ou qu'elle propose directement une résolution ?

Comment doit-elle exprimer son niveau de confiance ?

Que doit-elle faire lorsqu'elle ne trouve aucune source ?

Peut-elle utiliser ses connaissances générales ?

Si oui, dans quelles circonstances ?

Comment doit-elle signaler qu'une information provient de sa connaissance générale ?

## PARTIE 4 — APPRENDRE TON RAISONNEMENT

C'est probablement la partie la plus importante.

Quand tu prends une décision métier, quels éléments considères-tu ?

Raisonne-tu principalement par règles explicites ?

Par expérience ?

Par analogie avec des cas précédents ?

Par compréhension du système ?

Par risque ?

Par combinaison de tous ces éléments ?

Comment sais-tu qu'un cas ressemble à un autre ?

Qu'est-ce qui rend deux cas suffisamment similaires ?

Qu'est-ce qui les rend suffisamment différents pour ne pas réutiliser la même approche ?

Lorsque tu as déjà rencontré un cas similaire, comment l'utilises-tu ?

Fais-tu confiance à ton expérience si elle contredit une procédure ?

Que fais-tu dans ce cas ?

Fais-tu confiance à un précédent approuvé ?

À quel niveau ?

Comment adaptes-tu une solution précédente au nouveau contexte ?

Qu'est-ce que tu vérifies systématiquement avant de réutiliser une solution ?

Quelles erreurs humaines fais-tu parfois ?

Quelles erreurs veux-tu absolument empêcher l'IA de faire ?

Quelles choses un ingénieur expérimenté voit « naturellement » mais qui sont difficiles à formaliser ?

## PARTIE 5 — COMMENT TU ANALYSES UN CHANGEMENT

Prenons :

« Une recette est modifiée. »

Quelle est ta première réaction ?

Que cherches-tu immédiatement ?

Comment détermines-tu le delta entre ancienne et nouvelle situation ?

Comment identifies-tu les fonctions affectées ?

Comment identifies-tu les paramètres affectés ?

Comment détermines-tu les impacts directs ?

Comment détermines-tu les impacts indirects ?

Comment détermines-tu l'impact qualité ?

Comment détermines-tu l'impact HSE ?

Comment détermines-tu l'impact réglementaire ?

Comment détermines-tu l'impact CSV ?

Comment détermines-tu l'impact CQV ?

Comment détermines-tu les documents impactés ?

Comment détermines-tu les tests impactés ?

Comment détermines-tu si une requalification est nécessaire ?

Comment détermines-tu si une validation est nécessaire ?

Comment détermines-tu si aucun test supplémentaire n'est nécessaire ?

Quelles informations peuvent te faire changer de conclusion ?

## PARTIE 6 — TON RAISONNEMENT ACFC

Nous avons déjà décidé que l'ACFC doit être configurable par client, notamment parce qu'un site peut avoir 6, 7 ou 9 questions, avec des formulations exactes différentes.

Lorsque tu fais une ACFC, que regardes-tu avant de répondre aux questions ?

Est-ce que tu analyses le composant seul ?

Ou le composant dans sa fonction ?

Comment comprends-tu la fonction ?

Comment détermines-tu si une question s'applique ?

Que fais-tu lorsqu'une question est ambiguë ?

Comment justifies-tu une réponse YES ?

Comment justifies-tu une réponse NO ?

Une seule réponse YES suffit-elle toujours à déclarer le composant critique ?

Comment la criticité du composant se propage-t-elle à la fonction ?

Comment la criticité de la fonction se propage-t-elle au système ?

Existe-t-il des exceptions ?

Comment traites-tu les impacts HSE ?

Comment traites-tu les impacts produit/qualité ?

Peut-il y avoir plusieurs dimensions de criticité ?

Comment veux-tu que l'IA explique une conclusion ACFC ?

Quelle information doit être conservée derrière chaque réponse ?

## PARTIE 7 — QUALITY AGENT

Pour toi, qu'est-ce qu'un « bon raisonnement qualité » ?

Qu'est-ce qui distingue un ingénieur qualité moyen d'un excellent ingénieur qualité ?

Quelles questions qualité te poses-tu presque automatiquement ?

Comment raisonnes-tu sur le risque patient ?

Sur le produit ?

Sur le procédé ?

Sur les données ?

Sur la conformité réglementaire ?

Sur la disponibilité du produit ?

Sur l'intégrité des données ?

Sur le HSE ?

Comment arbitres-tu lorsqu'un impact semble faible techniquement mais important qualité ?

Qu'est-ce qu'un signal d'alerte qualité pour toi ?

Qu'est-ce qui te ferait arrêter une analyse et demander une revue QA ?

## PARTIE 8 — URS

Comment construis-tu une URS à partir d'un besoin métier ?

Comment distingues-tu besoin utilisateur et exigence technique ?

Comment détermines-tu si une exigence est testable ?

Comment détectes-tu une exigence trop vague ?

Comment détectes-tu une exigence trop restrictive ?

Comment relies-tu une URS au process ?

Au système ?

Aux risques ?

Aux tests ?

Comment détermines-tu qu'une URS est complète ?

Comment détectes-tu les exigences manquantes ?

## PARTIE 9 — RISK / IMPACT ASSESSMENT

Comment identifies-tu les risques ?

Quels risques cherches-tu systématiquement ?

Comment détermines-tu la gravité ?

La probabilité ?

La détectabilité ?

Utilises-tu d'autres critères ?

Comment relies-tu un risque à une fonction ?

À un paramètre ?

À une exigence ?

À un test ?

Comment détermines-tu qu'un risque est suffisamment maîtrisé ?

Comment détectes-tu un risque qui n'a aucune mesure de maîtrise ?

Comment détectes-tu un test qui ne couvre pas réellement le risque ?

## PARTIE 10 — TESTS IQ/OQ/PQ

C'est une partie capitale de ton projet.

Lorsque tu dois créer un protocole OQ, comment commences-tu ?

Quelles informations recherches-tu ?

Comment détermines-tu les tests nécessaires ?

Comment détermines-tu qu'un test est inutile ?

Comment détermines-tu les tests positifs ?

Les tests négatifs ?

Les limites ?

Les valeurs nominales ?

Les extrêmes ?

Les alarmes ?

Les interlocks ?

Les séquences ?

Les interfaces ?

Les données ?

Les recettes ?

Les modes dégradés ?

Les erreurs opérateur ?

Les cas exceptionnels ?

Les tests de récupération ?

Les tests de sécurité ?

Les tests d'intégrité des données ?

Comment détermines-tu le niveau de profondeur approprié ?

Comment sais-tu que tu as suffisamment de tests ?

Comment détectes-tu un trou de couverture ?

Comment détectes-tu deux tests redondants ?

Comment détermines-tu qu'un test proposé par l'IA est techniquement absurde ?

Quels tests un junior oublie généralement ?

Quels tests toi-même tu vérifies toujours en dernier ?

## PARTIE 11 — « L'IA DOIT SE POSER DES QUESTIONS »

Dans quelles situations veux-tu que l'IA t'interrompe ?

Dans quelles situations doit-elle continuer avec une hypothèse ?

Dans quelles situations doit-elle présenter plusieurs scénarios ?

Dans quelles situations doit-elle bloquer ?

Quelle différence fais-tu entre :

information manquante ;

information ambiguë ;

information contradictoire ;

information non fiable ;

information non applicable ?

Comment veux-tu que l'IA formule ses questions ?

Une question à la fois ou plusieurs ?

Doit-elle expliquer pourquoi elle pose la question ?

Doit-elle proposer les réponses possibles ?

Doit-elle indiquer ce qui changera selon ta réponse ?

Peut-elle dire :

« Je peux continuer avec l'hypothèse A, mais cela pourrait modifier les tests B et C. »

Est-ce le comportement souhaité ?

## PARTIE 12 — TON COMPORTEMENT FACE À L'INCERTITUDE

Comment réagis-tu lorsque tu n'es pas sûr ?

Cherches-tu une autre source ?

Demandes-tu à quelqu'un ?

Comparaison avec un précédent ?

Fais-tu une analyse conservatrice ?

Comment définis-tu une décision « suffisamment sûre » ?

Préfères-tu une réponse prudente ou une réponse complète avec hypothèses ?

Comment veux-tu que l'IA distingue :

CERTAIN

PROBABLE

POSSIBLE

UNKNOWN

CONFLICTING

Quel niveau de confiance doit déclencher une revue humaine ?

## PARTIE 13 — TON RAPPORT AU RISQUE

Es-tu plutôt conservateur ?

Quand prends-tu une décision sans avoir 100 % des informations ?

Quels risques justifient une approche conservatrice ?

Quels risques ne la justifient pas ?

Comment évites-tu le « overtesting » ?

Comment évites-tu le « undertesting » ?

Comment arbitres-tu entre coût, délai, qualité et robustesse ?

Comment détermines-tu le niveau de preuve nécessaire ?

## PARTIE 14 — LIVRABLES

Nous avons déjà défini que le livrable est une projection du contexte selon une méthode et une représentation documentaire, et que SOP + Template + Example peuvent avoir des rôles différents.

Lorsque tu produis un livrable, réfléchis-tu d'abord au contenu ou au template ?

Comment utilises-tu la SOP ?

Comment utilises-tu le template ?

Comment utilises-tu un exemple approuvé ?

Comment adaptes-tu le contenu au contexte ?

Comment détectes-tu qu'une section du template n'est pas applicable ?

Comment traites-tu une section conditionnelle ?

Comment traites-tu une section répétitive ?

Comment détermines-tu le niveau de détail ?

Comment détermines-tu le style rédactionnel ?

Comment détermines-tu les termes à employer ?

Comment vérifies-tu qu'un document respecte réellement la procédure ?

Comment vérifies-tu qu'il respecte le template ?

Comment vérifies-tu qu'il est cohérent avec les autres livrables ?

Comment détectes-tu une contradiction entre deux livrables ?

## PARTIE 15 — TON COMPORTEMENT FACE AUX ANCIENS LIVRABLES

Si tu trouves un OQ précédent très similaire, comment l'utilises-tu ?

Que récupères-tu ?

Que compares-tu ?

Qu'est-ce que tu dois recalculer ?

Qu'est-ce qui ne doit jamais être copié automatiquement ?

Comment détermines-tu si l'ancien document reste pertinent ?

Comment utilises-tu plusieurs précédents différents ?

Si trois anciens documents proposent trois approches différentes, que fais-tu ?

## PARTIE 16 — AUTO-CRITIQUE

C'est ici que je veux aller au-delà d'un simple chatbot.

Après avoir terminé ton travail, comment le contrôles-tu ?

Relis-tu ton raisonnement ?

Relis-tu uniquement le résultat ?

Comparais-tu résultat et besoin initial ?

Vérifies-tu les sources ?

Vérifies-tu les règles ?

Vérifies-tu les hypothèses ?

Vérifies-tu les omissions ?

Vérifies-tu les contradictions ?

Vérifies-tu les impacts indirects ?

Vérifies-tu la traçabilité ?

Vérifies-tu les tests ?

Vérifies-tu la conformité au template ?

Vérifies-tu la procédure ?

Qu'est-ce qu'un « deuxième ingénieur » regarderait que le premier pourrait oublier ?

## PARTIE 17 — COMMENT TU PRENDS UNE DÉCISION FINALE

Qu'est-ce qui transforme une proposition en décision ?

Est-ce toujours l'humain ?

Certaines décisions peuvent-elles être entièrement déterministes ?

Lesquelles ?

Lesquelles nécessitent ton jugement ?

Lesquelles nécessitent QA ?

Lesquelles nécessitent plusieurs approbateurs ?

Que doit conserver ValidaPharm lorsqu'une décision est prise ?

Veux-tu conserver le raisonnement ayant conduit à la décision ?

Sous quelle forme ?

Veux-tu conserver les alternatives rejetées ?

Veux-tu conserver pourquoi elles ont été rejetées ?

## PARTIE 18 — MÉMOIRE

Les documents actuels prévoient déjà une mémoire structurée et gouvernée, distincte d'une simple mémoire conversationnelle.

Qu'est-ce que ValidaPharm doit retenir durablement ?

Qu'est-ce qu'il ne doit jamais mémoriser automatiquement ?

Quels types de décisions doivent devenir des connaissances ?

Comment une nouvelle connaissance doit-elle être validée ?

Veux-tu pouvoir dire :

« Souviens-toi que sur ce site nous faisons toujours X »

Si oui, comment cette information doit-elle être qualifiée ?

Comment doit-elle être modifiée plus tard ?

Comment doit-elle être supprimée ?

Comment éviter qu'une ancienne connaissance continue à influencer l'agent ?

Veux-tu une mémoire personnelle à ton niveau ?

Une mémoire par organisation ?

Une mémoire par site ?

Une mémoire par équipement ?

Une mémoire par type de mission ?

## PARTIE 19 — APPRENTISSAGE

Qu'est-ce que signifie pour toi « l'IA apprend » ?

Doit-elle apprendre de tes corrections ?

De tes décisions ?

De tes modifications de documents ?

De tes rejets ?

De tes validations ?

De tes questions ?

De tes erreurs ?

Doit-elle automatiquement transformer cela en connaissance ?

Ou proposer :

« J'ai remarqué que tu fais systématiquement X. Veux-tu enregistrer cette pratique ? »

Préfères-tu cette deuxième approche ?

Quels apprentissages peuvent être automatiques ?

Lesquels nécessitent obligatoirement validation humaine ?

## PARTIE 20 — PERSONNALISATION PAR CLIENT

Comment ValidaPharm doit-il changer de comportement lorsqu'il change de client ?

Qu'est-ce qui doit changer :

procédures ?

templates ?

terminologie ?

méthodes ?

seuils ?

workflows ?

questions ?

niveau de détail ?

Qu'est-ce qui doit rester universel ?

Si tu passes de Ferring à un autre site, comment veux-tu que l'IA sache qu'elle doit changer de méthode ?

Comment doit-elle éviter de mélanger les connaissances des deux clients ?

Une bonne pratique d'un client peut-elle être proposée à un autre ?

Si oui, comment doit-elle être présentée ?

## PARTIE 21 — MULTILINGUE

Si la SOP est en anglais mais que tu travailles en français, que doit faire l'IA ?

Doit-elle raisonner dans une langue interne et produire dans une autre ?

Doit-elle conserver les termes originaux ?

Quand doit-elle traduire ?

Comment éviter qu'une traduction modifie le sens réglementaire ou technique ?

Les questions ACFC doivent-elles être conservées mot pour mot dans la langue source ?

## PARTIE 22 — CAS COMPLEXES

Que doit faire l'IA si aucune procédure client n'existe ?

Si une procédure existe mais aucun template ?

Si un template existe mais aucune procédure ?

Si procédure + template + exemple existent ?

Si les trois se contredisent ?

Si le client utilise un processus externe ?

Si une partie du travail a déjà été faite hors ValidaPharm ?

Si tu arrives sur un projet déjà à 60 % ?

Si les documents historiques sont incomplets ?

Si les données sont contradictoires ?

Si un équipement est nouveau mais très similaire à un ancien ?

Si l'équipement est différent mais remplit la même fonction ?

Si le même équipement est utilisé dans plusieurs processus ?

Si un composant est critique dans un contexte mais pas dans un autre ?

Si une fonction est critique pour la qualité mais pas pour le HSE ?

Si une fonction est HSE-critical mais non product-critical ?

## PARTIE 23 — RELATION ENTRE AGENTS

Quels agents doivent exister selon toi ?

Quels agents doivent absolument être séparés ?

Quels agents peuvent être regroupés ?

L'Agent Qualité doit-il pouvoir challenger l'Agent CQV ?

L'Agent Risk doit-il pouvoir challenger l'Agent Test ?

L'Agent Test doit-il pouvoir contester une exigence ?

L'Agent URS doit-il pouvoir demander des informations au Context Agent ?

L'Agent Deliverable doit-il pouvoir refuser de produire un document incomplet ?

Qui arbitre lorsqu'ils ne sont pas d'accord ?

L'Agent Central doit-il avoir le dernier mot ?

Ou doit-il présenter les divergences à l'humain ?

## PARTIE 24 — AGENT CENTRAL

Que veux-tu exactement que l'Agent Central fasse ?

Doit-il construire le plan de travail ?

Déterminer quels agents appeler ?

Décider dans quel ordre ?

Revenir vers un agent après une réponse d'un autre ?

Détecter qu'un raisonnement est incomplet ?

Relancer une analyse ?

Comparer plusieurs stratégies ?

Présenter une recommandation finale ?

Peut-il prendre une décision seul ?

Si oui, lesquelles ?

Doit-il expliquer pourquoi il a appelé tel agent ?

## PARTIE 25 — « COMME UN HUMAIN »

C'est volontairement plus philosophique.

Qu'est-ce que signifie concrètement pour toi :

« réfléchir comme un humain » ?

Qu'est-ce qu'un humain expert fait que les LLM font mal ?

Qu'est-ce qu'un humain expert remarque sans qu'on lui demande ?

Comment un humain sait-il qu'une information « ne colle pas » ?

Comment fait-il des liens entre deux informations éloignées ?

Comment reconnaît-il un cas déjà rencontré ?

Comment détecte-t-il une anomalie ?

Comment remet-il en question son propre raisonnement ?

Comment sait-il qu'il doit demander de l'aide ?

Comment évite-t-il de foncer vers la première réponse plausible ?

Si tu devais donner 10 règles à un ingénieur junior pour qu'il travaille comme toi, quelles seraient-elles ?

## PARTIE 26 — « MIEUX QUE MOI »

Tu as dit quelque chose de très important :

« comme moi, voire mieux »

Sur quels aspects veux-tu que l'IA soit meilleure que toi ?

Mémoire ?

Exhaustivité ?

Recherche documentaire ?

Traçabilité ?

Détection d'incohérences ?

Détection des oublis ?

Comparaison historique ?

Calcul ?

Vitesse ?

Suggestions ?

Quels aspects doivent rester sous ton contrôle ?

## PARTIE 27 — TES ERREURS À TOI

Cette partie peut sembler étrange, mais elle est essentielle.

Quelles erreurs fais-tu typiquement lorsque tu travailles vite ?

Qu'oublies-tu parfois ?

Quelles erreurs vois-tu souvent chez les autres ingénieurs ?

Quelles erreurs un junior fait-il presque systématiquement ?

Quelles erreurs veux-tu que le Reviewer recherche en priorité ?

Quelle erreur serait la plus grave dans ValidaPharm ?

Quelle erreur serait acceptable ?

Quelle erreur serait simplement gênante ?

## PARTIE 28 — CAS RÉELS

C'est probablement ici que nous allons obtenir le plus de valeur.

Je veux que tu me donnes ensuite 5 à 10 vrais cas de travail.

Pour chacun :

CAS :

Contexte :

Demande initiale :

Informations disponibles :

Documents disponibles :

Ce que j'ai cherché :

Ce que j'ai compris :

Questions que je me suis posées :

Décisions :

Pourquoi :

Ce que j'ai rejeté :

Tests envisagés :

Tests retenus :

Tests rejetés :

Livrable produit :

Corrections humaines :

Ce qu'un junior aurait probablement oublié :

Quel est le cas réel le plus représentatif de ton travail ?

Quel est le cas le plus complexe ?

Quel est le cas où ton raisonnement était difficile à expliquer ?

Quel est le cas où tu as changé d'avis après avoir trouvé une information ?

Quel est le cas où une procédure client a changé complètement ton approche ?

Quel est le cas où un précédent t'a aidé ?

Quel est le cas où un précédent était trompeur ?

Quel est le cas où tu as découvert une information trop tard ?

Quel est le cas où tu as dû poser beaucoup de questions ?

Quel est le cas où tu as découvert un oubli grâce à une relecture ?

## PARTIE 29 — LA QUESTION LA PLUS IMPORTANTE

Imagine que demain je te donne ValidaPharm.

Je lui donne :

un site ;

les SOP ;

les templates ;

les équipements ;

les systèmes ;

les processus ;

les recettes ;

les changements ;

les anciens livrables ;

les risques ;

les exigences ;

les données disponibles.

Et je lui dis simplement :

« Analyse ce changement et prépare-moi le travail nécessaire. »

381\. Décris-moi exactement ce que tu voudrais qu'il fasse, étape par étape, depuis cette phrase jusqu'au livrable final.

Pas l'architecture.

Pas la technologie.

Ton comportement métier idéal.

## PARTIE 30 — LA QUESTION FINALE : LES LIMITES

Qu'est-ce que tu ne veux absolument jamais que l'IA fasse seule ?

Qu'est-ce qu'elle peut proposer mais jamais décider ?

Qu'est-ce qu'elle peut décider automatiquement ?

Qu'est-ce qui doit toujours être validé par toi ?

Qu'est-ce qui doit toujours être validé par QA ?

Qu'est-ce qui doit être purement déterministe ?

Qu'est-ce qui doit être laissé au raisonnement IA ?

Qu'est-ce qui doit combiner IA + règles ?

À partir de quel niveau de risque doit-elle obligatoirement demander une intervention humaine ?

Et je veux ajouter 10 questions « libres »

Qu'est-ce que tu voudrais que ValidaPharm comprenne de ton métier mais que nous n'avons jamais encore expliqué ?

Qu'est-ce qui te fait dire instantanément qu'un document produit par quelqu'un n'est pas bon ?

Qu'est-ce qui distingue selon toi un document simplement « conforme » d'un excellent document ?

Quelle partie de ton travail est aujourd'hui la plus difficile à automatiser ?

Quelle partie de ton travail aimerais-tu ne plus jamais avoir à faire manuellement ?

Quelle partie veux-tu absolument continuer à contrôler toi-même ?

Si ValidaPharm pouvait avoir une seule capacité exceptionnelle, laquelle choisirais-tu ?

Quelle erreur de conception de ValidaPharm te ferait abandonner le projet ?

Quelle capacité te ferait dire : « là, ce logiciel travaille vraiment comme moi » ?

Et finalement : imagine ValidaPharm dans 5 ans. Qu'est-ce que tu voudrais pouvoir lui confier que tu ne pourrais jamais lui confier aujourd'hui ?