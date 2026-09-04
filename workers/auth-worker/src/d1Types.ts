/**
 * Typage minimal du binding D1 (TD-046) — écrit à la main plutôt que
 * d'ajouter `@cloudflare/workers-types` comme dépendance : seule une
 * poignée de méthodes est réellement utilisée (`prepare`/`bind`/`first`/
 * `all`/`run`), même discipline que le reste de ce Worker (aucune
 * dépendance qu'un besoin étroit et vérifiable ne justifie).
 */
export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
}

export interface D1PreparedStatement {
  bind(...valeurs: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<{ success: boolean }>
}

export interface D1Database {
  prepare(requete: string): D1PreparedStatement
}
