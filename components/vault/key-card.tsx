'use client'

import { useState } from 'react'
import type { KeyEntry } from '@/lib/types'
import { KEY_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  const Icon = typeIcons[entry.type] || Key
  const typeLabel = KEY_TYPES.find(t => t.value === entry.type)?.label || 'Other'

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function maskValue(value: string): string {
    if (value.length <= 12) {
      return '*'.repeat(value.length)
    }
    return value.slice(0, 6) + '...' + '*'.repeat(6)
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
                  <Badge variant="secondary" className="text-xs">
                    {typeLabel}
                  </Badge>
                  {entry.network && (
                    <Badge variant="outline" className="text-xs">
                      {entry.network}
                    </Badge>
                  )}
                  {entry.tags?.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy}>
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
                {isRevealed ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Notes and Metadata */}
            {entry.notes && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {entry.notes}
              </p>
            )}

            <div className="mt-2 text-xs text-muted-foreground">
              Created {formatDate(entry.createdAt)}
              {entry.updatedAt !== entry.createdAt && (
                <> &middot; Updated {formatDate(entry.updatedAt)}</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entry.label}"? This action cannot be undone.
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
