/**
 * Typage minimal du binding R2 — même discipline que `d1Types.ts` : écrit à
 * la main plutôt que d'ajouter `@cloudflare/workers-types`, seule une
 * poignée de méthodes est réellement utilisée (`put`/`get`/`delete`).
 */
export interface R2Object {
  arrayBuffer(): Promise<ArrayBuffer>
  customMetadata?: Record<string, string>
}

export interface R2PutOptions {
  customMetadata?: Record<string, string>
}

export interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: R2PutOptions): Promise<unknown>
  get(key: string): Promise<R2Object | null>
  delete(key: string): Promise<void>
}
