import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

/**
 * Réponses IA affichées dans le chat expert — l'IA peut produire des
 * documents structurés (titres, tableaux, listes, code) plutôt qu'un
 * simple paragraphe de texte brut (demande explicite de l'utilisateur).
 * `marked` convertit le Markdown en HTML ; `DOMPurify` assainit ensuite ce
 * HTML avant tout `v-html` — le texte vient d'un fournisseur IA externe,
 * jamais une source de confiance à injecter telle quelle dans le DOM.
 */
export function rendreMarkdown(texte: string): string {
  const html = marked.parse(texte, { async: false })
  return DOMPurify.sanitize(html)
}
