'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { VaultData, KeyEntry, AuthState, VaultSettings, EncryptedVault } from './types'
import { DEFAULT_SETTINGS } from './types'
import { encryptVault, decryptVault, generateId, generateTotpSecret, verifyTotp } from './crypto'
import { useGoogleAuth } from './google-auth-context'
import { loadVaultFromDrive, saveVaultToDrive, deleteVaultFromDrive } from './google-drive'

const AUTH_CHECK_INTERVAL = 10_000

// ─── context type ─────────────────────────────────────────────────────────────

interface VaultContextType {
  authState: AuthState
  isLoading: boolean
  error: string | null

  setupVault: (password: string, enableTotp?: boolean) => Promise<string | null>
  unlock: (password: string, totpCode?: string) => Promise<boolean>
  lock: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>

  enableTotp: (password: string) => Promise<string | null>
  disableTotp: (password: string, totpCode: string) => Promise<boolean>

  keys: KeyEntry[]
  addKey: (key: Omit<KeyEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateKey: (id: string, updates: Partial<Omit<KeyEntry, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteKey: (id: string) => Promise<void>

  settings: VaultSettings
  updateSettings: (updates: Partial<VaultSettings>) => Promise<void>

  exportVault: () => string | null
  importVault: (data: string, password: string) => Promise<boolean>
  deleteVault: () => Promise<void>
}

// Safe SSR default — all actions are no-ops until the client hydrates
const DEFAULT_CTX: VaultContextType = {
  authState: { isAuthenticated: false, isSetup: false, hasTotpEnabled: false, lastActivity: 0 },
  isLoading: true,
  error: null,
  setupVault: async () => null,
  unlock: async () => false,
  lock: () => {},
  changePassword: async () => false,
  enableTotp: async () => null,
  disableTotp: async () => false,
  keys: [],
  addKey: async () => {},
  updateKey: async () => {},
  deleteKey: async () => {},
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
  exportVault: () => null,
  importVault: async () => false,
  deleteVault: async () => {},
}

const VaultContext = createContext<VaultContextType>(DEFAULT_CTX)

export function useVault() {
  return useContext(VaultContext)
}

// ─── provider ────────────────────────────────────────────────────────────────

export function VaultProvider({ children }: { children: ReactNode }) {
  // accessToken is null on the server and until the user signs in
  const { accessToken } = useGoogleAuth()

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isSetup: false,
    hasTotpEnabled: false,
    lastActivity: Date.now(),
  })
  const [vaultData, setVaultData] = useState<VaultData | null>(null)
  const [encryptedVault, setEncryptedVault] = useState<EncryptedVault | null>(null)
  const [currentPassword, setCurrentPassword] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── load vault from Drive when user signs in ──────────────────────────────
  useEffect(() => {
    if (!accessToken) {
      // Signed out — reset
      setEncryptedVault(null)
      setVaultData(null)
      setCurrentPassword(null)
      setAuthState({ isAuthenticated: false, isSetup: false, hasTotpEnabled: false, lastActivity: Date.now() })
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    loadVaultFromDrive(accessToken)
      .then((raw) => {
        if (cancelled) return
        if (raw) {
          const vault = JSON.parse(raw) as EncryptedVault
          setEncryptedVault(vault)
          setAuthState((p) => ({ ...p, isSetup: true }))
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load vault from Google Drive')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [accessToken])

  // ── auto-lock on inactivity ───────────────────────────────────────────────
  useEffect(() => {
    if (!authState.isAuthenticated || !vaultData) return
    const check = () => {
      const idle = Date.now() - authState.lastActivity
      const limit = (vaultData.settings.autoLockMinutes ?? 5) * 60_000
      if (idle > limit) lock()
    }
    const id = setInterval(check, AUTH_CHECK_INTERVAL)
    return () => clearInterval(id)
  }, [authState.isAuthenticated, authState.lastActivity, vaultData])

  // ── track user activity ───────────────────────────────────────────────────
  useEffect(() => {
    if (!authState.isAuthenticated) return
    const bump = () => setAuthState((p) => ({ ...p, lastActivity: Date.now() }))
    window.addEventListener('mousemove', bump)
    window.addEventListener('keydown', bump)
    window.addEventListener('click', bump)
    return () => {
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('click', bump)
    }
  }, [authState.isAuthenticated])

  // ── internal save helper ──────────────────────────────────────────────────
  const saveVault = useCallback(async (data: VaultData, password: string) => {
    if (!accessToken) throw new Error('Not signed in to Google')
    const encrypted = await encryptVault(data, password)
    await saveVaultToDrive(accessToken, JSON.stringify(encrypted))
    setEncryptedVault(encrypted)
  }, [accessToken])

  // ── auth actions ──────────────────────────────────────────────────────────

  const setupVault = useCallback(async (password: string, enableTotp = false): Promise<string | null> => {
    setError(null)
    try {
      const totpSecret = enableTotp ? generateTotpSecret() : undefined
      const initialData: VaultData = { keys: [], settings: DEFAULT_SETTINGS, totpSecret }
      await saveVault(initialData, password)
      setVaultData(initialData)
      setCurrentPassword(password)
      setAuthState({ isAuthenticated: true, isSetup: true, hasTotpEnabled: enableTotp, lastActivity: Date.now() })
      return totpSecret ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      return null
    }
  }, [saveVault])

  const unlock = useCallback(async (password: string, totpCode?: string): Promise<boolean> => {
    setError(null)
    if (!encryptedVault) { setError('No vault found'); return false }
    try {
      const data = await decryptVault(encryptedVault, password)
      if (data.totpSecret && data.settings.requireTotpOnUnlock) {
        if (!totpCode) {
          setAuthState((p) => ({ ...p, hasTotpEnabled: true }))
          setError('2FA code required')
          return false
        }
        if (!(await verifyTotp(data.totpSecret, totpCode))) {
          setError('Invalid 2FA code')
          return false
        }
      }
      setVaultData(data)
      setCurrentPassword(password)
      setAuthState({ isAuthenticated: true, isSetup: true, hasTotpEnabled: !!data.totpSecret, lastActivity: Date.now() })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
      return false
    }
  }, [encryptedVault])

  const lock = useCallback(() => {
    setVaultData(null)
    setCurrentPassword(null)
    setAuthState((p) => ({ ...p, isAuthenticated: false, lastActivity: Date.now() }))
  }, [])

  const changePassword = useCallback(async (currentPw: string, newPassword: string): Promise<boolean> => {
    setError(null)
    if (!encryptedVault || !vaultData) return false
    try {
      await decryptVault(encryptedVault, currentPw)
      await saveVault(vaultData, newPassword)
      setCurrentPassword(newPassword)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed')
      return false
    }
  }, [encryptedVault, vaultData, saveVault])

  const enableTotp = useCallback(async (password: string): Promise<string | null> => {
    setError(null)
    if (!vaultData || !currentPassword) return null
    if (password !== currentPassword) { setError('Invalid password'); return null }
    try {
      const totpSecret = generateTotpSecret()
      const updated: VaultData = { ...vaultData, totpSecret, settings: { ...vaultData.settings, requireTotpOnUnlock: true } }
      await saveVault(updated, currentPassword)
      setVaultData(updated)
      setAuthState((p) => ({ ...p, hasTotpEnabled: true }))
      return totpSecret
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA')
      return null
    }
  }, [vaultData, currentPassword, saveVault])

  const disableTotp = useCallback(async (password: string, totpCode: string): Promise<boolean> => {
    setError(null)
    if (!vaultData || !currentPassword || !vaultData.totpSecret) return false
    if (password !== currentPassword) { setError('Invalid password'); return false }
    if (!(await verifyTotp(vaultData.totpSecret, totpCode))) { setError('Invalid 2FA code'); return false }
    try {
      const updated: VaultData = { ...vaultData, totpSecret: undefined, settings: { ...vaultData.settings, requireTotpOnUnlock: false } }
      await saveVault(updated, currentPassword)
      setVaultData(updated)
      setAuthState((p) => ({ ...p, hasTotpEnabled: false }))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
      return false
    }
  }, [vaultData, currentPassword, saveVault])

  // ── key management ────────────────────────────────────────────────────────

  const addKey = useCallback(async (key: Omit<KeyEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!vaultData || !currentPassword) return
    const now = new Date().toISOString()
    const newKey: KeyEntry = { ...key, id: generateId(), createdAt: now, updatedAt: now }
    const updated: VaultData = { ...vaultData, keys: [...vaultData.keys, newKey] }
    await saveVault(updated, currentPassword)
    setVaultData(updated)
    setAuthState((p) => ({ ...p, lastActivity: Date.now() }))
  }, [vaultData, currentPassword, saveVault])

  const updateKey = useCallback(async (id: string, updates: Partial<Omit<KeyEntry, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!vaultData || !currentPassword) return
    const updatedKeys = vaultData.keys.map((k) =>
      k.id === id ? { ...k, ...updates, updatedAt: new Date().toISOString() } : k
    )
    const updated: VaultData = { ...vaultData, keys: updatedKeys }
    await saveVault(updated, currentPassword)
    setVaultData(updated)
    setAuthState((p) => ({ ...p, lastActivity: Date.now() }))
  }, [vaultData, currentPassword, saveVault])

  const deleteKey = useCallback(async (id: string) => {
    if (!vaultData || !currentPassword) return
    const updated: VaultData = { ...vaultData, keys: vaultData.keys.filter((k) => k.id !== id) }
    await saveVault(updated, currentPassword)
    setVaultData(updated)
    setAuthState((p) => ({ ...p, lastActivity: Date.now() }))
  }, [vaultData, currentPassword, saveVault])

  // ── settings ──────────────────────────────────────────────────────────────

  const updateSettings = useCallback(async (updates: Partial<VaultSettings>) => {
    if (!vaultData || !currentPassword) return
    const updated: VaultData = { ...vaultData, settings: { ...vaultData.settings, ...updates } }
    await saveVault(updated, currentPassword)
    setVaultData(updated)
  }, [vaultData, currentPassword, saveVault])

  // ── export / import / delete ──────────────────────────────────────────────

  const exportVault = useCallback((): string | null => {
    if (!encryptedVault) return null
    return JSON.stringify(encryptedVault)
  }, [encryptedVault])

  const importVault = useCallback(async (data: string, password: string): Promise<boolean> => {
    setError(null)
    if (!accessToken) { setError('Not signed in'); return false }
    try {
      const vault = JSON.parse(data) as EncryptedVault
      const decrypted = await decryptVault(vault, password)
      await saveVaultToDrive(accessToken, data)
      setEncryptedVault(vault)
      setVaultData(decrypted)
      setCurrentPassword(password)
      setAuthState({ isAuthenticated: true, isSetup: true, hasTotpEnabled: !!decrypted.totpSecret, lastActivity: Date.now() })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      return false
    }
  }, [accessToken])

  const deleteVault = useCallback(async () => {
    if (accessToken) await deleteVaultFromDrive(accessToken).catch(() => {})
    setEncryptedVault(null)
    setVaultData(null)
    setCurrentPassword(null)
    setAuthState({ isAuthenticated: false, isSetup: false, hasTotpEnabled: false, lastActivity: Date.now() })
  }, [accessToken])

  return (
    <VaultContext.Provider
      value={{
        authState, isLoading, error,
        setupVault, unlock, lock, changePassword,
        enableTotp, disableTotp,
        keys: vaultData?.keys ?? [],
        addKey, updateKey, deleteKey,
        settings: vaultData?.settings ?? DEFAULT_SETTINGS,
        updateSettings,
        exportVault, importVault, deleteVault,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}
