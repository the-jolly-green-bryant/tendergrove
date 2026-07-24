import { Redirect, useHistory } from 'react-router-dom'

import { isGroveScoreOwner, useAppAuth } from '../../auth/AuthContext'
import { IllustratedHeaderTitle, Page } from '../../components/Page'
import {
  GROVE_SCORE_PRESSURE_LIMITS,
  GROVE_SCORE_RECOVERY_RATES,
  GROVE_SCORE_REGRESSION_RATES,
  GROVE_SCORE_SETBACK_DECAY,
  GROVE_SCORE_WEIGHTS,
} from '../../lib/groveScore'

const percent = (value: number) => `${Math.round(value * 100)}%`

export const GROVE_SCORE_METHODOLOGY_PATH = '/about/grove-score'

export const GroveScoreMethodologyContent = () => (
  <article className="research-methodology grove-score-methodology">
    <header className="research-methodology__intro">
      <p className="research-methodology__eyebrow">Owner methodology guide</p>
      <h2>What the Grove Score is trying to tell you</h2>
      <p>
        The Grove Score is a 0-to-100 summary of the observations recorded for one
        person. Higher numbers mean the recorded period contains more positive
        signals, fewer challenges, and an easier pattern of recovery. It is not a
        diagnosis, percentile, or clinical test.
      </p>
      <p>
        A single check-in can describe one day. The Grove Score deliberately looks
        beyond that day so a brief improvement does not erase an ongoing difficult
        pattern, and one ordinary difficult day does not overwhelm an otherwise
        stable pattern.
      </p>
    </header>

    <section>
      <h2>Step 1: score each recorded day</h2>
      <p>
        Positive and difficult signals are evaluated as two balanced halves. This
        prevents a person with many configured positive signals, or many configured
        difficult signals, from receiving an unfair score simply because their list
        is longer. Recorded incidents add additional downward weight. Days without a
        check-in or incident remain unknown and do not count as good or bad.
      </p>
    </section>

    <section>
      <h2>Step 2: combine wellness with the pattern over time</h2>
      <p>
        When there is enough history for full confidence, the compound calculation
        uses the following target weights. When history is limited, Pattern Strain
        weights fade down and the recorded wellness score carries more of the result.
      </p>
      <dl className="grove-score-methodology__weights">
        <div>
          <dt>Recorded wellness</dt>
          <dd>{percent(GROVE_SCORE_WEIGHTS.wellness)}</dd>
          <p>The balanced positive and difficult signals recorded in check-ins.</p>
        </div>
        <div>
          <dt>Burden</dt>
          <dd>{percent(GROVE_SCORE_WEIGHTS.burden)}</dd>
          <p>How frequent and concentrated difficult observations have been.</p>
        </div>
        <div>
          <dt>Persistence</dt>
          <dd>{percent(GROVE_SCORE_WEIGHTS.persistence)}</dd>
          <p>Whether difficult observations continue across recorded days.</p>
        </div>
        <div>
          <dt>Recovery difficulty</dt>
          <dd>{percent(GROVE_SCORE_WEIGHTS.recoveryDifficulty)}</dd>
          <p>How consistently the person returns toward their established range.</p>
        </div>
        <div>
          <dt>Instability</dt>
          <dd>{percent(GROVE_SCORE_WEIGHTS.instability)}</dd>
          <p>How sharply the recorded score changes between observations.</p>
        </div>
      </dl>
    </section>

    <section>
      <h2>Step 3: account for direction and context</h2>
      <p>
        Increasing negative signals can subtract up to{' '}
        <strong>{GROVE_SCORE_PRESSURE_LIMITS.negativeTrajectory} points</strong>.
        Progressively worsening event-linked observations can subtract up to{' '}
        <strong>{GROVE_SCORE_PRESSURE_LIMITS.worseningEvents} points</strong>.
        A disproportionately difficult observation also leaves temporary setback
        pressure, which fades only as later recorded observations provide evidence of
        recovery.
      </p>
    </section>

    <section>
      <h2>Why improvement and regression do not always move equally</h2>
      <p>
        Grove adapts to the current Pattern Strain level. In a Low-strain pattern,
        ordinary ups and downs receive balanced influence. In a Sustained or Intensive
        pattern, regression is reflected quickly while improvement must continue
        across observations before the score rises substantially.
      </p>
      <dl className="grove-score-methodology__weights">
        <div>
          <dt>Low strain</dt>
          <dd>{percent(GROVE_SCORE_RECOVERY_RATES.low)} recovery influence</dd>
          <p>
            Regression influence is also{' '}
            {percent(GROVE_SCORE_REGRESSION_RATES.low)}; setback memory retains{' '}
            {percent(GROVE_SCORE_SETBACK_DECAY.low)} between observations.
          </p>
        </div>
        <div>
          <dt>Emerging strain</dt>
          <dd>{percent(GROVE_SCORE_RECOVERY_RATES.emerging)} recovery influence</dd>
          <p>
            Regression influence is{' '}
            {percent(GROVE_SCORE_REGRESSION_RATES.emerging)}; setback memory retains{' '}
            {percent(GROVE_SCORE_SETBACK_DECAY.emerging)}.
          </p>
        </div>
        <div>
          <dt>Elevated strain</dt>
          <dd>{percent(GROVE_SCORE_RECOVERY_RATES.elevated)} recovery influence</dd>
          <p>
            Regression influence rises to{' '}
            {percent(GROVE_SCORE_REGRESSION_RATES.elevatedOrHigher)}.
          </p>
        </div>
        <div>
          <dt>Sustained or Intensive strain</dt>
          <dd>{percent(GROVE_SCORE_RECOVERY_RATES.sustained)} recovery influence</dd>
          <p>
            Regression influence remains{' '}
            {percent(GROVE_SCORE_REGRESSION_RATES.elevatedOrHigher)}, and setback
            memory retains{' '}
            {percent(GROVE_SCORE_SETBACK_DECAY.elevatedOrHigher)} between recorded
            observations.
          </p>
        </div>
      </dl>
    </section>

    <section>
      <h2>How to read the number</h2>
      <p>
        Treat the score as a compact description of recorded direction, not a verdict.
        Use the raw wellness line to audit individual observations, the Grove Score
        line to see the weighted pattern, and Pattern Strain to understand why the
        longer-term score may recover more slowly than a single good day.
      </p>
    </section>
  </article>
)

const GroveScoreMethodologyPage = () => {
  const { user, email, emailResolved } = useAppAuth()
  const history = useHistory()

  if (!emailResolved) {
    return (
      <Page
        title="Grove Score & You"
        backHref="/about/research"
        illustratedHeader
        className="research-methodology-page"
      >
        <p className="page-loading-message">Checking access…</p>
      </Page>
    )
  }
  if (!isGroveScoreOwner(user, email))
    return <Redirect to="/about/research" />

  return (
    <Page
      title="Grove Score & You"
      headerContent={<IllustratedHeaderTitle title="Grove Score & You" />}
      backHref="/about/research"
      onBackClick={() => history.goBack()}
      illustratedHeader
      className="research-methodology-page"
    >
      <GroveScoreMethodologyContent />
    </Page>
  )
}

export default GroveScoreMethodologyPage
