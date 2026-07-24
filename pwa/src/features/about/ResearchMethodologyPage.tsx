import { IllustratedHeaderTitle, Page } from '../../components/Page'
import {
  PATTERN_STRAIN_LABELS,
  type PatternStrainBand,
} from '../patterns/analytics/patternDynamics'
import { ResearchConceptCard } from './components/ResearchConceptCard'
import { ResearchReferences } from './components/ResearchReferences'
import { Link, useHistory } from 'react-router-dom'
import { isGroveScoreOwner, useAppAuth } from '../../auth/AuthContext'
import { GROVE_SCORE_METHODOLOGY_PATH } from './GroveScoreMethodologyPage'

const strainDescriptions: Record<PatternStrainBand, string> = {
  low: 'Recent observations remain reasonably close to the person’s established pattern, with generally brief difficult periods and consistent recovery.',
  emerging:
    'Some recent changes are appearing, but the pattern is not yet consistently sustained.',
  elevated:
    'Multiple dimensions show a meaningful change from the person’s established pattern.',
  sustained:
    'Difficult observations are carrying across time, with reduced or slower recovery.',
  intensive:
    'The recorded period contains concentrated and persistent difficulty with limited recovery between episodes.',
}

export const ResearchMethodologyContent = ({
  showGroveScoreLink = false,
}: {
  readonly showGroveScoreLink?: boolean
}) => (
  <article className="research-methodology">
    <header className="research-methodology__intro">
      <p className="research-methodology__eyebrow">Research-informed methodology</p>
      <h2>How Grove applies longitudinal research to everyday observations</h2>
      <p>
        Grove is designed to help caregivers document patterns that can be difficult to
        remember or explain from isolated events. Instead of looking only at whether an
        individual day was easier or more difficult, Grove examines how recorded
        observations change over time.
      </p>
      <p>
        The Pattern Strain model is informed by research into longitudinal observation,
        ecological momentary assessment, emotional and behavioral dynamics, variability,
        instability, persistence, and recovery. Grove adapts these concepts to
        caregiver-recorded observations.
      </p>
      <aside
        className="research-methodology__qualification"
        aria-label="Important qualification"
      >
        <strong>Descriptive, not diagnostic.</strong>
        <p>
          Grove is not a diagnostic tool, validated clinical assessment, risk prediction
          system, or recommendation for a specific level of care. Its results should be
          considered alongside the individual’s history, circumstances, and professional
          evaluation.
        </p>
      </aside>
    </header>

    <section aria-labelledby="beyond-average">
      <h2 id="beyond-average">Why look beyond an average?</h2>
      <p>
        Two periods can have the same average wellness score while representing very
        different experiences. One may contain relatively consistent observations, while
        another alternates sharply between easier and more difficult days. Averages can
        also hide difficult periods that persist for several days or repeated downturns
        that begin before recovery is complete.
      </p>
      <p>
        Research on emotional and behavioral dynamics examines not only average levels,
        but also how experiences vary, change between observations, persist, and return
        toward an individual’s usual pattern.
      </p>
    </section>

    <section aria-labelledby="four-dimensions">
      <h2 id="four-dimensions">The four Pattern Strain dimensions</h2>
      <div className="research-concept-grid">
        <ResearchConceptCard
          id="burden"
          title="Burden"
          qualification="Because each person uses custom observations, burden represents recorded observation load, not universal symptom severity."
        >
          <p>
            Burden describes how concentrated recorded challenges are during a period.
            Grove considers how frequently challenges appear, how many appear together,
            and whether positive signs have become less available compared with the
            person’s established pattern.
          </p>
        </ResearchConceptCard>
        <ResearchConceptCard
          id="instability"
          title="Instability"
          qualification="Instability is not inherently harmful. Grove interprets it together with burden, persistence, and recovery."
        >
          <p>
            Instability describes how sharply observations change between recorded days.
            Larger or more frequent shifts can reveal a less predictable pattern that
            may be hidden by the average score.
          </p>
        </ResearchConceptCard>
        <ResearchConceptCard
          id="persistence"
          title="Persistence"
          qualification="Missing check-ins are not assumed to represent continued difficulty or recovery."
        >
          <p>
            Persistence describes whether difficult periods carry across multiple
            observations instead of resolving within the person’s usual timeframe. Grove
            looks at the length of difficult runs and how often a below-range
            observation is followed by another.
          </p>
        </ResearchConceptCard>
        <ResearchConceptCard
          id="recovery"
          title="Recovery difficulty"
          qualification="A single easier day does not necessarily count as complete recovery."
        >
          <p>
            Recovery difficulty describes how consistently the person returns toward
            their established range after a difficult period. Grove considers how long
            recovery takes, whether it is sustained, and whether a new downturn begins
            before the earlier period has resolved.
          </p>
        </ResearchConceptCard>
      </div>
    </section>

    <section aria-labelledby="personal-baseline">
      <h2 id="personal-baseline">Compared with the person, not an imagined average</h2>
      <p>
        Behavior and wellbeing vary by age, development, communication, environment,
        disability, temperament, and personal circumstances. Grove therefore compares
        recent observations primarily with the person’s own established history rather
        than applying one universal definition of normal behavior.
      </p>
      <p>
        A personal baseline uses earlier observations when available, excludes the
        current comparison period when practical, requires adequate data coverage, and
        is recalculated as more history becomes available. It is not a permanent
        judgment about the person.
      </p>
    </section>

    <section aria-labelledby="research-foundation">
      <h2 id="research-foundation">Research concepts behind Pattern Strain</h2>
      <p>
        Grove’s approach is informed by a field often described as affect dynamics or
        emotion dynamics. This research studies how emotions and related experiences
        behave over time, including their intensity, variability, instability,
        persistence, and differentiation.
      </p>
      <p>
        Research using ecological momentary assessment collects repeated observations in
        everyday environments. These methods can provide information about within-person
        changes and temporal patterns that may be missed by one-time or retrospective
        questionnaires.
      </p>
      <p>
        Reviews of child and adolescent research have examined emotional intensity,
        variability, instability, and inertia across many studies. These findings
        support looking at temporal patterns alongside average levels, while also
        showing that age, context, measurement methods, and individual differences
        affect interpretation.
      </p>
      <p>
        The cited research supports the use of longitudinal and dynamic concepts. It
        does not validate Grove’s exact formulas, thresholds, weights, labels, or
        support recommendations.
      </p>
    </section>

    <section aria-labelledby="strain-labels">
      <h2 id="strain-labels">Interpreting the labels</h2>
      <div className="research-label-list">
        {(Object.keys(PATTERN_STRAIN_LABELS) as PatternStrainBand[]).map((band) => (
          <article key={band}>
            <h3>{PATTERN_STRAIN_LABELS[band]}</h3>
            <p>{strainDescriptions[band]}</p>
            {band === 'intensive' && (
              <p className="research-label-list__qualification">
                Intensive strain describes the recorded pattern. It does not determine a
                diagnosis, level of care, or need for inpatient treatment.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>

    <section aria-labelledby="data-quality">
      <h2 id="data-quality">How data quality affects the result</h2>
      <p>
        Pattern interpretation becomes more reliable when check-ins are recorded
        consistently across both easier and more difficult days. Missing observations
        can make it harder to distinguish a brief episode from a persistent one or to
        determine when recovery occurred.
      </p>
      <p>
        Grove considers the number of observed days, coverage of the selected period,
        baseline history, usable transitions, and gaps between check-ins. User-facing
        descriptions range from limited data and a developing pattern to moderate
        confidence and strong observation coverage.
      </p>
    </section>

    <section aria-labelledby="research-references">
      <h2 id="research-references">Published sources informing the methodology</h2>
      <p>
        These sources support the longitudinal concepts described near them. They do not
        validate Grove’s proprietary implementation.
      </p>
      <ResearchReferences />
    </section>
    {showGroveScoreLink && (
      <section className="research-methodology__owner-link">
        <p className="research-methodology__eyebrow">Owner reference</p>
        <h2>Understand the proprietary score</h2>
        <p>
          See a plain-language breakdown of the Grove Score, including its live
          weights, adjustment rules, and the evidence that changes its direction.
        </p>
        <Link to={GROVE_SCORE_METHODOLOGY_PATH}>Grove Score &amp; You</Link>
      </section>
    )}
  </article>
)

const ResearchMethodologyPage = () => {
  const { user, email } = useAppAuth()
  const history = useHistory()
  const goBack = () => {
    if (history.length > 1) {
      history.goBack()
      return
    }
    history.replace('/dashboard')
  }

  return (
    <Page
      title="Research & Methodology"
      headerContent={<IllustratedHeaderTitle title="Research & Methodology" />}
      backHref="/dashboard"
      onBackClick={goBack}
      illustratedHeader
      className="research-methodology-page"
    >
      <ResearchMethodologyContent
        showGroveScoreLink={isGroveScoreOwner(user, email)}
      />
    </Page>
  )
}

export default ResearchMethodologyPage
