import { useEffect, useState } from 'react'
import { Redirect } from 'react-router-dom'

import { isGroveAdmin, useAppAuth } from '../../auth/AuthContext'
import { IllustratedHeaderTitle, Page } from '../../components/Page'
import { FlippableCard } from '../../components/FlippableCard'
import { client } from '../../lib/api'
import './analyticsDashboard.scss'

type DashboardData = {
  generatedAt: string
  totalEvents: number
  accounts: {
    totalObserved: number
    active7Days: number
    active30Days: number
    onboardingCompleted: number
    downloadedReport: number
    collaborationActivated: number
  }
  households: {
    profilesAvailable: number
    averagePeopleTracked: number
    selfTrackingAccounts: number
  }
  screenViews: Record<string, number>
  strainDistribution: Record<string, number>
  wellnessDistribution: Record<string, number>
  roleDistribution: Record<string, number>
  daily: Array<{
    date: string
    activeAccounts: number
    events: number
    checkIns: number
    reports: number
  }>
}

const percentage = (count: number, total: number) =>
  total ? `${Math.round((count / total) * 100)}%` : '0%'

const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const Distribution = ({
  title,
  values,
  label,
}: {
  title: string
  values: Record<string, number>
  label?: (key: string) => string
}) => {
  const rows = Object.entries(values).sort(([, left], [, right]) => right - left)
  const maximum = Math.max(1, ...rows.map(([, value]) => value))
  return (
    <FlippableCard className="analytics-panel" title={title}>
      {rows.length ? (
        <div className="analytics-bars">
          {rows.map(([key, value]) => (
            <div
              className="analytics-bar"
              key={key}
            >
              <span>{label?.(key) ?? titleCase(key)}</span>
              <i>
                <b style={{ width: `${(value / maximum) * 100}%` }} />
              </i>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>No data collected yet.</p>
      )}
    </FlippableCard>
  )
}

const AnalyticsDashboardPage = () => {
  const { user, email, emailResolved } = useAppAuth()
  const [data, setData] = useState<DashboardData>()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!emailResolved || !isGroveAdmin(user, email)) return
    const dashboardQuery = client.queries.getAnalyticsDashboard
    if (typeof dashboardQuery !== 'function') {
      setError('The analytics backend has not been deployed yet.')
      return
    }
    void client.queries
      .getAnalyticsDashboard()
      .then((result) => {
        if (result.errors?.length || !result.data) {
          throw new Error(result.errors?.[0]?.message ?? 'Analytics are unavailable.')
        }
        setData(JSON.parse(result.data) as DashboardData)
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Analytics could not be loaded.',
        )
      })
  }, [email, emailResolved, user])

  if (emailResolved && !isGroveAdmin(user, email)) {
    return <Redirect to="/settings" />
  }

  const accountTotal = data?.accounts.totalObserved ?? 0
  return (
    <Page
      title="Product analytics"
      headerContent={<IllustratedHeaderTitle title="Product analytics" />}
      backHref="/settings"
      illustratedHeader
      className="analytics-dashboard"
    >
      {!data && !error && <p className="page-loading-message">Preparing analytics…</p>}
      {error && (
        <FlippableCard className="analytics-panel" title="Analytics are not available yet">
          <p>{error}</p>
          <p>The analytics backend must be deployed before this page can load data.</p>
        </FlippableCard>
      )}
      {data && (
        <>
          <header className="analytics-intro">
            <p>Private owner dashboard</p>
            <h1>How Grove is being used</h1>
            <span>
              Updated{' '}
              {new Date(data.generatedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </header>

          <section className="analytics-kpis">
            <FlippableCard kicker="Observed accounts" title={accountTotal} />
            <FlippableCard kicker="Active in 7 days" title={data.accounts.active7Days} />
            <FlippableCard kicker="Active in 30 days" title={data.accounts.active30Days} />
            <FlippableCard kicker="People per household" title={data.households.averagePeopleTracked} />
          </section>

          <FlippableCard className="analytics-panel" title="Activation and value">
            <dl className="analytics-rates">
              <div>
                <dt>Completed onboarding</dt>
                <dd>
                  {data.accounts.onboardingCompleted}{' '}
                  <small>
                    {percentage(data.accounts.onboardingCompleted, accountTotal)}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Downloaded a report</dt>
                <dd>
                  {data.accounts.downloadedReport}{' '}
                  <small>
                    {percentage(data.accounts.downloadedReport, accountTotal)}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Activated collaboration</dt>
                <dd>
                  {data.accounts.collaborationActivated}{' '}
                  <small>
                    {percentage(
                      data.accounts.collaborationActivated,
                      accountTotal,
                    )}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Tracking themselves</dt>
                <dd>
                  {data.households.selfTrackingAccounts}{' '}
                  <small>
                    {percentage(
                      data.households.selfTrackingAccounts,
                      data.households.profilesAvailable,
                    )}
                  </small>
                </dd>
              </div>
            </dl>
          </FlippableCard>

          <Distribution
            title="Pattern Strain mix"
            values={data.strainDistribution}
          />
          <Distribution
            title="Wellness distribution"
            values={data.wellnessDistribution}
            label={(key) =>
              key === 'unknown'
                ? 'Not enough data'
                : `${Number(key) * 10}–${key === '9' ? 100 : Number(key) * 10 + 9} points`
            }
          />
          <Distribution
            title="People being tracked"
            values={data.roleDistribution}
          />
          <Distribution
            title="Most-used areas"
            values={data.screenViews}
          />

          <FlippableCard className="analytics-panel" title="Recent daily activity">
            {data.daily.length ? (
              <div className="analytics-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Accounts</th>
                      <th>Check-ins</th>
                      <th>Reports</th>
                      <th>Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{new Date(`${day.date}T12:00:00`).toLocaleDateString()}</td>
                        <td>{day.activeAccounts}</td>
                        <td>{day.checkIns}</td>
                        <td>{day.reports}</td>
                        <td>{day.events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No activity collected yet.</p>
            )}
          </FlippableCard>

          <p className="analytics-footnote">
            Wellness is grouped into 10-point bands. Small cohorts should not be
            shared externally until at least 10 households are represented.
          </p>
        </>
      )}
    </Page>
  )
}

export default AnalyticsDashboardPage
