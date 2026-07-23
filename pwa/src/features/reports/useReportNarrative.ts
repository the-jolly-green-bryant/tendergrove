import { useEffect, useMemo, useState } from 'react'

import { client } from '../../lib/api'
import type { buildProviderReport } from './reportBuilder'
import {
  buildNarrativeEnvelope,
  canonicalNarrativeFacts,
  fallbackNarrative,
  hashNarrativeFacts,
  renderNarrative,
  REPORT_NARRATIVE_SCHEMA_VERSION,
} from './reportNarrative'

type ProviderReport = ReturnType<typeof buildProviderReport>

export const useReportNarrative = (personId: string | undefined, report: ProviderReport | null) => {
  const envelope = useMemo(() => report ? buildNarrativeEnvelope(report) : null, [report])
  const factsJson = useMemo(() => envelope ? canonicalNarrativeFacts(envelope) : '', [envelope])
  const fallback = useMemo(() => envelope ? fallbackNarrative(envelope) : '', [envelope])
  const [state, setState] = useState<{ key: string; text: string; pending: boolean }>({ key: '', text: fallback, pending: false })

  useEffect(() => {
    if (!personId || !envelope || envelope.facts.length < 2) {
      setState({ key: factsJson, text: fallback, pending: false })
      return
    }
    let active = true
    setState({ key: factsJson, text: fallback, pending: true })
    const resolve = async () => {
      try {
        const factsHash = await hashNarrativeFacts(factsJson)
        const cached = await client.models.ReportNarrative.list({
          filter: { personId: { eq: personId }, factsHash: { eq: factsHash } },
          limit: 1,
        })
        const cachedTemplate = cached.data[0]?.narrative
        if (cachedTemplate) {
          if (active) setState({ key: factsJson, text: renderNarrative(cachedTemplate, envelope), pending: false })
          return
        }
        const generated = await client.queries.generateReportNarrative({ factsJson, factsHash })
        if (generated.errors?.length || !generated.data) throw new Error('Narrative generation failed')
        await client.models.ReportNarrative.create({
          personId,
          factsHash,
          schemaVersion: REPORT_NARRATIVE_SCHEMA_VERSION,
          narrative: generated.data,
          model: 'us.amazon.nova-micro-v1:0',
        })
        if (active) setState({ key: factsJson, text: renderNarrative(generated.data, envelope), pending: false })
      } catch {
        if (active) setState({ key: factsJson, text: fallback, pending: false })
      }
    }
    void resolve()
    return () => { active = false }
  }, [envelope, factsJson, fallback, personId])

  return {
    text: state.key === factsJson ? state.text : fallback,
    pending: state.key === factsJson && state.pending,
  }
}
