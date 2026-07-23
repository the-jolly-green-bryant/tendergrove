import { IonButton, IonItem, IonSelect, IonSelectOption } from '@ionic/react'
import { useEffect, useMemo, useState } from 'react'
import { IllustratedHeaderTitle, Page } from '../../components/Page'
import { useAppAuth } from '../../auth/AuthContext'
import { usePeople } from '../people/usePeople'
import { usePatternsData } from '../patterns/usePatternsData'
import { buildProviderReport } from './reportBuilder'
import { readReportPins, removeReportPin } from './reportPins'
import { narrativeTakeaways } from './reportNarrative'
import { useReportNarrative } from './useReportNarrative'

const imageDataUrl = async (url: string) => {
  const blob = await fetch(url).then((response) => response.blob())
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob)
  })
}

const SignalTrend = ({ observations, kind }: { observations: NonNullable<ReturnType<typeof buildProviderReport>>['observations']; kind: 'concern' | 'positive' }) => {
  const width = 680; const height = 120
  const values = observations.map((day) => kind === 'concern' ? day.concernSignals : day.positiveSignals)
  const maximum = Math.max(1, ...values)
  const x = (index: number) => observations.length === 1 ? width / 2 : 18 + index * ((width - 36) / (observations.length - 1))
  const y = (value: number) => 10 + (maximum - value) * ((height - 22) / maximum)
  const title = kind === 'concern' ? 'Concern signals over time' : 'Positive signals over time'
  return <section className={`report-visual report-visual--${kind}`} aria-label={title}>
    <div className="report-visual__heading"><h3>{title}</h3><span>Number of selected {kind === 'concern' ? 'difficult' : 'positive'} signals on each recorded day.</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} across ${observations.length} days`}>
      <polyline points={values.map((value, index) => `${x(index)},${y(value)}`).join(' ')} className={`report-signal-line report-signal-line--${kind}`} />
      {values.map((value, index) => <circle key={observations[index].date} cx={x(index)} cy={y(value)} r="4"><title>{observations[index].date}: {value} signals</title></circle>)}
    </svg>
  </section>
}

const EmphasizedText = ({ text, signalPolarity }: { text: string; signalPolarity?: 'concern' | 'positive' }) => {
  const parts = text.split(/([“"][^”"]+[”"]|\b\d+(?:\.\d+)?(?:%|-point)?\b|\b(?:more common|less common|up|down|above|below|improving|declining|increase|decrease|higher|lower)\b)/gi)
  return <>{parts.map((part, index) => {
    if (!part) return null
    const moreCommon = /^more common$/i.test(part)
    const lessCommon = /^less common$/i.test(part)
    const direction =
      /^(up|above|improving|increase|higher)$/i.test(part) ||
      (signalPolarity === 'concern' && lessCommon) ||
      (signalPolarity === 'positive' && moreCommon)
        ? 'positive'
        : /^(down|below|declining|decrease|lower)$/i.test(part) ||
            (signalPolarity === 'concern' && moreCommon) ||
            (signalPolarity === 'positive' && lessCommon)
          ? 'negative'
          : ''
    const emphasized = /^[“"]/.test(part) || /\d/.test(part) || direction
    return emphasized
      ? <strong className={direction ? `report-emphasis report-emphasis--${direction}` : 'report-emphasis'} key={`${part}-${index}`}>{part}</strong>
      : part
  })}</>
}

const ImportantStretchList = ({ text }: { text: string }) => {
  const items = text.split(/(?<=\.)\s+/).filter(Boolean)
  return <ul className="report-stretch-list">{items.map((item) => <li key={item}><EmphasizedText text={item} /></li>)}</ul>
}

const ReportVisuals = ({ observations, calendarDays, sections }: Pick<NonNullable<ReturnType<typeof buildProviderReport>>, 'observations' | 'calendarDays'> & { sections: Record<string, string> }) => {
  if (!observations.length) return <p className="report-empty-visual">Complete check-ins to add a trend and observation calendar.</p>
  const recentCalendarDays = calendarDays.slice(-30)
  const recentStart = recentCalendarDays[0]?.date ?? ''
  const recentObservations = observations.filter((day) => day.date >= recentStart)
  const width = 680
  const height = 170
  const weighted = recentCalendarDays.filter((day): day is typeof day & { weightedScore: number } => day.weightedScore !== null)
  const weightedValues = weighted.map((day) => day.weightedScore)
  const rawMin = Math.min(...weightedValues); const rawMax = Math.max(...weightedValues)
  const padding = Math.max(6, Math.round((rawMax - rawMin) * .15))
  const lowerBound = Math.max(0, rawMin - padding); const upperBound = Math.min(100, rawMax + padding)
  const span = Math.max(1, upperBound - lowerBound)
  const y = (score: number) => 12 + (upperBound - score) * ((height - 30) / span)
  const weightedX = (index: number) => weighted.length === 1 ? width / 2 : 18 + index * ((width - 36) / (weighted.length - 1))
  const points = weighted.map((day, index) => `${weightedX(index)},${y(day.weightedScore)}`).join(' ')
  const firstWeekday = new Date(`${recentCalendarDays[0].date}T12:00:00`).getDay()
  return <>
    <section className="report-visual" aria-labelledby="report-trend-title">
      <div className="report-visual__heading"><h3 id="report-trend-title">Recent trend</h3><span><EmphasizedText text={sections.trend_description} /></span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Weighted wellness trend across ${recentCalendarDays.length} calendar days`}>
        <text x="18" y="10" className="report-trend__bound">{upperBound} pts</text><text x="18" y={height - 2} className="report-trend__bound">{lowerBound} pts</text>
        {upperBound >= 80 && lowerBound <= 80 && <line x1="18" x2={width - 18} y1={y(80)} y2={y(80)} className="report-trend__guide report-trend__guide--steady" />}
        {upperBound >= 60 && lowerBound <= 60 && <line x1="18" x2={width - 18} y1={y(60)} y2={y(60)} className="report-trend__guide report-trend__guide--concern" />}
        <polyline points={points} className="report-trend__line" />
        {weighted.map((day, index) => <circle key={day.date} cx={weightedX(index)} cy={y(day.weightedScore)} r="4" className={`report-trend__point report-day--${day.level}`}><title>{day.date}: {day.weightedScore} weighted wellness points</title></circle>)}
      </svg>
    </section>
    <section className="report-visual" aria-labelledby="report-calendar-title">
      <div className="report-visual__heading">
        <h3 id="report-calendar-title">Observation calendar</h3>
        <span><EmphasizedText text={sections.calendar_context} /></span>
        {sections.important_stretches && <div className="report-important-stretches"><strong>Important stretches</strong><ImportantStretchList text={sections.important_stretches} /></div>}
        <span>Grey dates have no scored check-in and are excluded from analysis.</span>
      </div>
      <div className="report-calendar__weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="report-calendar">{Array.from({ length: firstWeekday }, (_, index) => <i key={`blank-${index}`} />)}{recentCalendarDays.map((day) => <div key={day.date} className={`report-calendar__day report-day--${day.level}`} title={day.score === null ? `${day.date}: No scored check-in` : `${day.date}: ${day.score} wellness points`}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span><b>{Number(day.date.slice(-2))}</b><small>{day.score === null ? '–' : `${day.score} pts`}</small></div>)}</div>
      <div className="report-legend"><span><i className="report-day--steady" />Steady</span><span><i className="report-day--watch" />Watch</span><span><i className="report-day--concern" />Concern</span><span><i className="report-day--missing" />No scored check-in</span></div>
    </section>
    <section className="report-evidence-section">
      <div className="report-visual__heading"><h3>Recorded signals</h3><span><EmphasizedText text={sections.frequent_concern_1 ?? sections.frequent_positive ?? 'Daily signal counts provide additional context for the weighted trend.'} signalPolarity={sections.frequent_concern_1 ? 'concern' : 'positive'} /></span></div>
      <div className="report-signal-trends"><SignalTrend observations={recentObservations} kind="concern" /><SignalTrend observations={recentObservations} kind="positive" /></div>
    </section>
  </>
}

