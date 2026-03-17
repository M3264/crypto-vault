/**
 * google-drive.ts
 *
 * Thin wrapper around the Google Drive REST API v3.
 * Stores the encrypted vault as a single JSON file named `crypto_vault.enc`
 * in the user's app-specific Drive folder (appDataFolder scope).
 *
 * Requires the OAuth access token obtained via Google Sign-In.
 */

const VAULT_FILE_NAME = 'crypto_vault.enc'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

// ─── helpers ────────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function findVaultFile(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${VAULT_FILE_NAME}'`,
    fields: 'files(id)',
    pageSize: '1',
  })

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: authHeader(token),
  })

  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const json = await res.json()
  return json.files?.[0]?.id ?? null
}

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Load the encrypted vault JSON string from Drive.
 * Returns null if no vault file exists yet.
 */
export async function loadVaultFromDrive(token: string): Promise<string | null> {
  const fileId = await findVaultFile(token)
  if (!fileId) return null

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeader(token),
  })

  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`)
  return res.text()
}

/**
 * Save (create or update) the encrypted vault JSON string to Drive.
 */
export async function saveVaultToDrive(token: string, data: string): Promise<void> {
  const existingId = await findVaultFile(token)
  const blob = new Blob([data], { type: 'application/json' })

  if (existingId) {
    // PATCH — update existing file content
    const res = await fetch(`${DRIVE_UPLOAD_API}/files/${existingId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      body: blob,
    })
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`)
  } else {
    // POST — create new file in appDataFolder
    const meta = JSON.stringify({ name: VAULT_FILE_NAME, parents: ['appDataFolder'] })
    const form = new FormData()
    form.append('metadata', new Blob([meta], { type: 'application/json' }))
    form.append('file', blob)

    const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: authHeader(token),
      body: form,
    })
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`)
  }
}

/**
 * Permanently delete the vault file from Drive.
 */
export async function deleteVaultFromDrive(token: string): Promise<void> {
  const fileId = await findVaultFile(token)
  if (!fileId) return

  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete failed: ${res.status}`)
}
