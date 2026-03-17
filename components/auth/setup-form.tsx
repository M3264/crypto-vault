'use client'

/**
 * setup-form.tsx  (updated)
 *
 * Now shows the signed-in Google user at the top and a sign-out option.
 * The vault setup flow itself is unchanged.
 */

import { useState } from 'react'
import { useVault } from '@/lib/vault-context'
import { useGoogleAuth } from '@/lib/google-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Eye, EyeOff, Lock, AlertCircle, Check, LogOut } from 'lucide-react'
import { TotpSetup } from './totp-setup'

interface SetupFormProps {
  onComplete?: () => void
}

export function SetupForm({ onComplete }: SetupFormProps) {
  const { setupVault, error } = useVault()
  const { user, signOut } = useGoogleAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [enableTotp, setEnableTotp] = useState(true)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const strength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)

    if (password !== confirmPassword) { setLocalError('Passwords do not match'); return }
    if (strength.score < 3) { setLocalError('Please choose a stronger password'); return }

    setIsLoading(true)
    const secret = await setupVault(password, enableTotp)
    setIsLoading(false)

    if (enableTotp && secret) {
      setTotpSecret(secret)
    } else if (!enableTotp) {
      onComplete?.()
    }
  }

  if (totpSecret) {
    return <TotpSetup secret={totpSecret} onComplete={() => onComplete?.()} />
  }

  return (
    <div className="w-full max-w-md mx-auto">

      {/* Google account badge */}
      {user && (
        <div className="flex items-center justify-between mb-6 px-3 py-2 rounded-xl bg-accent/50 border border-border">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.picture} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
            <span className="text-sm text-foreground font-medium">{user.email}</span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
          <Shield className="w-8 h-8 text-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Create Your Vault</h1>
          <p className="text-muted-foreground mt-1">
            Set up a master password to encrypt your keys
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password">Master Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password"
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((l) => (
                  <div
                    key={l}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      l <= strength.score ? strength.color : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${strength.textColor}`}>{strength.label}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="pl-10 pr-10"
              required
            />
            {confirmPassword.length > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {passwordsMatch
                  ? <Check className="w-4 h-4 text-emerald-500" />
                  : <AlertCircle className="w-4 h-4 text-destructive" />}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50 border border-border">
          <Checkbox
            id="enableTotp"
            checked={enableTotp}
            onCheckedChange={(c) => setEnableTotp(c as boolean)}
          />
          <div className="space-y-1">
            <Label htmlFor="enableTotp" className="cursor-pointer font-medium">
              Enable Two-Factor Authentication
            </Label>
            <p className="text-xs text-muted-foreground">
              Add an extra layer of security with TOTP-based 2FA
            </p>
          </div>
        </div>

        {(localError || error) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {localError || error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !passwordsMatch || strength.score < 3}
        >
          {isLoading ? 'Creating Vault…' : 'Create Secure Vault'}
        </Button>

        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <p className="text-xs font-medium text-foreground">Security Notice</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>Your master password cannot be recovered if lost</li>
            <li>All data is encrypted locally using AES-256-GCM</li>
            <li>The encrypted file is stored in your own Google Drive</li>
          </ul>
        </div>
      </form>
    </div>
  )
}

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const levels = [
    { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-500' },
    { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-500' },
    { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    { label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  ]

  return { score, ...levels[Math.min(score, levels.length - 1)] }
}
