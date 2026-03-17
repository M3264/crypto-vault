export interface KeyEntry {
  id: string
  label: string
  type: 'private_key' | 'public_key' | 'address' | 'seed_phrase' | 'api_key' | 'other'
  value: string // This will be encrypted
  network?: string
  notes?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export interface EncryptedVault {
  version: number
  salt: string // Base64 encoded salt for PBKDF2
  iv: string // Base64 encoded IV for AES-GCM
  data: string // Base64 encoded encrypted data
  checksum: string // For integrity verification
}

export interface VaultData {
  keys: KeyEntry[]
  settings: VaultSettings
  totpSecret?: string // For 2FA
}

export interface VaultSettings {
  autoLockMinutes: number
  requireTotpOnUnlock: boolean
  theme: 'dark' | 'light' | 'system'
}

export interface AuthState {
  isAuthenticated: boolean
  isSetup: boolean
  hasTotpEnabled: boolean
  lastActivity: number
}

export const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 5,
  requireTotpOnUnlock: false,
  theme: 'dark'
}

export const KEY_TYPES = [
  { value: 'private_key', label: 'Private Key' },
  { value: 'public_key', label: 'Public Key' },
  { value: 'address', label: 'Wallet Address' },
  { value: 'seed_phrase', label: 'Seed Phrase' },
  { value: 'api_key', label: 'API Key' },
  { value: 'other', label: 'Other' }
] as const

export const NETWORKS = [
  'Ethereum',
  'Bitcoin',
  'Solana',
  'Polygon',
  'Canton',
  'Arbitrum',
  'Optimism',
  'Avalanche',
  'BNB Chain',
  'Base',
  'Other'
] as const
