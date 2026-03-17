'use client'

import { GoogleAuthProvider } from '@/lib/google-auth-context'
import { VaultProvider } from '@/lib/vault-context'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GoogleAuthProvider>
      <VaultProvider>
        {children}
      </VaultProvider>
    </GoogleAuthProvider>
  )
}