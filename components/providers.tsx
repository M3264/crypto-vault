/**
 * providers.tsx  (or your root layout)
 *
 * Wrap the app so both contexts are available.
 * GoogleAuthProvider must be the outer wrapper so VaultProvider can call useGoogleAuth().
 *
 * Usage in app/layout.tsx:
 *
 *   import { Providers } from '@/components/providers'
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="en">
 *         <body>
 *           <Providers>{children}</Providers>
 *         </body>
 *       </html>
 *     )
 *   }
 */

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


/**
 * Example page — shows the gate → setup/unlock → app flow.
 *
 * app/page.tsx  (simplified example)
 */

// 'use client'
//
// import { useGoogleAuth } from '@/lib/google-auth-context'
// import { useVault } from '@/lib/vault-context'
// import { GoogleSignInScreen } from '@/components/auth/google-sign-in-screen'
// import { SetupForm } from '@/components/auth/setup-form'
// import { UnlockForm } from '@/components/auth/unlock-form'
// import { VaultDashboard } from '@/components/vault/vault-dashboard'
//
// export default function Home() {
//   const { user } = useGoogleAuth()
//   const { authState, isLoading } = useVault()
//
//   if (!user) return <GoogleSignInScreen />
//   if (isLoading) return <LoadingSpinner />
//   if (!authState.isSetup) return <SetupForm />
//   if (!authState.isAuthenticated) return <UnlockForm />
//   return <VaultDashboard />
// }