const ReportsPage = () => {
  const { user } = useAppAuth()
  const people = usePeople()
  const patterns = usePatternsData()
  const activePeople = (people.data ?? []).filter((person) => !person.archived)
  const [personId, setPersonId] = useState('')
  const selected = activePeople.find((person) => person.id === personId) ?? activePeople[0]
  const [pins, setPins] = useState(() => readReportPins(user?.userId))
  const selectedPins = useMemo(
    () => pins.filter((pin) => pin.personId === null || pin.personId === selected?.id),
    [pins, selected?.id],
  )
  const report = useMemo(() => selected ? buildProviderReport({ person: selected, reason: '', questions: '', pinnedObservations: selectedPins.map((pin) => pin.text), lifeEvents: patterns.data?.lifeEvents }) : null, [patterns.data?.lifeEvents, selected, selectedPins])
  const narrative = useReportNarrative(selected?.id, report)
  const topTakeaways = useMemo(() => narrativeTakeaways(narrative.text), [narrative.text])
  const reportText = report ? [
    report.text.split('\n\n').slice(0, 1).join('\n\n'),
    `PLAIN-LANGUAGE OVERVIEW\n${narrative.text}`,
    report.text.split('\n\n').slice(1).join('\n\n'),
  ].join('\n\n') : ''
  const [pdfState, setPdfState] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle')
  const [preparedPdf, setPreparedPdf] = useState<{ url: string; name: string } | null>(null)
  useEffect(() => () => { if (preparedPdf) URL.revokeObjectURL(preparedPdf.url) }, [preparedPdf])
  const baseName = `grove-care-${selected?.displayName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-') || 'report'}`
  const savePdf = async () => {
    if (!report) return
    setPdfState('preparing')
    try {
      const { jsPDF } = await import('jspdf')
      const wordmark = await imageDataUrl('/assets/brand/grove-wordmark.png')
      const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
      const margin = 54
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const addHeader = (featured = false) => {
        if (featured) { pdf.setFillColor(239, 245, 235); pdf.rect(0, 0, pageWidth, 78, 'F'); pdf.setFillColor(86, 130, 100); pdf.rect(0, 0, 9, 78, 'F') }
        pdf.addImage(wordmark, 'PNG', margin, featured ? 15 : 14, featured ? 104 : 76, featured ? 44 : 32, undefined, 'FAST')
        if (featured) { pdf.setTextColor(75, 101, 87); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text('OBSERVATIONS FOR A MORE INFORMED CARE CONVERSATION', pageWidth - margin, 34, { align: 'right' }); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(104, 119, 111); pdf.text('Private appointment-prep summary', pageWidth - margin, 49, { align: 'right' }) }
        pdf.setDrawColor(131, 158, 141); pdf.line(margin, featured ? 78 : 52, pageWidth - margin, featured ? 78 : 52)
      }
      addHeader(true)
      pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.2)
      const lines = pdf.splitTextToSize(reportText, pageWidth - margin * 2)
      let y = 102
      for (const line of lines) {
        if (y > pageHeight - 42) { pdf.addPage(); addHeader(); pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.2); y = 72 }
        pdf.text(line, margin, y)
        y += 11.5
      }
      if (report.observations.length) {
        pdf.addPage(); addHeader()
        pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text('WEIGHTED WELLNESS TREND AND OBSERVATION CALENDAR', margin, 76)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(100, 112, 106); pdf.text('The trend uses Grove Care’s proprietary weighting. Missing or incomplete data is excluded from trend analysis.', margin, 92)
        const chart = { left: margin, top: 118, width: pageWidth - margin * 2, height: 180 }
        const recentCalendarDays = report.calendarDays.slice(-30)
        const recentStart = recentCalendarDays[0]?.date ?? ''
        const recentObservations = report.observations.filter((day) => day.date >= recentStart)
        const weightedDays = recentCalendarDays.filter((day): day is typeof day & { weightedScore: number } => day.weightedScore !== null)
        const weightedValues = weightedDays.map((day) => day.weightedScore)
        const rawMin = Math.min(...weightedValues); const rawMax = Math.max(...weightedValues); const chartPadding = Math.max(6, Math.round((rawMax - rawMin) * .15))
        const lowerBound = Math.max(0, rawMin - chartPadding); const upperBound = Math.min(100, rawMax + chartPadding); const chartSpan = Math.max(1, upperBound - lowerBound)
        const chartX = (index: number) => weightedDays.length === 1 ? chart.left + chart.width / 2 : chart.left + index * (chart.width / (weightedDays.length - 1))
        const chartY = (score: number) => chart.top + (upperBound - score) * (chart.height / chartSpan)
        pdf.setDrawColor(210, 222, 214); pdf.setLineDashPattern([4, 4], 0)
        if (upperBound >= 80 && lowerBound <= 80) pdf.line(chart.left, chartY(80), chart.left + chart.width, chartY(80))
        if (upperBound >= 60 && lowerBound <= 60) pdf.line(chart.left, chartY(60), chart.left + chart.width, chartY(60))
        pdf.setLineDashPattern([], 0)
        pdf.setFontSize(7); pdf.setTextColor(100, 112, 106); pdf.text(`${upperBound} point upper bound`, chart.left, chart.top - 5); pdf.text(`${lowerBound} point lower bound`, chart.left, chart.top + chart.height + 11)
        pdf.setDrawColor(73, 111, 92); pdf.setLineWidth(2)
        weightedDays.slice(1).forEach((day, index) => pdf.line(chartX(index), chartY(weightedDays[index].weightedScore), chartX(index + 1), chartY(day.weightedScore)))
        weightedDays.forEach((day, index) => {
          const color = day.level === 'steady' ? [86, 130, 100] : day.level === 'watch' ? [196, 154, 56] : [182, 76, 66]
          pdf.setFillColor(color[0], color[1], color[2]); pdf.circle(chartX(index), chartY(day.weightedScore), 3.2, 'F')
        })
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(37, 52, 47); pdf.text('Observation calendar', margin, 332)
        const cellWidth = 69; const cellHeight = 21; const gap = 3; const columns = 7
        const calendarOffset = new Date(`${recentCalendarDays[0].date}T12:00:00`).getDay()
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(100, 112, 106)
        ;['SUN','MON','TUE','WED','THU','FRI','SAT'].forEach((weekday, index) => pdf.text(weekday, margin + index * (cellWidth + gap) + 5, 351))
        recentCalendarDays.forEach((day, index) => {
          const position = index + calendarOffset; const row = Math.floor(position / columns); const column = position % columns
          const left = margin + column * (cellWidth + gap); const top = 358 + row * (cellHeight + gap)
          const fill = day.level === 'missing' ? [235, 238, 236] : day.level === 'steady' ? [223, 238, 221] : day.level === 'watch' ? [247, 236, 201] : [244, 217, 213]
          pdf.setFillColor(fill[0], fill[1], fill[2]); pdf.roundedRect(left, top, cellWidth, cellHeight, 5, 5, 'F')
          const date = new Date(`${day.date}T12:00:00`)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(70, 87, 79); pdf.text(`${date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()} ${date.getDate()}`, left + 5, top + 10)
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.text(day.score === null ? 'No scored check-in' : `${day.score} wellness points`, left + 5, top + 19)
        })
        pdf.addPage(); addHeader()
        pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text('CONCERN AND POSITIVE SIGNAL TRENDS', margin, 78)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(100, 112, 106); pdf.text('Each point is the number of selected signals recorded that day; it is not a diagnosis or severity rating.', margin, 94)
        const drawSignalChart = (top: number, key: 'concernSignals' | 'positiveSignals', title: string, color: [number, number, number]) => {
          const values = recentObservations.map((day) => day[key]); const maximum = Math.max(1, ...values); const left = margin; const width = pageWidth - margin * 2; const height = 170
          const px = (index: number) => recentObservations.length === 1 ? left + width / 2 : left + index * (width / (recentObservations.length - 1)); const py = (value: number) => top + 30 + (maximum - value) * (height / maximum)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(37, 52, 47); pdf.text(title, left, top)
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 112, 106); pdf.text(`Daily count · highest recorded: ${maximum}`, left, top + 13)
          pdf.setDrawColor(220, 227, 222); for (let value = 0; value <= maximum; value += 1) { pdf.line(left, py(value), left + width, py(value)); pdf.text(String(value), left - 10, py(value) + 2) }
          pdf.setDrawColor(...color); pdf.setLineWidth(2); values.slice(1).forEach((value, index) => pdf.line(px(index), py(values[index]), px(index + 1), py(value)))
          pdf.setFillColor(...color); values.forEach((value, index) => pdf.circle(px(index), py(value), 3.2, 'F'))
        }
        drawSignalChart(125, 'concernSignals', 'Concern signals over time', [182, 76, 66])
        drawSignalChart(415, 'positiveSignals', 'Positive signals over time', [86, 130, 100])
      }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.8); pdf.setTextColor(100, 112, 106)
      for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) {
        pdf.setPage(page)
        pdf.text('Grove Care provides observational summaries and does not diagnose, assess immediate risk, or replace professional medical care.', pageWidth / 2, pageHeight - 29, { align: 'center' })
        pdf.text('© 2026 Bryant James. All rights reserved.', margin, pageHeight - 16)
        pdf.text(`Prepared ${new Date().toLocaleDateString()} · Page ${page} of ${pdf.getNumberOfPages()}`, pageWidth - margin, pageHeight - 16, { align: 'right' })
      }
      const blob = pdf.output('blob')
      if (preparedPdf) URL.revokeObjectURL(preparedPdf.url)
      const next = { url: URL.createObjectURL(blob), name: `${baseName}.pdf` }
      setPreparedPdf(next)
      const anchor = document.createElement('a'); anchor.href = next.url; anchor.download = next.name; document.body.append(anchor); anchor.click(); anchor.remove()
      setPdfState('ready')
    } catch { setPdfState('error') }
  }

  return <Page
    title="Appointment prep"
    headerContent={<IllustratedHeaderTitle title="Appointment prep" />}
    subHeaderContent={<div className="page-header-person-filter report-person-filter"><IonSelect aria-label="Person" interface="popover" value={selected?.id} onIonChange={(event) => setPersonId(event.detail.value)}>{activePeople.map((person) => <IonSelectOption key={person.id} value={person.id}>{person.displayName}</IonSelectOption>)}</IonSelect></div>}
    backHref="/dashboard"
    className="reports-page"
    illustratedHeader
  >
    {report && <>
      <section className={`report-narrative report-narrative--${narrative.source}`} aria-live="polite">
        <p className="report-narrative__eyebrow">Grove’s Care Notes</p>
        <h2>Three noteworthy takeaways</h2>
        <ol>{topTakeaways.map((takeaway, index) => <li key={`${index}-${takeaway}`}><EmphasizedText text={takeaway} /></li>)}</ol>
      </section>
      <section className="report-flow-section">
        <p className="report-flow-section__eyebrow">1 · Here are the observations</p>
        <h2>See the recorded evidence</h2>
      </section>
      <ReportVisuals observations={report.observations} calendarDays={report.calendarDays} sections={narrative.sections} />
      <section className="report-evidence-section">
        <div className="report-visual__heading"><h3>Events and observed associations</h3><span><EmphasizedText text={narrative.sections.event_summary ?? 'No event has enough recorded days for a meaningful comparison yet.'} /></span></div>
      </section>
    </>}

    {selectedPins.length > 0 && <section className="report-pins">
      <h2>Added for this appointment</h2>
      {selectedPins.map((pin) => <IonItem key={pin.id}><span>{pin.text.split('\n')[0]}</span><IonButton slot="end" fill="clear" color="medium" onClick={() => setPins(removeReportPin(user?.userId, pin.id))}>Remove</IonButton></IonItem>)}
    </section>}

    {report && <>
      <section className="report-flow-section">
        <p className="report-flow-section__eyebrow">Provider report</p>
        <h2>Share the detailed evidence</h2>
        <p>The PDF includes the factual calculations, raw recent observations, charts, and the important points shown above.</p>
      </section>
      <ReportActions />
      {pdfState === 'ready' && preparedPdf && <p className="report-download-status">Your PDF is ready. If it did not download automatically, <a href={preparedPdf.url} download={preparedPdf.name}>download it here</a>.</p>}
      {pdfState === 'error' && <p className="report-download-status report-download-status--error">The PDF could not be prepared. Your report is still here; try again or copy the plain text.</p>}
    </>}
    {report && <p className="report-ai-disclosure">{narrative.pending ? 'AI-generated language is being prepared.' : 'This page and report include AI-generated language. Grove verifies the displayed values; the language does not diagnose or determine care.'}</p>}
    {!selected && <p>Add the person you are concerned about to create an appointment summary.</p>}
  </Page>

  function ReportActions() {
    return <div className="report-actions">
      <IonButton fill="outline" onClick={() => void navigator.clipboard.writeText(reportText)}>Copy report</IonButton>
      <IonButton disabled={pdfState === 'preparing'} onClick={() => void savePdf()}>{pdfState === 'preparing' ? 'Preparing PDF…' : 'Download PDF'}</IonButton>
    </div>
  }
}

export default ReportsPage
