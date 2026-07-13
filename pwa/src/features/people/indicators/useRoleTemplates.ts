import { useQuery } from '@tanstack/react-query'

import { client } from '../../../lib/api'
import type { PersonRole } from '../../../lib/domain'
import {
  getTemplateForRole,
  type RoleTemplate,
  type TemplateIndicator,
} from './roleTemplates'

export const useRoleTemplate = (role: PersonRole | undefined) => {
  return useQuery({
    enabled: Boolean(role),
    queryKey: ['roleTemplate', role],
    queryFn: async (): Promise<RoleTemplate> => {
      try {
        const result = await client.models.RoleTemplate.list({
          filter: { role: { eq: role! } },
        })

        const remote = result.data?.[0]

        if (remote?.indicatorsJson) {
          return {
            role: role!,
            label: remote.label,
            indicators: remote.indicatorsJson as unknown as TemplateIndicator[],
          }
        }
      } catch {
        // Fall through to local template
      }

      return getTemplateForRole(role!)
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
