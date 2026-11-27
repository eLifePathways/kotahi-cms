import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { KotahiGroup } from '@shared/schema'
import { useToast } from '@/hooks/use-toast'
import { useFetchKotahiGroups } from '@/hooks/use-kotahi-groups'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type KotahiConnection = {
  endpoint: string
  apiKey: string
  kotahiGroupId: string
  // Of the chosen group, once its Kotahi has been checked: the default slug.
  kotahiGroupName?: string | null
}

export const emptyKotahiConnection: KotahiConnection = {
  endpoint: '',
  apiKey: '',
  kotahiGroupId: '',
}

// The connection as the create and update procedures take it.
export const toKotahiInput = ({
  apiKey,
  endpoint,
  kotahiGroupId,
}: KotahiConnection) => ({
  endpoint: endpoint.trim(),
  apiKey: apiKey.trim() || null,
  kotahiGroupId,
})

/**
 * The Kotahi GraphQL endpoint and API key, a Check button that lists that
 * Kotahi's groups, and a choice of the group to publish from.
 */
export const KotahiConnectionFields = ({
  idPrefix,
  value,
  onChange,
  loadGroupsOnMount = false,
}: {
  idPrefix: string
  value: KotahiConnection
  onChange: (value: KotahiConnection) => void
  // For a saved connection: list its groups straight away.
  loadGroupsOnMount?: boolean
}) => {
  const { toast } = useToast()
  const fetchKotahiGroups = useFetchKotahiGroups()
  const [kotahiGroups, setKotahiGroups] = useState<KotahiGroup[] | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const loadGroups = async ({ quiet = false } = {}) => {
    setIsChecking(true)

    try {
      setKotahiGroups(
        await fetchKotahiGroups(value.endpoint.trim(), value.apiKey.trim()),
      )
    } catch (error) {
      setKotahiGroups(null)

      if (!quiet) {
        toast({
          title: "Couldn't reach Kotahi",
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    if (loadGroupsOnMount && value.endpoint) loadGroups({ quiet: true })
    // Only once, for the connection the form opened with.
  }, [])

  return (
    <fieldset className="space-y-4 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">Kotahi</legend>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-endpoint`}>GraphQL endpoint URL *</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-endpoint`}
            value={value.endpoint}
            onChange={e => {
              // Another Kotahi has other groups.
              setKotahiGroups(null)
              onChange({
                ...value,
                endpoint: e.target.value,
                kotahiGroupId: '',
                kotahiGroupName: undefined,
              })
            }}
            placeholder="https://kotahi.example.org/graphql"
            required
          />
          <Button
            type="button"
            variant="outline"
            disabled={isChecking || !value.endpoint.trim()}
            onClick={() => loadGroups()}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Check'
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Check the endpoint to choose one of its groups.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-api-key`}>API key (optional)</Label>
        <Input
          id={`${idPrefix}-api-key`}
          type="password"
          value={value.apiKey}
          onChange={e => onChange({ ...value, apiKey: e.target.value })}
          autoComplete="off"
        />
      </div>

      {kotahiGroups && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-kotahi-group`}>Kotahi group *</Label>
          {kotahiGroups.length ? (
            <Select
              value={value.kotahiGroupId}
              onValueChange={kotahiGroupId =>
                onChange({
                  ...value,
                  kotahiGroupId,
                  kotahiGroupName: kotahiGroups.find(
                    kotahiGroup => kotahiGroup.id === kotahiGroupId,
                  )?.name,
                })
              }
            >
              <SelectTrigger id={`${idPrefix}-kotahi-group`}>
                <SelectValue placeholder="Select a group..." />
              </SelectTrigger>
              <SelectContent>
                {kotahiGroups.map(kotahiGroup => (
                  <SelectItem key={kotahiGroup.id} value={kotahiGroup.id}>
                    {kotahiGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              This Kotahi has no groups.
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}
