'use client'

import { useVault } from '@/lib/vault-context'
import { useGoogleAuth } from '@/lib/google-auth-context'
import { SetupForm } from '@/components/auth/setup-form'
import { UnlockForm } from '@/components/auth/unlock-form'
import { Dashboard } from '@/components/vault/dashboard'
import { GoogleSignInScreen } from '@/components/auth/google-sign-in-screen'
import { Spinner } from '@/components/ui/spinner'
import { Shield, Lock, Key, Fingerprint } from 'lucide-react'

function VaultApp() {
  const { authState, isLoading: vaultLoading } = useVault()
  const { user, isLoading: authLoading } = useGoogleAuth()
  if (!user) {
    return <GoogleSignInScreen />
  }
  if (authLoading || vaultLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-muted-foreground">Loading vault...</p>
        </div>
      </div>
    )
  }
  if (authState.isAuthenticated) {
    return <Dashboard />
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left side — Branding */}
          <div className="hidden lg:block">
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <Shield className="w-6 h-6 text-foreground" />
                </div>
                <span className="text-2xl font-semibold">CryptoVault</span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight mb-4 text-balance">
                Secure storage for your crypto keys
              </h1>

              <p className="text-lg text-muted-foreground mb-8">
                Keep your private keys, wallet addresses, and seed phrases safe with encryption. Your vault is synced to your own Google Drive.
              </p>

              <div className="space-y-4">
                <Feature
                  icon={<Lock className="w-5 h-5" />}
                  title="AES-256-GCM Encryption"
                  description="Your data is encrypted using the same standard trusted by banks and governments"
                />
                <Feature
                  icon={<Key className="w-5 h-5" />}
                  title="Your Google Drive, Your Data"
                  description="The encrypted vault lives in your own Drive — we never touch your keys"
                />
                <Feature
                  icon={<Fingerprint className="w-5 h-5" />}
                  title="Two-Factor Authentication"
                  description="Add an extra layer of security with TOTP-based 2FA"
                />
              </div>
            </div>
          </div>

          {/* Right side — Auth forms */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              {/* Mobile branding */}
              <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Shield className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-xl font-semibold">CryptoVault</span>
              </div>

              <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card">
                {authState.isSetup ? (
                  <UnlockForm />
                ) : (
                  <SetupForm />
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground mt-6">
                Your vault is encrypted locally using PBKDF2 key derivation with 600,000 iterations
                and AES-256-GCM encryption. The encrypted file is stored in your own Google Drive.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export default function Page() {
  return <VaultApp />
}
