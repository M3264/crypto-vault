import type { EncryptedVault, VaultData } from './types'

const VAULT_VERSION = 1
const PBKDF2_ITERATIONS = 600000 // OWASP recommended minimum
const SALT_LENGTH = 32
const IV_LENGTH = 12

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Generate cryptographically secure random bytes
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

// Derive encryption key from password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Generate SHA-256 checksum
async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  return bufferToBase64(hashBuffer)
}

// Encrypt vault data
export async function encryptVault(
  data: VaultData,
  password: string
): Promise<EncryptedVault> {
  const salt = generateRandomBytes(SALT_LENGTH)
  const iv = generateRandomBytes(IV_LENGTH)
  const key = await deriveKey(password, salt)
  
  const encoder = new TextEncoder()
  const jsonData = JSON.stringify(data)
  const dataBuffer = encoder.encode(jsonData)
  
  // Encrypt using AES-GCM
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  )
  
  const encryptedBase64 = bufferToBase64(encryptedBuffer)
  const checksum = await generateChecksum(jsonData)
  
  return {
    version: VAULT_VERSION,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    data: encryptedBase64,
    checksum
  }
}

// Decrypt vault data
export async function decryptVault(
  vault: EncryptedVault,
  password: string
): Promise<VaultData> {
  const salt = new Uint8Array(base64ToBuffer(vault.salt))
  const iv = new Uint8Array(base64ToBuffer(vault.iv))
  const encryptedData = base64ToBuffer(vault.data)
  
  const key = await deriveKey(password, salt)
  
  try {
    // Decrypt using AES-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    )
    
    const decoder = new TextDecoder()
    const jsonData = decoder.decode(decryptedBuffer)
    
    // Verify checksum
    const checksum = await generateChecksum(jsonData)
    if (checksum !== vault.checksum) {
      throw new Error('Data integrity check failed')
    }
    
    return JSON.parse(jsonData) as VaultData
  } catch {
    throw new Error('Decryption failed. Invalid password or corrupted data.')
  }
}

// Verify password without full decryption
export async function verifyPassword(
  vault: EncryptedVault,
  password: string
): Promise<boolean> {
  try {
    await decryptVault(vault, password)
    return true
  } catch {
    return false
  }
}

// Generate a secure random ID
export function generateId(): string {
  const bytes = generateRandomBytes(16)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// TOTP implementation for 2FA
const TOTP_PERIOD = 30
const TOTP_DIGITS = 6

// Generate a random TOTP secret (Base32 encoded)
export function generateTotpSecret(): string {
  const bytes = generateRandomBytes(20)
  return base32Encode(bytes)
}

// Base32 encoding
function base32Encode(buffer: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let bits = 0
  let value = 0
  
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }
  
  return result
}

// Base32 decoding
function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '')
  
  let bits = 0
  let value = 0
  const output: number[] = []
  
  for (let i = 0; i < cleanStr.length; i++) {
    const idx = alphabet.indexOf(cleanStr[i])
    if (idx === -1) continue
    
    value = (value << 5) | idx
    bits += 5
    
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  
  return new Uint8Array(output)
}

// Generate TOTP code
export async function generateTotp(secret: string, time?: number): Promise<string> {
  const counter = Math.floor((time || Date.now()) / 1000 / TOTP_PERIOD)
  const secretBytes = base32Decode(secret)
  
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = new ArrayBuffer(8)
  const counterView = new DataView(counterBuffer)
  counterView.setBigUint64(0, BigInt(counter), false)
  
  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  
  // Generate HMAC
  const hmac = await crypto.subtle.sign('HMAC', key, counterBuffer)
  const hmacBytes = new Uint8Array(hmac)
  
  // Dynamic truncation
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f
  const code = (
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_DIGITS)
  
  return code.toString().padStart(TOTP_DIGITS, '0')
}

// Verify TOTP code (allows 1 period drift)
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const now = Date.now()
  
  // Check current and adjacent time periods
  for (const offset of [0, -TOTP_PERIOD * 1000, TOTP_PERIOD * 1000]) {
    const expected = await generateTotp(secret, now + offset)
    if (expected === code) {
      return true
    }
  }
  
  return false
}

// Generate TOTP URI for QR codes
export function getTotpUri(secret: string, accountName: string, issuer: string = 'CryptoVault'): string {
  const encodedAccount = encodeURIComponent(accountName)
  const encodedIssuer = encodeURIComponent(issuer)
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`
}
