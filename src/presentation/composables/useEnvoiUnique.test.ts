import { describe, expect, test } from 'vitest'
import { useEnvoiUnique } from './useEnvoiUnique'

describe('useEnvoiUnique (audit M2)', () => {
  test('deux appels simultanés : une seule exécution', async () => {
    const { enCours, executer } = useEnvoiUnique()
    let executions = 0
    let terminer: () => void = () => {}
    const action = () =>
      new Promise<void>((resolve) => {
        executions++
        terminer = resolve
      })
    const premier = executer(action)
    const second = executer(action)
    expect(enCours.value).toBe(true)
    terminer()
    await Promise.all([premier, second])
    expect(executions).toBe(1)
    expect(enCours.value).toBe(false)
  })

  test("l'erreur remonte et libère le verrou", async () => {
    const { enCours, executer } = useEnvoiUnique()
    await expect(executer(() => Promise.reject(new Error('refus')))).rejects.toThrow('refus')
    expect(enCours.value).toBe(false)
  })
})
