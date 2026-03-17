'use client'

import { useState } from 'react'
import { useVault } from '@/lib/vault-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Shield,
  Trash2,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Smartphone,
} from 'lucide-react'
import { TotpSetup } from '@/components/auth/totp-setup'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const {
    settings,
    updateSettings,
    authState,
    changePassword,
    enableTotp,
    disableTotp,
    deleteVault,
    error
  } = useVault()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [totpCode, setTotpCode] = useState('')
  const [totpPassword, setTotpPassword] = useState('')
  const [newTotpSecret, setNewTotpSecret] = useState<string | null>(null)
  const [isTogglingTotp, setIsTogglingTotp] = useState(false)
  const [totpError, setTotpError] = useState<string | null>(null)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return

    setIsChangingPassword(true)
    const success = await changePassword(currentPassword, newPassword)
    setIsChangingPassword(false)

    if (success) {
      setPasswordChangeSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordChangeSuccess(false), 3000)
    }
  }

  async function handleEnableTotp() {
    setTotpError(null)
    setIsTogglingTotp(true)
    const secret = await enableTotp(totpPassword)
    setIsTogglingTotp(false)

    if (secret) {
      setNewTotpSecret(secret)
      setTotpPassword('')
    } else {
      setTotpError('Failed to enable 2FA. Check your password.')
    }
  }

  async function handleDisableTotp() {
    setTotpError(null)
    setIsTogglingTotp(true)
    const success = await disableTotp(totpPassword, totpCode)
    setIsTogglingTotp(false)

    if (success) {
      setTotpPassword('')
      setTotpCode('')
    } else {
      setTotpError('Failed to disable 2FA. Check your password and code.')
    }
  }

  if (newTotpSecret) {
    return (
      <div className="py-6">
        <TotpSetup
          secret={newTotpSecret}
          onComplete={() => setNewTotpSecret(null)}
        />
      </div>
    )
  }

  return (
    <div className="py-6 space-y-8">
      {/* Auto-Lock Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Auto-Lock</h3>
        </div>
        <div className="space-y-2">
          <Label>Lock vault after inactivity</Label>
          <Select
            value={settings.autoLockMinutes.toString()}
            onValueChange={(value) => updateSettings({ autoLockMinutes: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 minute</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Two-Factor Authentication */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Two-Factor Authentication</h3>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {authState.hasTotpEnabled ? '2FA is enabled' : '2FA is disabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                {authState.hasTotpEnabled
                  ? 'Your vault requires a 2FA code to unlock'
                  : 'Add an extra layer of security to your vault'}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${authState.hasTotpEnabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
          </div>

          <div className="space-y-3">
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={totpPassword}
              onChange={(e) => setTotpPassword(e.target.value)}
              placeholder="Enter your password"
            />

            {authState.hasTotpEnabled && (
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 2FA code"
                className="font-mono"
              />
            )}

            {totpError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {totpError}
              </div>
            )}

            <Button
              variant={authState.hasTotpEnabled ? 'outline' : 'default'}
              className="w-full"
              onClick={authState.hasTotpEnabled ? handleDisableTotp : handleEnableTotp}
              disabled={isTogglingTotp || !totpPassword || (authState.hasTotpEnabled && totpCode.length !== 6)}
            >
              {isTogglingTotp
                ? 'Processing...'
                : authState.hasTotpEnabled
                  ? 'Disable 2FA'
                  : 'Enable 2FA'}
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Change Password */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Change Password</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="relative">
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {passwordChangeSuccess && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm">
              <Check className="w-4 h-4" />
              Password changed successfully
            </div>
          )}

          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
          >
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-destructive" />
          <h3 className="font-medium text-destructive">Danger Zone</h3>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Delete Vault
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vault</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All your stored keys and data will be permanently deleted.
                Make sure you have backed up any important information before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteVault()
                  onClose()
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Vault
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
