import { useEffect, useMemo, useState } from 'react'

import { client } from '../../lib/api'
import type { buildProviderReport } from './reportBuilder'
import {
  buildNarrativeEnvelope,
  canonicalNarrativeFacts,
  fallbackNarrative,
  hashNarrativeFacts,
  renderNarrative,
  renderNarrativeSections,
  REPORT_NARRATIVE_SCHEMA_VERSION,
} from './reportNarrative'

type ProviderReport = ReturnType<typeof buildProviderReport>

export const useReportNarrative = (
  personId: string | undefined,
  report: ProviderReport | null,
) => {
  const envelope = useMemo(
    () => (report ? buildNarrativeEnvelope(report) : null),
    [report],
  )
  const factsJson = useMemo(
    () => (envelope ? canonicalNarrativeFacts(envelope) : ''),
    [envelope],
  )
  const fallback = useMemo(
    () => (envelope ? fallbackNarrative(envelope) : ''),
    [envelope],
  )
  const fallbackSections = useMemo(
    () =>
      Object.fromEntries(
        (envelope?.facts ?? []).map((fact) => [fact.id, fact.replacement]),
      ),
    [envelope],
  )
  const [state, setState] = useState<{
    key: string
    text: string
    sections: Record<string, string>
    pending: boolean
    source: 'fallback' | 'cache' | 'nova'
  }>({
    key: '',
    text: fallback,
    sections: fallbackSections,
    pending: false,
    source: 'fallback',
  })

  useEffect(() => {
    if (!personId || !envelope || envelope.facts.length < 2) {
      setState({
        key: factsJson,
        text: fallback,
        sections: fallbackSections,
        pending: false,
        source: 'fallback',
      })
      return
    }
    let active = true
    setState({
      key: factsJson,
      text: fallback,
      sections: fallbackSections,
      pending: true,
      source: 'fallback',
    })
    const resolve = async () => {
      try {
        const factsHash = await hashNarrativeFacts(factsJson)
        const cached = await client.models.ReportNarrative.list({
          filter: { personId: { eq: personId }, factsHash: { eq: factsHash } },
          limit: 1,
        })
        const cachedTemplate = cached.data[0]?.narrative
        if (cachedTemplate) {
          if (active)
            setState({
              key: factsJson,
              text: renderNarrative(cachedTemplate, envelope)
                .split('\n')
                .slice(0, 4)
                .join('\n'),
              sections: renderNarrativeSections(cachedTemplate, envelope),
              pending: false,
              source: 'cache',
            })
          return
        }
        const generated = await client.queries.generateReportNarrative({
          factsJson,
          factsHash,
        })
        if (generated.errors?.length || !generated.data)
          throw new Error('Narrative generation failed')
        await client.models.ReportNarrative.create({
          personId,
          factsHash,
          schemaVersion: REPORT_NARRATIVE_SCHEMA_VERSION,
          narrative: generated.data,
          model: 'us.amazon.nova-micro-v1:0',
        })
        if (active)
          setState({
            key: factsJson,
            text: renderNarrative(generated.data, envelope)
              .split('\n')
              .slice(0, 4)
              .join('\n'),
            sections: renderNarrativeSections(generated.data, envelope),
            pending: false,
            source: 'nova',
          })
      } catch {
        if (active)
          setState({
            key: factsJson,
            text: fallback,
            sections: fallbackSections,
            pending: false,
            source: 'fallback',
          })
      }
    }
    void resolve()
    return () => {
      active = false
    }
  }, [envelope, factsJson, fallback, fallbackSections, personId])

  return {
    text: state.key === factsJson ? state.text : fallback,
    sections: state.key === factsJson ? state.sections : fallbackSections,
    pending: state.key === factsJson && state.pending,
    source: state.key === factsJson ? state.source : 'fallback',
  }
}
