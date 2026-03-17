'use client'

/**
 * google-auth-context.tsx
 *
 * Provides Google OAuth state (access token, user profile) to the app.
 *
 * Setup:
 *   1. Create a Google Cloud project, enable the Drive API, and create an
 *      OAuth 2.0 Web client ID.
 *   2. Add your origin to "Authorized JavaScript origins" in Cloud Console.
 *   3. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local
 *
 * Scopes requested:
 *   - openid, email, profile  (for user identity)
 *   - https://www.googleapis.com/auth/drive.appdata  (hidden app folder in Drive)
 *
 * The drive.appdata scope gives the app its own isolated folder in Drive that
 * is invisible to the user's regular Drive UI — perfect for a vault file.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

// ─── types ───────────────────────────────────────────────────────────────────

export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
}

interface GoogleAuthContextType {
  user: GoogleUser | null
  accessToken: string | null
  isLoading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => void
}

// ─── context ─────────────────────────────────────────────────────────────────

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null)

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext)
  if (!ctx) throw new Error('useGoogleAuth must be used within GoogleAuthProvider')
  return ctx
}

// ─── GIS script loader ───────────────────────────────────────────────────────

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '527017263396-po264cp3994t0mqbbtij59hod4vorsbp.apps.googleusercontent.com'
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ')

let gisReady = false
let gisReadyCallbacks: (() => void)[] = []

function loadGisScript(): Promise<void> {
  return new Promise((resolve) => {
    if (gisReady) return resolve()
    gisReadyCallbacks.push(resolve)

    if (document.getElementById('google-gis-script')) return

    const script = document.createElement('script')
    script.id = 'google-gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      gisReady = true
      gisReadyCallbacks.forEach((cb) => cb())
      gisReadyCallbacks = []
    }
    document.head.appendChild(script)
  })
}

// ─── token cache (session-scoped) ────────────────────────────────────────────

const SESSION_KEY = 'gauth_token'
const SESSION_USER_KEY = 'gauth_user'
const SESSION_EXPIRY_KEY = 'gauth_expiry'

function readSession(): { token: string; user: GoogleUser; expiry: number } | null {
  try {
    const token = sessionStorage.getItem(SESSION_KEY)
    const user = sessionStorage.getItem(SESSION_USER_KEY)
    const expiry = Number(sessionStorage.getItem(SESSION_EXPIRY_KEY) ?? '0')
    if (token && user && Date.now() < expiry) {
      return { token, user: JSON.parse(user), expiry }
    }
  } catch {}
  return null
}

function writeSession(token: string, user: GoogleUser, expiresIn: number) {
  try {
    sessionStorage.setItem(SESSION_KEY, token)
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
    sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_USER_KEY)
    sessionStorage.removeItem(SESSION_EXPIRY_KEY)
  } catch {}
}

// ─── decode JWT id_token ──────────────────────────────────────────────────────

function decodeIdToken(jwt: string): GoogleUser | null {
  try {
    const [, payload] = jwt.split('.')
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      id: json.sub,
      email: json.email,
      name: json.name,
      picture: json.picture,
    }
  } catch {
    return null
  }
}

// ─── provider ────────────────────────────────────────────────────────────────

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore session on mount
  useEffect(() => {
    const session = readSession()
    if (session) {
      setAccessToken(session.token)
      setUser(session.user)
    }
    setIsLoading(false)
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      await loadGisScript()

      await new Promise<void>((resolve, reject) => {
        // Step 1: get an id_token via the Sign-In button flow
        const idClient = (window as any).google.accounts.oauth2.initCodeClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          ux_mode: 'popup',
          callback: () => {}, // unused; we use token flow instead
        })

        // Use the implicit/token flow to directly get an access token
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              reject(new Error(tokenResponse.error_description ?? tokenResponse.error))
              return
            }

            // Fetch user profile with the access token
            try {
              const profileRes = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
              )
              const profile = await profileRes.json()
              const googleUser: GoogleUser = {
                id: profile.sub,
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
              }

              setAccessToken(tokenResponse.access_token)
              setUser(googleUser)
              writeSession(tokenResponse.access_token, googleUser, tokenResponse.expires_in ?? 3600)
              resolve()
            } catch (err) {
              reject(err)
            }
          },
        })

        tokenClient.requestAccessToken({ prompt: 'consent' })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    const token = accessToken
    setUser(null)
    setAccessToken(null)
    clearSession()

    if (token && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      ;(window as any).google.accounts.oauth2.revoke(token, () => {})
    }
  }, [accessToken])

  return (
    <GoogleAuthContext.Provider value={{ user, accessToken, isLoading, error, signIn, signOut }}>
      {children}
    </GoogleAuthContext.Provider>
  )
}
