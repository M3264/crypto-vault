'use client'

import { useState, useMemo } from 'react'
import { useVault } from '@/lib/vault-context'
import { KeyCard } from './key-card'
import { KeyForm } from './key-form'
import { Settings } from './settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Shield,
  Plus,
  Search,
  Lock,
  Settings as SettingsIcon,
  Key,
  Filter,
  MoreVertical,
  Download,
  Upload,
} from 'lucide-react'
import type { KeyEntry } from '@/lib/types'
import { KEY_TYPES } from '@/lib/types'

export function Dashboard() {
  const { keys, lock, exportVault, importVault, deleteKey } = useVault()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isAddingKey, setIsAddingKey] = useState(false)
  const [editingKey, setEditingKey] = useState<KeyEntry | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const filteredKeys = useMemo(() => {
    return keys.filter((key) => {
      const matchesSearch =
        key.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.network?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        key.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesType = typeFilter === 'all' || key.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [keys, searchQuery, typeFilter])

  async function handleExport() {
    const data = exportVault()
    if (data) {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crypto-vault-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        const password = prompt('Enter the password for this backup:')
        if (password) {
          const success = await importVault(text, password)
          if (!success) alert('Import failed. Please check the password and try again.')
        }
      }
    }
    input.click()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-foreground" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">CryptoVault</span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Backup
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImport}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Backup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <Settings onClose={() => setShowSettings(false)} />
              </SheetContent>
            </Sheet>

            <Button variant="outline" size="sm" onClick={lock}>
              <Lock className="w-4 h-4 mr-2" />
              Lock
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Keys" value={keys.length} icon={<Key className="w-4 h-4" />} />
          <StatCard label="Private Keys" value={keys.filter(k => k.type === 'private_key').length} icon={<Shield className="w-4 h-4" />} />
          <StatCard label="Addresses" value={keys.filter(k => k.type === 'address').length} icon={<Key className="w-4 h-4" />} />
          <StatCard label="Seed Phrases" value={keys.filter(k => k.type === 'seed_phrase').length} icon={<Key className="w-4 h-4" />} />
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search keys by label, notes, or network..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {KEY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAddingKey(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Key
            </Button>
          </div>
        </div>

        {/* Keys List */}
        {filteredKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Key className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">
              {keys.length === 0 ? 'No keys stored yet' : 'No keys found'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {keys.length === 0
                ? 'Add your first private key or wallet address'
                : 'Try adjusting your search or filters'}
            </p>
            {keys.length === 0 && (
              <Button onClick={() => setIsAddingKey(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Key
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredKeys.map((key) => (
              <KeyCard
                key={key.id}
                entry={key}
                onEdit={() => setEditingKey(key)}
                onDelete={() => deleteKey(key.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Key Dialog */}
      <Dialog open={isAddingKey} onOpenChange={setIsAddingKey}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Key</DialogTitle>
          </DialogHeader>
          <KeyForm onSuccess={() => setIsAddingKey(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Key Dialog */}
      <Dialog open={!!editingKey} onOpenChange={(open) => !open && setEditingKey(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Key</DialogTitle>
          </DialogHeader>
          {editingKey && (
            <KeyForm
              initialData={editingKey}
              onSuccess={() => setEditingKey(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* GitHub source link */}
        <a
          href="https://github.com/M3264/crypto-vault"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <GitHubIcon />
          View source on GitHub
        </a>
        
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}