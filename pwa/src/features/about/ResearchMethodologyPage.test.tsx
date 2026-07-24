import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { appRoutes } from '../../app/AppShell'
import { calculatePatternDynamics } from '../patterns/analytics/patternDynamics'
import { PatternStrainReportSection } from '../reports/components/PatternStrainReportSection'
import { ResearchMethodologyContent } from './ResearchMethodologyPage'
import { researchReferences, RESEARCH_METHODOLOGY_PATH } from './researchReferences'

const markup = renderToStaticMarkup(<ResearchMethodologyContent />)

describe('Research & Methodology page', () => {
  it('is registered at the expected route', () => {
    expect(appRoutes.some((route) => route.path === RESEARCH_METHODOLOGY_PATH)).toBe(
      true,
    )
  })

  it('explains all four Pattern Strain dimensions and all five labels', () => {
    for (const dimension of [
      'Burden',
      'Instability',
      'Persistence',
      'Recovery difficulty',
    ]) {
      expect(markup).toContain(`>${dimension}<`)
    }
    for (const label of [
      'Low strain',
      'Emerging strain',
      'Elevated strain',
      'Sustained strain',
      'Intensive strain',
    ]) {
      expect(markup).toContain(`>${label}<`)
    }
  })

  it('qualifies the methodology without claiming clinical validation or care determination', () => {
    expect(markup).toContain('Descriptive, not diagnostic')
    expect(markup).not.toContain('Grove is clinically validated')
    expect(markup).not.toContain('Pattern Strain determines risk')
    expect(markup).not.toContain('Pattern Strain determines level of care')
  })

  it('renders structured references with identifiers and safe external links', () => {
    researchReferences.forEach((reference) => {
      expect(markup).toContain(reference.title)
      expect(markup).toContain(reference.pmid)
      expect(markup).toContain(reference.doi)
    })
    const externalLinks = [...markup.matchAll(/<a href="https:[^"]+"([^>]*)>/g)]
    expect(externalLinks.length).toBeGreaterThan(0)
    externalLinks.forEach(([, attributes]) => {
      expect(attributes).toContain('target="_blank"')
      expect(attributes).toContain('rel="noopener noreferrer"')
    })
  })

  it('uses semantic headings, lists, and an explicitly labelled qualification', () => {
    expect(markup).toContain('<h2')
    expect(markup).toContain('<h3')
    expect(markup).toContain('<ol')
    expect(markup).toContain('aria-label="Important qualification"')
  })

  it('is linked from the interactive Pattern Strain report section', () => {
    const reportMarkup = renderToStaticMarkup(
      <PatternStrainReportSection dynamics={calculatePatternDynamics([], [])} />,
    )
    expect(reportMarkup).toContain(`href="${RESEARCH_METHODOLOGY_PATH}"`)
    expect(reportMarkup).toContain('Learn about the research and methodology')
  })
})
