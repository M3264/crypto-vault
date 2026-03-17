'use client'

import { useState } from 'react'
import { useVault } from '@/lib/vault-context'
import type { KeyEntry } from '@/lib/types'
import { KEY_TYPES, NETWORKS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, Tag, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface KeyFormProps {
  initialData?: KeyEntry
  onSuccess: () => void
}

export function KeyForm({ initialData, onSuccess }: KeyFormProps) {
  const { addKey, updateKey } = useVault()
  const [isLoading, setIsLoading] = useState(false)
  const [showValue, setShowValue] = useState(false)
  const [newTag, setNewTag] = useState('')

  const [formData, setFormData] = useState({
    label: initialData?.label || '',
    type: initialData?.type || 'private_key',
    value: initialData?.value || '',
    network: initialData?.network || '',
    notes: initialData?.notes || '',
    tags: initialData?.tags || [] as string[],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (initialData) {
        await updateKey(initialData.id, formData)
      } else {
        await addKey({
          ...formData,
          type: formData.type as KeyEntry['type'],
        })
      }
      onSuccess()
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddTag() {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  function handleRemoveTag(tag: string) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="label">Label *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
          placeholder="e.g., Main ETH Wallet"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {KEY_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="network">Network</Label>
          <Select
            value={formData.network}
            onValueChange={(value) => setFormData(prev => ({ ...prev, network: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {NETWORKS.map(network => (
                <SelectItem key={network} value={network}>
                  {network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">
          {formData.type === 'seed_phrase' ? 'Seed Phrase *' : 'Key / Address *'}
        </Label>
        <div className="relative">
          {formData.type === 'seed_phrase' ? (
            <Textarea
              id="value"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Enter your seed phrase (space-separated words)"
              className={`font-mono pr-10 min-h-[100px] ${showValue ? '' : 'text-security'}`}
              style={!showValue ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : {}}
              required
            />
          ) : (
            <Input
              id="value"
              type={showValue ? 'text' : 'password'}
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder="Enter your key or address"
              className="font-mono pr-10"
              required
            />
          )}
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          This value will be encrypted and stored securely
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              placeholder="Add a tag"
              className="pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={handleAddTag}>
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any additional notes or context..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Key'}
        </Button>
      </div>
    </form>
  )
}
