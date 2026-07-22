import { Page } from '../../components/Page'

const PrivacyPage = () => (
  <Page title="Privacy" backHref="/settings" className="legal-page">
    <h1>Privacy at Grove</h1>
    <p><strong>Release status:</strong> This plain-language disclosure is a product baseline and must be reviewed by qualified privacy counsel before public release.</p>
    <h2>What is stored</h2>
    <p>Grove Care stores account details, household members, observations, check-ins, notes, events, and settings you choose to enter. This may include sensitive information about children or other people.</p>
    <h2>Where it is stored</h2>
    <p>Signed-in household records are stored in the configured AWS Amplify backend and restricted to the signed-in account using owner-based authorization. Recent records and the safety plan may also be saved in this app’s storage on your device so the app can recover from connection problems.</p>
    <h2>Encryption</h2>
    <p>Cloud services and device platforms may provide encryption in transit and at rest. Grove Care does not currently add a separate application-level encryption layer to copies stored on the device. Protect your device with a passcode and do not use the app on a shared device if that is unsafe.</p>
    <h2>Consent and children</h2>
    <p>Only record another person when you have the legal authority or appropriate consent to do so. Avoid unnecessary identifying details. Grove is not designed for children to create their own accounts.</p>
    <h2>Retention and control</h2>
    <p>Records remain until you delete the household or account. You can export your records, clear saved device copies, delete household data, or delete your account from Settings.</p>
    <h2>Sharing</h2>
    <p>Grove does not monitor your entries. Information leaves your account when you deliberately export or share it, or when required to operate and secure the service.</p>
  </Page>
)

export default PrivacyPage
