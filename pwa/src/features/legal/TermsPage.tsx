import { Page } from '../../components/Page'

const TermsPage = () => (
  <Page title="Terms" backHref="/settings" className="legal-page">
    <h1>Important use information</h1>
    <p><strong>Release status:</strong> These terms are an interim product notice and require legal and clinical review before public release.</p>
    <h2>Not medical care</h2>
    <p>Tendergrove helps organize personal observations. It does not diagnose a condition, predict an emergency, provide medical advice, or replace a clinician, crisis counselor, or emergency service.</p>
    <h2>Emergencies</h2>
    <p>Do not wait for Tendergrove to identify danger. If someone may be unsafe, use Get help now and contact an appropriate trained service.</p>
    <h2>Scores and patterns</h2>
    <p>Statuses and patterns are estimates based only on the entries available. They may be incomplete or wrong and should be treated as prompts for reflection or professional discussion, not conclusions.</p>
    <h2>Your responsibility</h2>
    <p>You are responsible for having authority to record information about another person and for reviewing exports before sharing them.</p>
  </Page>
)

export default TermsPage
