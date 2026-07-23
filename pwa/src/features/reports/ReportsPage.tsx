import { IonButton, IonItem, IonList, IonSelect, IonSelectOption, IonTextarea } from '@ionic/react'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useAppAuth } from '../../auth/AuthContext'
import { usePeople } from '../people/usePeople'
import { buildProviderReport, reportCsv } from './reportBuilder'
import { readReportPins, removeReportPin } from './reportPins'

const download = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

const ReportVisuals = ({ observations }: { observations: NonNullable<ReturnType<typeof buildProviderReport>>['observations'] }) => {
  if (!observations.length) return <p className="report-empty-visual">Complete check-ins to add a trend and observation calendar.</p>
  const width = 680
  const height = 170
  const x = (index: number) => observations.length === 1 ? width / 2 : 18 + index * ((width - 36) / (observations.length - 1))
  const y = (score: number) => 12 + (100 - score) * ((height - 30) / 100)
  const points = observations.map((day, index) => `${x(index)},${y(day.score)}`).join(' ')
  return <>
    <section className="report-visual" aria-labelledby="report-trend-title">
      <div className="report-visual__heading"><h3 id="report-trend-title">Recorded trend</h3><span>Higher reflects more recorded positive signals and fewer difficult signals.</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trend across ${observations.length} recorded days`}>
        <line x1="18" x2={width - 18} y1={y(80)} y2={y(80)} className="report-trend__guide report-trend__guide--steady" />
        <line x1="18" x2={width - 18} y1={y(60)} y2={y(60)} className="report-trend__guide report-trend__guide--concern" />
        <polyline points={points} className="report-trend__line" />
        {observations.map((day, index) => <circle key={day.date} cx={x(index)} cy={y(day.score)} r="5" className={`report-trend__point report-day--${day.level}`}><title>{day.date}: {day.score}/100 ({day.level})</title></circle>)}
      </svg>
    </section>
    <section className="report-visual" aria-labelledby="report-calendar-title">
      <div className="report-visual__heading"><h3 id="report-calendar-title">Observation calendar</h3><span>Blank dates are omitted and never treated as positive or negative.</span></div>
      <div className="report-calendar">{observations.map((day) => <div key={day.date} className={`report-calendar__day report-day--${day.level}`} title={`${day.date}: ${day.score}/100`}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span><b>{Number(day.date.slice(-2))}</b><small>{day.score}</small></div>)}</div>
      <div className="report-legend"><span><i className="report-day--steady" />Steady</span><span><i className="report-day--watch" />Watch</span><span><i className="report-day--concern" />Concern</span></div>
    </section>
  </>
}

const ReportsPage = () => {
  const { user } = useAppAuth()
  const people = usePeople()
  const activePeople = (people.data ?? []).filter((person) => !person.archived)
  const [personId, setPersonId] = useState('')
  const selected = activePeople.find((person) => person.id === personId) ?? activePeople[0]
  const [reason, setReason] = useState('')
  const [questions, setQuestions] = useState('')
  const [pins, setPins] = useState(() => readReportPins(user?.userId))
  const selectedPins = useMemo(
    () => pins.filter((pin) => pin.personId === null || pin.personId === selected?.id),
    [pins, selected?.id],
  )
  const report = useMemo(() => selected ? buildProviderReport({ person: selected, reason, questions, pinnedObservations: selectedPins.map((pin) => pin.text) }) : null, [questions, reason, selected, selectedPins])
  const [editedText, setEditedText] = useState('')
  const [pdfState, setPdfState] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle')
  const [preparedPdf, setPreparedPdf] = useState<{ url: string; name: string } | null>(null)
  useEffect(() => setEditedText(report?.text ?? ''), [report])
  useEffect(() => () => { if (preparedPdf) URL.revokeObjectURL(preparedPdf.url) }, [preparedPdf])
  const baseName = `grove-care-${selected?.displayName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-') || 'report'}`
  const savePdf = async () => {
    if (!report) return
    setPdfState('preparing')
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
      const margin = 54
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const addHeader = () => {
        pdf.setTextColor(35, 77, 66); pdf.setFont('times', 'bold'); pdf.setFontSize(18); pdf.text('Grove Care', margin, 40)
        pdf.setDrawColor(131, 158, 141); pdf.line(margin, 48, pageWidth - margin, 48)
      }
      addHeader()
      pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5)
      const lines = pdf.splitTextToSize(editedText, pageWidth - margin * 2)
      let y = 70
      for (const line of lines) {
        if (y > pageHeight - 46) { pdf.addPage(); addHeader(); pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); y = 70 }
        pdf.text(line, margin, y)
        y += 12.5
      }
      if (report.observations.length) {
        pdf.addPage(); addHeader()
        pdf.setTextColor(37, 52, 47); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.text('RECORDED TREND AND OBSERVATION CALENDAR', margin, 76)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(100, 112, 106); pdf.text('Scores reflect only selected signals. Blank dates are not treated as positive or negative.', margin, 92)
        const chart = { left: margin, top: 118, width: pageWidth - margin * 2, height: 180 }
        const chartX = (index: number) => report.observations.length === 1 ? chart.left + chart.width / 2 : chart.left + index * (chart.width / (report.observations.length - 1))
        const chartY = (score: number) => chart.top + (100 - score) * (chart.height / 100)
        pdf.setDrawColor(210, 222, 214); pdf.setLineDashPattern([4, 4], 0); pdf.line(chart.left, chartY(80), chart.left + chart.width, chartY(80)); pdf.line(chart.left, chartY(60), chart.left + chart.width, chartY(60)); pdf.setLineDashPattern([], 0)
        pdf.setFontSize(7); pdf.setTextColor(100, 112, 106); pdf.text('80 Steady', chart.left, chartY(80) - 4); pdf.text('60 Watch', chart.left, chartY(60) - 4)
        pdf.setDrawColor(73, 111, 92); pdf.setLineWidth(2)
        report.observations.slice(1).forEach((day, index) => pdf.line(chartX(index), chartY(report.observations[index].score), chartX(index + 1), chartY(day.score)))
        report.observations.forEach((day, index) => {
          const color = day.level === 'steady' ? [86, 130, 100] : day.level === 'watch' ? [196, 154, 56] : [182, 76, 66]
          pdf.setFillColor(color[0], color[1], color[2]); pdf.circle(chartX(index), chartY(day.score), 3.5, 'F')
        })
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(37, 52, 47); pdf.text('Observation calendar', margin, 332)
        const cellWidth = 45; const cellHeight = 43; const gap = 6; const columns = 10
        report.observations.forEach((day, index) => {
          const row = Math.floor(index / columns); const column = index % columns
          const left = margin + column * (cellWidth + gap); const top = 348 + row * (cellHeight + gap)
          const fill = day.level === 'steady' ? [223, 238, 221] : day.level === 'watch' ? [247, 236, 201] : [244, 217, 213]
          pdf.setFillColor(fill[0], fill[1], fill[2]); pdf.roundedRect(left, top, cellWidth, cellHeight, 5, 5, 'F')
          const date = new Date(`${day.date}T12:00:00`)
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(70, 87, 79); pdf.text(date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(), left + 6, top + 11)
          pdf.setFontSize(11); pdf.text(String(date.getDate()), left + 6, top + 26)
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.text(`${day.score}/100`, left + 6, top + 37)
        })
      }
      pdf.setFontSize(8); pdf.setTextColor(100, 112, 106)
      for (let page = 1; page <= pdf.getNumberOfPages(); page += 1) { pdf.setPage(page); pdf.text(`Prepared ${new Date().toLocaleDateString()} · Page ${page} of ${pdf.getNumberOfPages()}`, margin, pageHeight - 22) }
      const blob = pdf.output('blob')
      if (preparedPdf) URL.revokeObjectURL(preparedPdf.url)
      const next = { url: URL.createObjectURL(blob), name: `${baseName}.pdf` }
      setPreparedPdf(next)
      const anchor = document.createElement('a'); anchor.href = next.url; anchor.download = next.name; document.body.append(anchor); anchor.click(); anchor.remove()
      setPdfState('ready')
    } catch { setPdfState('error') }
  }

  return <Page title="Appointment prep" backHref="/dashboard" className="reports-page">
    <section className="report-intro"><p className="report-intro__eyebrow">Bring observations into the conversation</p><h2>Prepare a clearer appointment</h2><p>Select a person and describe why you are seeking support. Grove organizes the recorded days into significant periods, trends, and a calendar. Review and edit the result, then download or copy it for the professional.</p><ol><li>Add the reason for the appointment and your questions.</li><li>Review the evidence and correct anything that does not reflect your observations.</li><li>Export only after you are comfortable sharing it.</li></ol></section>
    <IonList inset className="report-form">
      <IonItem><IonSelect label="Person" labelPlacement="stacked" value={selected?.id} onIonChange={(event) => setPersonId(event.detail.value)}>{activePeople.map((person) => <IonSelectOption key={person.id} value={person.id}>{person.displayName}</IonSelectOption>)}</IonSelect></IonItem>
      <IonItem><IonTextarea label="Reason for this appointment" labelPlacement="stacked" placeholder="What changed, what is happening now, and what do you need help deciding?" value={reason} onIonInput={(event) => setReason(event.detail.value ?? '')} /></IonItem>
      <IonItem><IonTextarea label="Questions for the professional" labelPlacement="stacked" placeholder="What do you want to understand or decide together?" value={questions} onIonInput={(event) => setQuestions(event.detail.value ?? '')} /></IonItem>
    </IonList>
    {selectedPins.length > 0 && <section className="report-pins">
      <h2>Added for this appointment</h2>
      {selectedPins.map((pin) => <IonItem key={pin.id}><span>{pin.text.split('\n')[0]}</span><IonButton slot="end" fill="clear" color="medium" onClick={() => setPins(removeReportPin(user?.userId, pin.id))}>Remove</IonButton></IonItem>)}
    </section>}
    {report && <>
      <h2>Evidence at a glance</h2>
      <ReportVisuals observations={report.observations} />
      <h2>Preview before sharing</h2>
      <IonTextarea className="report-preview" autoGrow value={editedText} onIonInput={(event) => setEditedText(event.detail.value ?? '')} />
      <div className="report-actions">
        <IonButton onClick={() => void navigator.clipboard.writeText(editedText)}>Copy plain text</IonButton>
        <IonButton fill="outline" onClick={() => download(`${baseName}.csv`, reportCsv(selected!), 'text/csv')}>Download CSV</IonButton>
        <IonButton fill="outline" disabled={pdfState === 'preparing'} onClick={() => void savePdf()}>{pdfState === 'preparing' ? 'Preparing PDF…' : 'Download PDF'}</IonButton>
      </div>
      {pdfState === 'ready' && preparedPdf && <p className="report-download-status">Your PDF is ready. If it did not download automatically, <a href={preparedPdf.url} download={preparedPdf.name}>download it here</a>.</p>}
      {pdfState === 'error' && <p className="report-download-status report-download-status--error">The PDF could not be prepared. Your report is still here; try again or copy the plain text.</p>}
    </>}
    {!selected && <p>Add the person you are concerned about to create an appointment summary.</p>}
  </Page>
}

export default ReportsPage
