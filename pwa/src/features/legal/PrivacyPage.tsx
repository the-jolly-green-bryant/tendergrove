import { Page } from '../../components/Page'

const PrivacyPage = () => (
  <Page title="Privacy Policy" backHref="/settings" className="legal-page">
    <p className="legal-page__meta"><strong>Effective date:</strong> July 24, 2026</p>
    <h1>Grove Care Privacy Policy</h1>
    <p>This Privacy Policy describes how Grove Care (“Grove,” “we,” “us,” or “our”) collects, uses, stores, and discloses information when you use the Grove application, website, and related services (collectively, the “Service”).</p>

    <h2>1. Information we collect</h2>
    <p><strong>Account information.</strong> We collect information used to create and secure your account, such as your email address, authentication identifiers, and sign-in information supplied by an identity provider.</p>
    <p><strong>Care and observation information.</strong> We collect information you choose to enter about yourself or another person, including names, roles, photographs, observations, indicators, check-ins, events, notes, medications or interventions mentioned in notes, safety-plan information, and appointment-preparation content.</p>
    <p><strong>Technical information.</strong> We may process device, browser, operating-system, network, diagnostic, security, and service-usage information needed to operate, protect, troubleshoot, and improve the Service.</p>
    <p><strong>Product and aggregate wellness analytics.</strong> We collect limited events such as broad screen categories, completion of check-ins or onboarding, report downloads, collaboration activation, the number and general roles of people tracked, and coarse wellness, strain, observation-count, and data-coverage ranges. Analytics events do not contain names, photographs, notes, custom signal or event labels, raw check-in answers, incident dates, report text, or person identifiers. These records remain associated with the authenticated account for access control and deletion, so they are pseudonymous rather than anonymous.</p>

    <h2>2. How we use information</h2>
    <p>We use information to provide and secure the Service; authenticate users; store and organize observations; generate timelines, calculations, patterns, and reports; recover drafts and recent data; provide reminders you request; respond to support requests; prevent misuse; comply with law; understand adoption, retention, household composition, and aggregate severity ranges; and maintain, analyze, and improve Grove.</p>

    <h2>3. Sensitive and health-related information</h2>
    <p>Grove may contain sensitive health-related and family information. Grove is a consumer observation tool and is not, solely by offering the Service directly to consumers, a health-care provider, health plan, or health-care clearinghouse. Information in a consumer app is not necessarily protected by HIPAA. We handle information according to this Policy and applicable law.</p>

    <h2>4. Information about children and other people</h2>
    <p>Grove is intended for adults. It is not directed to children under 13, and children may not create accounts. You may enter information about another person only when you have the legal authority, consent, or other lawful basis to do so. You are responsible for choosing what information to record and share.</p>

    <h2>5. How information is disclosed</h2>
    <p>We may disclose information to infrastructure, authentication, hosting, storage, communications, security, analytics, and support providers acting on our behalf; to collaborators you expressly authorize; when you export or share a report; to protect a person, Grove, or others from fraud, abuse, security threats, or legal harm; in connection with a merger, financing, acquisition, reorganization, or sale of assets; or when required by law.</p>
    <p>We do not sell personal information or use health-related information for targeted advertising. We do not disclose personal information to third parties for their own direct marketing.</p>

    <h2>6. Storage, security, and device copies</h2>
    <p>Signed-in records are stored using the configured AWS Amplify services with account-based authorization. Data may also be stored locally on your device to preserve drafts, reminders, safety-plan information, and recent records during connectivity problems. Cloud providers and device platforms provide security controls, including encryption in transit and at rest where configured. No system is completely secure, and you should protect access to your device and account.</p>

    <h2>7. Retention</h2>
    <p>We retain account, care, and account-linked analytics information while your account is active and as needed to provide and improve the Service. You may delete household information or your account from Settings. Account deletion removes account-linked analytics records before removing the sign-in account. We may retain limited information when reasonably necessary for security, fraud prevention, legal compliance, dispute resolution, backup integrity, or enforcement of agreements.</p>

    <h2>8. Your choices and rights</h2>
    <p>Depending on your location, you may have rights to access, correct, export, delete, or restrict certain uses of personal information. Grove provides export, local-copy clearing, household deletion, and account deletion controls in Settings. You may also withdraw collaborator access and change reminder preferences.</p>

    <h2>9. Data incidents</h2>
    <p>We maintain procedures for investigating unauthorized access or disclosure. When required by applicable law, we will notify affected individuals and appropriate authorities of a qualifying breach.</p>

    <h2>10. International use</h2>
    <p>The Service is operated from the United States. If you use Grove elsewhere, information may be processed in the United States or other locations where service providers operate, subject to applicable safeguards.</p>

    <h2>11. Changes to this Policy</h2>
    <p>We may update this Policy as Grove changes. We will post the revised version with a new effective date and provide additional notice when required.</p>

    <h2>12. Contact</h2>
    <p>Questions or privacy requests may be sent to Bryant James at <a href="mailto:bri@bryantjames.com">bri@bryantjames.com</a>.</p>
  </Page>
)

export default PrivacyPage
