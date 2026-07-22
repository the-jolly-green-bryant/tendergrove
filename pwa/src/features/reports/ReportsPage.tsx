import { IonButton, IonItem, IonList, IonSelect, IonSelectOption, IonTextarea } from '@ionic/react'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { usePeople } from '../people/usePeople'
import { buildProviderReport, reportCsv } from './reportBuilder'

const download = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

const ReportsPage = () => {
  const people = usePeople()
  const activePeople = (people.data ?? []).filter((person) => !person.archived)
  const [personId, setPersonId] = useState('')
  const selected = activePeople.find((person) => person.id === personId) ?? activePeople[0]
  const [reason, setReason] = useState('')
  const [questions, setQuestions] = useState('')
  const report = useMemo(() => selected ? buildProviderReport({ person: selected, reason, questions }) : null, [questions, reason, selected])
  const [editedText, setEditedText] = useState('')
  useEffect(() => setEditedText(report?.text ?? ''), [report])
  const baseName = `tendergrove-${selected?.displayName.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-') || 'report'}`
  const savePdf = async () => {
    if (!report) return
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
    const lines = pdf.splitTextToSize(editedText, 500)
    let y = 54
    for (const line of lines) {
      if (y > 740) { pdf.addPage(); y = 54 }
      pdf.text(line, 54, y)
      y += 14
    }
    pdf.save(`${baseName}.pdf`)
  }

  return <Page title="Appointment prep" backHref="/dashboard" className="reports-page">
    <p>Create an editable summary for a clinician, crisis team, school, or other professional. Review everything before sharing.</p>
    <IonList inset>
      <IonItem><IonSelect label="Person" value={selected?.id} onIonChange={(event) => setPersonId(event.detail.value)}>{activePeople.map((person) => <IonSelectOption key={person.id} value={person.id}>{person.displayName}</IonSelectOption>)}</IonSelect></IonItem>
      <IonItem><IonTextarea label="Reason for tracking" labelPlacement="stacked" placeholder="What changed, what is happening now, and what you need help deciding" value={reason} onIonInput={(event) => setReason(event.detail.value ?? '')} /></IonItem>
      <IonItem><IonTextarea label="Questions for the professional" labelPlacement="stacked" value={questions} onIonInput={(event) => setQuestions(event.detail.value ?? '')} /></IonItem>
    </IonList>
    {report && <>
      <h2>Preview before sharing</h2>
      <IonTextarea className="report-preview" autoGrow value={editedText} onIonInput={(event) => setEditedText(event.detail.value ?? '')} />
      <div className="report-actions">
        <IonButton onClick={() => void navigator.clipboard.writeText(editedText)}>Copy plain text</IonButton>
        <IonButton fill="outline" onClick={() => download(`${baseName}.csv`, reportCsv(selected!), 'text/csv')}>Download CSV</IonButton>
        <IonButton fill="outline" onClick={() => void savePdf()}>Download PDF</IonButton>
      </div>
    </>}
    {!selected && <p>Add the person you are concerned about to create an appointment summary.</p>}
  </Page>
}

export default ReportsPage
