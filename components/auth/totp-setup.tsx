'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Smartphone, Copy, Check, AlertCircle, Shield } from 'lucide-react'
import { generateTotp, verifyTotp, getTotpUri } from '@/lib/crypto'
import { QRCodeSVG } from 'qrcode.react'

interface TotpSetupProps {
  secret: string
  onComplete: () => void
}

export function TotpSetup({ secret, onComplete }: TotpSetupProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [currentCode, setCurrentCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const totpUri = getTotpUri(secret, 'user@cryptovault', 'CryptoVault')

  useEffect(() => {
    async function updateCode() {
      const code = await generateTotp(secret)
      setCurrentCode(code)
    }
    
    updateCode()
    const interval = setInterval(updateCode, 1000)
    return () => clearInterval(interval)
  }, [secret])

  async function handleCopySecret() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsVerifying(true)

    const isValid = await verifyTotp(secret, verificationCode)
    
    if (isValid) {
      onComplete()
    } else {
      setError('Invalid code. Please try again.')
    }
    
    setIsVerifying(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">Set Up 2FA</h1>
          <p className="text-muted-foreground mt-1">
            Scan this QR code with your authenticator app
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-card border border-border rounded-xl">
            <QRCodeSVG
              value={totpUri}
              size={180}
              level="M"
              className="rounded-lg"
              bgColor="transparent"
              fgColor="currentColor"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Or enter this secret manually
          </Label>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-sm break-all">
              {secret}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopySecret}
              className="shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Current code:</div>
          <div className="font-mono text-lg font-semibold tracking-widest">
            {currentCode}
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verificationCode">Enter code to verify</Label>
            <Input
              id="verificationCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center tracking-widest font-mono text-lg"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isVerifying || verificationCode.length !== 6}
          >
            {isVerifying ? 'Verifying...' : 'Complete Setup'}
          </Button>
        </form>

        <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50">
          <Shield className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Save your secret key in a secure location. You will need it to recover access if you lose your device.
          </p>
        </div>
      </div>
    </div>
  )
}
