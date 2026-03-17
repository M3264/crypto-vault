'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

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

const DEFAULT_CTX: GoogleAuthContextType = {
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
  signIn: async () => {},
  signOut: () => {},
}

const GoogleAuthContext = createContext<GoogleAuthContextType>(DEFAULT_CTX)

export function useGoogleAuth() {
  return useContext(GoogleAuthContext)
}

// ─── GIS loader ──────────────────────────────────────────────────────────────

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ')

let gisReady = false
let gisCallbacks: (() => void)[] = []

function loadGisScript(): Promise<void> {
  return new Promise((resolve) => {
    if (gisReady) return resolve()
    gisCallbacks.push(resolve)
    if (document.getElementById('google-gis-script')) return
    const s = document.createElement('script')
    s.id = 'google-gis-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => {
      gisReady = true
      gisCallbacks.forEach((cb) => cb())
      gisCallbacks = []
    }
    document.head.appendChild(s)
  })
}

// ─── session helpers ─────────────────────────────────────────────────────────

const SK_TOKEN = 'gauth_token'
const SK_USER = 'gauth_user'
const SK_EXPIRY = 'gauth_expiry'

function readSession() {
  try {
    const token = sessionStorage.getItem(SK_TOKEN)
    const user = sessionStorage.getItem(SK_USER)
    const expiry = Number(sessionStorage.getItem(SK_EXPIRY) ?? '0')
    if (token && user && Date.now() < expiry)
      return { token, user: JSON.parse(user) as GoogleUser }
  } catch {}
  return null
}

function writeSession(token: string, user: GoogleUser, expiresIn: number) {
  try {
    sessionStorage.setItem(SK_TOKEN, token)
    sessionStorage.setItem(SK_USER, JSON.stringify(user))
    sessionStorage.setItem(SK_EXPIRY, String(Date.now() + expiresIn * 1000))
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SK_TOKEN)
    sessionStorage.removeItem(SK_USER)
    sessionStorage.removeItem(SK_EXPIRY)
  } catch {}
}

// ─── provider ────────────────────────────────────────────────────────────────

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (resp: any) => {
            if (resp.error) {
              reject(new Error(resp.error_description ?? resp.error))
              return
            }
            try {
              const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              })
              const profile = await r.json()
              const googleUser: GoogleUser = {
                id: profile.sub,
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
              }
              setAccessToken(resp.access_token)
              setUser(googleUser)
              writeSession(resp.access_token, googleUser, resp.expires_in ?? 3600)
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
    if (token && (window as any).google?.accounts?.oauth2) {
      ;(window as any).google.accounts.oauth2.revoke(token, () => {})
    }
  }, [accessToken])

  return (
    <GoogleAuthContext.Provider value={{ user, accessToken, isLoading, error, signIn, signOut }}>
      {children}
    </GoogleAuthContext.Provider>
  )
}
