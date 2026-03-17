'use client'

import { useState } from 'react'
import type { KeyEntry } from '@/lib/types'
import { KEY_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  Wallet,
  FileKey,
  Code,
  Hash,
  Shield,
  ExternalLink,
} from 'lucide-react'

interface KeyCardProps {
  entry: KeyEntry
  onEdit: () => void
  onDelete: () => void
}

const typeIcons: Record<string, typeof Key> = {
  private_key: Shield,
  public_key: Key,
  address: Wallet,
  seed_phrase: FileKey,
  api_key: Code,
  other: Hash,
}

export function KeyCard({ entry, onEdit, onDelete }: KeyCardProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)

  const Icon = typeIcons[entry.type] || Key
  const typeLabel = KEY_TYPES.find(t => t.value === entry.type)?.label || 'Other'

  async function handleCopy(value = entry.value) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function maskValue(value: string): string {
    if (value.length <= 12) return '*'.repeat(value.length)
    return value.slice(0, 6) + '...' + '*'.repeat(6)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <div className="group relative p-4 rounded-xl border border-border bg-card hover:border-muted-foreground/25 transition-colors">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-medium truncate">{entry.label}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
                  {entry.network && (
                    <Badge variant="outline" className="text-xs">{entry.network}</Badge>
                  )}
                  {entry.tags?.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Actions — always visible, not just on hover */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowViewDialog(true)}
                  title="View"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopy()}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Value
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Value Display */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
                <span className="break-all">
                  {isRevealed ? entry.value : maskValue(entry.value)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsRevealed(!isRevealed)}
                className="shrink-0"
              >
                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopy()}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Notes */}
            {entry.notes && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
            )}

            {/* Metadata */}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Added {formatDate(entry.createdAt)}</span>
              {entry.updatedAt !== entry.createdAt && (
                <span>Updated {formatDate(entry.updatedAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── View Dialog ─────────────────────────────────────────────────────── */}
      <ViewDialog
        entry={entry}
        open={showViewDialog}
        onClose={() => setShowViewDialog(false)}
        onEdit={() => { setShowViewDialog(false); onEdit() }}
      />

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{entry.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The key will be permanently removed from your vault.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── View Dialog ──────────────────────────────────────────────────────────────

function ViewDialog({
  entry,
  open,
  onClose,
  onEdit,
}: {
  entry: KeyEntry
  open: boolean
  onClose: () => void
  onEdit: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const Icon = typeIcons[entry.type] || Key
  const typeLabel = KEY_TYPES.find(t => t.value === entry.type)?.label || 'Other'

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Reset reveal state when dialog closes
  function handleOpenChange(open: boolean) {
    if (!open) { setRevealed(false); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-foreground" />
            </div>
            {entry.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Type + Network badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{typeLabel}</Badge>
            {entry.network && <Badge variant="outline">{entry.network}</Badge>}
            {entry.tags?.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {entry.type === 'seed_phrase' ? 'Seed Phrase' : 'Value'}
            </p>
            <div className="relative">
              <div className={`px-3 py-3 bg-muted rounded-lg font-mono text-sm break-all leading-relaxed ${
                entry.type === 'seed_phrase' ? 'min-h-[80px]' : ''
              }`}>
                {revealed
                  ? entry.value
                  : entry.type === 'seed_phrase'
                    ? '•'.repeat(Math.min(entry.value.length, 60))
                    : '•'.repeat(Math.min(entry.value.length, 32))}
              </div>
              <div className="flex gap-1 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setRevealed(!revealed)}
                >
                  {revealed ? (
                    <><EyeOff className="w-4 h-4 mr-2" /> Hide</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-2" /> Reveal</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2 text-emerald-500" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-1.5 pt-1 border-t border-border">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Created</span>
              <span>{formatDate(entry.createdAt)}</span>
            </div>
            {entry.updatedAt !== entry.createdAt && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last updated</span>
                <span>{formatDate(entry.updatedAt)}</span>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
