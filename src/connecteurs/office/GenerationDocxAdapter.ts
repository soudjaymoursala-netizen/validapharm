import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import type { DonneesExportGabarit } from '../../logique-metier/export/donneesExportGabarit'
import { GabaritDocxInvalideError } from './erreurs'

/**
 * Génération réelle d'un document `.docx` (OOXML natif) à partir d'un
 * gabarit Word fourni par un client — remplace, pour ce cas précis,
 * l'astuce "HTML encapsulé en `.doc`" (`genererExportWord.ts`, inchangée
 * pour le gabarit par défaut de l'outil).
 *
 * **Choix technique** : `docxtemplater`+`pizzip` (MIT, pré-choisis par
 * anticipation, installés et testés réellement ici — jamais
 * présumés fonctionnels) plutôt que réinventer un moteur de templating
 * OOXML : `pizzip` (fork navigateur-sûr de `jszip`, dépendance unique
 * `pako`) dézippe le `.docx` client, `docxtemplater` remplace les balises
 * (`{tag}`) par les valeurs de `DonneesExportGabarit` — la **même**
 * structure de données que `genererExportWord` (voir
 * `logique-metier/export/donneesExportGabarit.ts`), ce qui garantit
 * l'équivalence de contenu exigée par construction : les
 * deux renderers ne peuvent pas diverger sur les valeurs, seule la mise en
 * forme du gabarit client diffère.
 *
 * Aucune dépendance réseau — tout s'exécute localement, cohérent avec
 * l'architecture PWA-only.
 */
export async function genererDocxPersonnalise(
  gabaritDocx: ArrayBuffer,
  donnees: DonneesExportGabarit,
): Promise<ArrayBuffer> {
  const doc = ouvrirGabarit(gabaritDocx)
  try {
    doc.render(donnees)
  } catch {
    throw new GabaritDocxInvalideError(
      'Le gabarit contient des balises incompatibles avec les données de la section (balise inconnue ou boucle mal formée).',
    )
  }
  return doc.getZip().generate({ type: 'arraybuffer' }) as ArrayBuffer
}

export interface ResultatVerificationGabaritExportClient {
  tagsTrouves: string[]
  tagsObligatoiresManquants: string[]
}

/**
 * Éléments obligatoires : le bloc de signatures (rédacteur(s)
 * + approbateur final) et l'historique des révisions. `redacteurs`/
 * `approbateur_final`/`historique_revisions` sont les noms de balises
 * exacts exposés par `DonneesExportGabarit` — un gabarit client qui ne les
 * mappe pas ne peut structurellement pas les afficher, quelle que soit sa
 * mise en forme.
 */
const TAGS_OBLIGATOIRES = ['redacteurs', 'approbateur_final', 'historique_revisions'] as const

/**
 * Vérifie qu'un gabarit `.docx` client mappe bien les éléments
 * obligatoires, avant d'autoriser son enregistrement/usage —
 * jamais après coup, à la première génération manquée.
 */
export function verifierGabaritExportClient(
  gabaritDocx: ArrayBuffer,
): ResultatVerificationGabaritExportClient {
  const doc = ouvrirGabarit(gabaritDocx)
  const tagsTrouves = extraireNomsTags((doc as unknown as DocxtemplaterAvecGetTags).getTags())
  const tagsObligatoiresManquants = TAGS_OBLIGATOIRES.filter((tag) => !tagsTrouves.includes(tag))
  return { tagsTrouves, tagsObligatoiresManquants }
}

/**
 * `getTags()` existe réellement à l'exécution (vérifié dans le code source
 * de la librairie et par test, présent "depuis 3.62.0" selon son propre
 * commentaire interne) mais n'est **pas déclaré** dans les types
 * TypeScript publiés de `docxtemplater` — un écart entre l'API réelle et
 * ses types publiés, jamais fabriqué ici (même discipline qu'ailleurs :
 * corriger honnêtement plutôt que masquer un écart de type).
 */
interface DocxtemplaterAvecGetTags {
  getTags(): StructureTagsBrute
}

/**
 * **Bug réel trouvé et corrigé pendant la construction du test** (même
 * discipline qu'ailleurs, `MediaBox` trop étroite) : le comportement par
 * défaut de `docxtemplater` pour une balise absente des données au moment
 * du rendu (typo dans le gabarit client, champ non fourni) est d'écrire
 * littéralement le texte `"undefined"` dans le document généré — jamais
 * une erreur, jamais une chaîne vide. Un tel texte apparaîtrait tel quel
 * dans un livrable réglementaire remis à un client. `nullGetter: () => ''`
 * neutralise ce défaut : une balise sans valeur produit une cellule vide,
 * jamais le mot "undefined".
 */
function ouvrirGabarit(gabaritDocx: ArrayBuffer): Docxtemplater {
  try {
    const zip = new PizZip(gabaritDocx)
    return new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    })
  } catch {
    throw new GabaritDocxInvalideError()
  }
}

/** Forme réelle retournée par `Docxtemplater.getTags()` (vérifiée dans le code source de la librairie, `get-tags.js`) — `tags` de chaque section est un objet imbriqué par portée de boucle, keyé uniquement par nom de balise (jamais de clé structurelle parasite à ce niveau). */
interface StructureTagsBrute {
  document?: { target: string; tags: Record<string, unknown> }
  headers: Array<{ target: string; tags: Record<string, unknown> }>
  footers: Array<{ target: string; tags: Record<string, unknown> }>
}

/** Aplatit l'arbre de balises (toutes portées de boucle confondues) en un ensemble de noms — suffisant pour vérifier la simple présence d'une balise, sans distinction de profondeur. */
function extraireNomsTags(brut: StructureTagsBrute): string[] {
  const noms = new Set<string>()
  function visiterPortee(portee: unknown): void {
    if (portee === null || typeof portee !== 'object') return
    for (const [cle, valeur] of Object.entries(portee as Record<string, unknown>)) {
      noms.add(cle)
      visiterPortee(valeur)
    }
  }
  if (brut.document) visiterPortee(brut.document.tags)
  for (const en_tete of brut.headers) visiterPortee(en_tete.tags)
  for (const pied_de_page of brut.footers) visiterPortee(pied_de_page.tags)
  return Array.from(noms)
}
