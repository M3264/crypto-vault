'use client'

import { useState } from 'react'
import { useVault } from '@/lib/vault-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Eye, EyeOff, Lock, AlertCircle, Smartphone } from 'lucide-react'

interface UnlockFormProps {
  onUnlock?: () => void
}

export function UnlockForm({ onUnlock }: UnlockFormProps) {
  const { unlock, error, authState } = useVault()
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [needsTotp, setNeedsTotp] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    
    const success = await unlock(password, totpCode || undefined)
    
    if (!success && authState.hasTotpEnabled && !totpCode) {
      setNeedsTotp(true)
    }
    
    setIsLoading(false)
    
    if (success) {
      onUnlock?.()
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
          <Shield className="w-8 h-8 text-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Unlock Vault</h1>
          <p className="text-muted-foreground mt-1">
            Enter your master password to access your keys
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
              placeholder="Enter your password"
              className="pl-10 pr-10"
              autoFocus
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
        </div>

        {needsTotp && (
          <div className="space-y-2">
            <Label htmlFor="totpCode">Two-Factor Code</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="totpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="pl-10 tracking-widest font-mono"
                autoFocus
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the code from your authenticator app
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !password || (needsTotp && totpCode.length !== 6)}
        >
          {isLoading ? 'Unlocking...' : 'Unlock Vault'}
        </Button>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Your vault is encrypted locally with AES-256-GCM encryption
          </p>
        </div>
      </form>
    </div>
  )
}
