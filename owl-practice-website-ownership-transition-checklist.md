# Owl Practice Website Ownership & Provider Transition Checklist

Prepared July 20, 2026 from a public, read-only review of the staging site at `https://owlpracticeca.wpenginepowered.com/`.

## Purpose

This document defines what Owl Practice should receive, control, verify, and archive before ending its relationship with the current website provider. The goal is not merely to obtain a WordPress export. Complete ownership means the client controls the domain, hosting, code, content, media, licensed software, translations, forms, analytics, advertising integrations, security, documentation, and recovery materials needed to operate or move the site without the old provider.

## Executive summary: do not terminate the old provider yet

Do not cancel hosting, licenses, agency accounts, or support until every item marked **Launch blocker** below has been received and independently verified.

The reviewed staging site is a WordPress build hosted on WP Engine and appears to use:

- A custom child theme named `owlpracticeca`, built on GeneratePress.
- GeneratePress Premium and GenerateBlocks Pro.
- Weglot for English/French localization.
- HubSpot tracking and interactive/embed services.
- Unbounce embed infrastructure.
- Google Tag Manager, two Google Analytics 4 properties, and Google Ads conversion tracking.
- Microsoft/Bing Ads, Meta Pixel, LinkedIn Insight Tag, Reddit Ads, The Trade Desk/Adsrvr, and WebFX CAPI tracking.
- YouTube embeds.
- CDN-hosted Swiper assets.
- External help-center, support, status, signup, and social accounts.

These dependencies are not preserved by a basic WordPress XML export. The client needs the accounts, configuration, licenses, code, and historical data associated with them.

## 1. Domain, DNS, and brand identity — Launch blocker

Obtain and verify:

- Registrar name, account owner, login recovery email/phone, and current domain contact details for every production domain and defensive/alternate domain.
- Client-owned registrar access with at least two client administrators and MFA.
- Authorization/EPP codes if the domain will be transferred.
- Auto-renewal enabled on a client payment method; renewal dates documented.
- Complete DNS-zone export before any changes: A/AAAA, CNAME, MX, TXT, CAA, SRV, DKIM, DMARC, SPF, verification, subdomain, redirect, and wildcard records.
- Nameserver provider access and confirmation of who can modify DNS.
- Inventory of all subdomains, including production, staging, signup/application, help, support, status, and marketing/landing-page hosts.
- Current SSL/TLS certificate method, renewal ownership, and any custom certificates or certificate authority account.
- Brand assets in editable source form: logos, icons, favicons, illustration originals, photography licenses/releases, and brand guidelines.

Acceptance test: a client administrator can log in to the registrar and DNS provider without the old provider, export the zone, change account recovery details, and identify the production cutover records.

## 2. WP Engine hosting — Launch blocker

The staging hostname indicates WP Engine. Require either transfer of the entire WP Engine site/environment into a client-owned WP Engine account or a complete migration package to new hosting.

Obtain and verify:

- Client-owned WP Engine account with billing, account owner, and at least two client administrators.
- Ownership/access to production, staging, and development environments—not staging alone.
- Environment names, domains, PHP version, WordPress version, database version, storage limits, cache/CDN settings, redirects, cron jobs, and environment variables.
- All WP Engine user and SFTP/SSH accounts, with old-provider accounts removed after acceptance.
- A fresh full backup containing database plus the complete filesystem.
- At least one separate off-platform backup stored in client-controlled cloud storage.
- WP Engine backup/restore history and retention policy.
- Redirect rules, especially any stored in WP Engine rather than WordPress.
- CDN, cache exclusion, firewall, bot-management, and edge/security configuration.
- Server access/error logs available during the transition and a retention plan.
- Staging access/privacy protection and production `noindex` safeguards during cutover.

Acceptance test: the client or incoming provider restores the backup into a clean test environment and confirms the site works without access to the old provider's account.

## 3. WordPress administrator ownership — Launch blocker

Obtain and verify:

- Two named client WordPress Administrator accounts using client email addresses and MFA where supported.
- A complete list of WordPress users, roles, last-login information if available, and the business owner for each account.
- Removal or downgrade plan for agency, freelancer, shared, and former-employee accounts.
- Updated WordPress recovery/admin email and outgoing-system email addresses.
- Database credentials, salts/keys rotation plan, SFTP/SSH credentials, and WP-CLI access.
- Full database SQL dump and full `wp-content` directory, including uploads, plugins, themes, mu-plugins, and language files.
- `wp-config.php` and server configuration with secrets delivered securely—not placed in this checklist or ordinary email.
- Export of WordPress Customizer, block/global styles, reusable blocks/patterns, menus, widgets, custom fields, custom post types, taxonomies, and options.
- Inventory of must-use plugins and host-level plugins that may not appear in the ordinary Plugins screen.

Acceptance test: a clean restore retains page layouts, menus, translations, forms, redirects, SEO metadata, media, and integrations.

## 4. Custom code and source repository — Launch blocker

The public site loads a custom `owlpracticeca` theme with custom JavaScript and CSS. Require:

- Full, unminified source code for the custom theme and any custom plugins—not only the deployed/minified files.
- Git repository ownership transferred to a client-controlled GitHub/GitLab/Bitbucket organization.
- Complete commit history, branches, tags, releases, issues, pull requests, deployment workflows, and build scripts.
- Dependency manifests and lockfiles (`package.json`, lockfile, Composer files if used).
- Build and deployment instructions that work from a clean machine.
- Documentation for custom templates, blocks, shortcodes, hooks, API calls, scheduled jobs, and any hard-coded IDs/domains.
- Ownership and license assignment for all custom code, design work, copy, photography, and other deliverables under the service agreement.
- Written identification of any code the provider claims is reusable/proprietary and therefore will not transfer. Resolve this before termination.

Acceptance test: the incoming team can build the theme, deploy it to a clean environment, and reproduce the current site using only client-owned access.

## 5. Themes, plugins, and software licenses — Launch blocker

Create an exported plugin/theme inventory showing name, version, activation status, license owner, renewal date, and configuration owner. Public evidence specifically indicates:

| Component | Publicly observed version | Required transfer action |
|---|---:|---|
| WordPress | Build query indicates current core hash/version context; confirm in admin | Confirm supported version and update policy |
| GeneratePress theme | 3.6.1 | Put theme/license in client account |
| GeneratePress Premium | 2.5.5 | Transfer or buy client license; preserve settings |
| GenerateBlocks Pro | 2.5.0 | Transfer or buy client license; preserve global styles/assets |
| Weglot | 5.5 plugin | Transfer project/account, translations, glossary, DNS, usage plan |
| Swiper | 12 via jsDelivr | Document implementation and license/dependency pinning |
| Custom `owlpracticeca` theme | Custom | Transfer source, repository, IP, build instructions |

Also request the complete non-public list from WordPress admin, including inactive plugins. For every premium plugin, the client should own the account or have a written replacement plan. Agency licenses can stop receiving updates when the relationship ends and should not be treated as ownership.

## 6. Content, media, and information architecture — Launch blocker

Obtain:

- Complete database-backed content: pages, posts, drafts, revisions, authors, scheduled posts, custom post types, categories, tags, comments, menus, reusable patterns, and SEO fields.
- Complete original media library, including originals WordPress may not display, generated sizes, SVGs, PDFs, video, captions, alt text, attachment metadata, and licensing/releases.
- Original editable design files and copy documents used to create the site.
- Content inventory with URL, title, status, language, owner, last modified date, canonical URL, redirects, and replacement URL if retiring.
- Blog archive and category structure.
- Legal pages and approved source copy: privacy policy, terms and conditions, accessibility statement, and business associate agreement.
- Testimonials, headshots, institutional logos, and written permission/release records.

Publicly observed key content families include platform tour; scheduling; video therapy; client records; client portal; billing; secure messaging; integrated payments; trust/security; Smart Notes; solo, group, educator, and student solutions; pricing; referral program; switching; comparisons; demo/setup/signup; about/contact; Therapy Owl; blog; Practice Wisdom; marketplace; newsletter; privacy/terms/accessibility/BAA; English and French variants.

Important URL discrepancy to resolve: the homepage uses both `/scheduling/` and `/scheduling-3/`. Determine the canonical page and add/test a permanent redirect. Several links also use `http://` staging URLs; replace them with HTTPS production URLs.

## 7. Translation/localization (Weglot) — Launch blocker

The site exposes English and French paths and uses Weglot. Obtain:

- Client ownership/admin access to the Weglot organization and project.
- Current subscription, billing, word allowance, renewal date, and overage behavior.
- All translations, manually reviewed translations, exclusions, rules, glossary, language settings, URL strategy, collaborators, and translation memory if exportable.
- DNS/CNAME records used for translated subdomains, if any.
- Language-specific SEO titles, descriptions, canonicals, hreflang configuration, and sitemaps.
- A translation export outside Weglot where possible.
- Written confirmation that translations and glossary remain available after the agency account is removed.

Acceptance test: English/French switching, translated URLs, indexability, hreflang, forms, navigation, and redirects work in the client-owned account.

## 8. Forms, leads, CRM, and transactional flows — Launch blocker

Public pages route users to signup, demo, setup help, newsletter, contact/support, external application/signup, and embedded services. Obtain an end-to-end data-flow map for every form and CTA:

- Form name and page/URL.
- Tool that renders it (WordPress, HubSpot, Unbounce, external application, or other).
- Submission destination, list/pipeline, notification recipients, automation/workflow, consent language, retention, spam protection, and backup/export.
- API keys/webhooks and who owns each connected account.
- Historical submission export with field definitions and timestamps, handled according to privacy requirements.
- Confirmation/thank-you pages, email templates, autoresponders, lead-source attribution, hidden fields, and UTM handling.
- Test records and a documented safe way to test production workflows.

Public evidence indicates HubSpot account/portal ID `19873989` and an Unbounce universal embed. The client needs admin access to the corresponding accounts and should verify those IDs are theirs rather than the agency's.

Acceptance test: submit each form with a controlled test record; confirm it reaches the correct client-owned system, triggers the expected notifications/workflows, records consent and attribution, and produces no provider-dependent failure.

## 9. Analytics, tag management, advertising, and consent — Launch blocker

Transfer client ownership and admin access—not screenshots or read-only reports—to all relevant properties/accounts. Publicly observed identifiers include:

| System | Observed identifier/signal |
|---|---|
| Google Tag Manager | `GTM-KDX8JMT` |
| Google Analytics 4 | `G-CYPB1PS116`, `G-DDX8XRVFN7` |
| Google Ads | `AW-968446558` |
| Microsoft/Bing Ads | tag `187035824` |
| Meta Pixel | `755191455888686` |
| HubSpot | portal/account `19873989` |
| LinkedIn Insight | present; request partner ID from account/config |
| Reddit Ads | pixel present; request account/pixel ID |
| The Trade Desk/Adsrvr | advertiser `nlfl5qk` observed |
| WebFX CAPI | CAPI script present; request account/config ownership |

For each system obtain:

- Client-owned administrator access, billing ownership, recovery contacts, and MFA.
- Historical reports/data exports and retention settings.
- Conversion definitions, audiences, pixels, offline conversions, server-side/CAPI setup, cross-domain tracking, referral exclusions, filters, custom dimensions, and attribution settings.
- GTM container export (JSON), workspaces, versions, environments, triggers, variables, templates, consent settings, and server-side container if any.
- GA4 property links to Google Ads/Search Console/BigQuery and ownership of linked resources.
- Ad account campaigns, creative, audiences, negative lists, conversion history, merchant/catalog assets if any.
- Consent-management platform account and configuration. The public site loads a HubSpot banner script, but the actual consent design and regional behavior must be verified.
- Privacy/cookie inventory matching every tracker actually loaded.

Acceptance test: client admins can publish GTM, see real-time GA4 traffic, verify consent-mode behavior, and access every linked advertising account without provider assistance.

## 10. Search engine optimization and webmaster systems

Obtain and verify:

- Google Search Console owner-level access. A Google site-verification meta tag is present; ensure verification remains valid after migration.
- Bing Webmaster Tools and any other search console ownership.
- SEO plugin settings and license, XML sitemaps, robots.txt rules, schema, canonicals, Open Graph/Twitter metadata, breadcrumbs, redirects, 404 logs, and crawl settings.
- Full redirect map, including redirects stored at WP Engine, WordPress, CDN, or third-party edge provider.
- Current keyword/ranking reports and historical organic traffic benchmarks.
- Backlink/disavow files and agency SEO tooling exports where contractually included.

Critical launch check: the staging homepage currently declares `noindex, nofollow`, which is correct for staging. Confirm production does **not** inherit this directive at launch, while staging remains blocked from indexing.

## 11. Email, notifications, and deliverability — Launch blocker if forms send email

Obtain:

- Transactional email/SMTP provider account, domain authentication, API keys, sender identities, templates, logs, suppression lists, and billing.
- Exact WordPress mail configuration and form notification addresses.
- SPF, DKIM, and DMARC records and ownership of the DNS/provider accounts that manage them.
- Shared inboxes/aliases used for marketing, forms, privacy, legal, support, webmaster, and technical alerts.
- Monitoring for failed deliveries and expired credentials.

Rotate credentials after transfer, then test every notification and reply-to path.

## 12. External services and linked properties

Confirm ownership/admin access, current contracts, and continuity plans for:

- The production Owl Practice domain(s) and external signup/application flow.
- Help centers at `help.owlpracticesuite.com` and `help.owlpractice.ca` (appears to include Zendesk-hosted support).
- System status at `status.owlpractice.com`.
- YouTube channel and embedded video ownership.
- Facebook, LinkedIn, and any other social accounts.
- Newsletter platform, marketplace integrations, appointment/demo booking, referral-program tooling, and any chat/support widgets.
- CDN or asset hosts used outside WP Engine.
- Any privacy, accessibility, security-scanning, uptime, error-monitoring, or performance-monitoring tools.

For each, record business owner, technical owner, account URL, plan, billing source, recovery method, renewal, data-export procedure, and integration points.

## 13. Security, privacy, and compliance — Launch blocker

Because the brand serves Canadian mental-health practices, the marketing site and its lead flows should receive a privacy/compliance review even if they do not contain clinical records.

Require:

- Security contact, incident-response plan, breach-notification process, and escalation contacts.
- List of every third party receiving visitor or lead data, with data-processing agreements and lawful-purpose/consent documentation.
- Data residency and retention information for form/CRM/analytics systems.
- Privacy-policy and cookie disclosures reconciled to the trackers actually present.
- Access-control review; named accounts only, least privilege, MFA, and no shared passwords.
- Credentials/API keys rotated after acceptance; old provider users, keys, OAuth grants, SSH keys, and app passwords revoked.
- Vulnerability, malware, and integrity scans before and after migration.
- WordPress/core/plugin/theme update policy and owner.
- Backup encryption, restore testing, retention, and off-site copy.
- WAF/CDN/security plugin configuration and account ownership.
- CAPTCHA/spam-protection ownership and keys.
- Accessibility audit status and known remediation backlog.

## 14. Operations, documentation, and vendor handoff

Request a handoff package containing:

- Architecture diagram and data-flow diagram.
- Account and vendor inventory with owner, role, renewal, billing, and support contacts.
- Deployment, rollback, backup, restore, cache purge, DNS cutover, certificate renewal, user management, content publishing, and incident runbooks.
- Known issues, technical debt, pending updates, unsupported components, outstanding invoices, and contractual limitations.
- Maintenance history and current maintenance schedule.
- Baseline performance, uptime, traffic, conversions, and error-rate reports.
- List of active projects, upcoming launches, scheduled content, campaigns, experiments, and temporary redirects.
- 30–60 day transition support window with named old-provider contact and response expectations.

## 15. Required deliverables manifest

Ask the provider to deliver these as a dated, checksummed package:

1. Full production database SQL dump.
2. Full production filesystem archive, including all of `wp-content` and required configuration.
3. Separate media-library archive containing original files.
4. Full staging and development backups where they contain unreleased work.
5. Git repository with history and source/build assets.
6. Plugin/theme/version/license inventory.
7. WordPress user/role inventory.
8. DNS zone export and domain/subdomain inventory.
9. Redirect export from every layer.
10. GTM container JSON export and analytics/ad account inventory.
11. Weglot export/configuration inventory.
12. CRM/form schema, workflow inventory, and historical submission export where permitted.
13. SEO metadata, sitemap, robots, schema, and Search Console/Bing ownership record.
14. Vendor/account/renewal/billing inventory.
15. Credentials delivered through a secure password manager or secret-sharing channel.
16. Documentation/runbooks and known-issues register.
17. Signed IP assignment or contract confirmation covering code, design, copy, and assets.

## 16. Cutover plan

### Before cutover

- Freeze nonessential content/configuration changes or establish a final-delta process.
- Lower DNS TTL at least 24–48 hours in advance where appropriate.
- Take fresh source and destination backups.
- Crawl and export the production URL inventory, status codes, titles, canonicals, descriptions, headings, hreflang, structured data, image URLs, and redirects.
- Record current analytics, conversions, form delivery, Core Web Vitals/performance, and uptime baselines.
- Build and test on a temporary hostname with search indexing blocked.
- Test at least desktop and mobile navigation, all key templates, both languages, search, forms, emails, embeds, downloads, login/signup handoffs, analytics, consent, and 404 behavior.

### Cutover

- Apply final database/media delta.
- Confirm production URL replacement contains no staging hostname or HTTP links.
- Point DNS and validate TLS.
- Purge all caches/CDNs.
- Remove production `noindex`; keep staging non-indexed and access-controlled.
- Revalidate tags, consent, forms, email, redirects, canonical/hreflang, robots, sitemap, and external CTAs.
- Submit/update sitemaps only after validation.

### After cutover

- Monitor uptime, error logs, 404s, form submissions, email delivery, analytics, conversions, and search indexing for at least 14 days.
- Crawl the site and compare against the pre-cutover inventory.
- Rotate all secrets and remove old-provider access only after acceptance.
- Keep old hosting available and unchanged for an agreed rollback window, normally 14–30 days.
- Retain immutable pre- and post-cutover backups off-platform.

## 17. Acceptance criteria before the old provider is released

The transition is complete only when all of the following are true:

- The client controls domain, DNS, hosting, WordPress, repository, licenses, vendor accounts, billing, recovery methods, and MFA.
- An independent clean restore succeeds.
- All production URLs and redirects have been crawled and verified.
- English and French versions work, including Weglot configuration and SEO signals.
- All forms, CRM workflows, emails, signup/demo/setup paths, and external integrations pass end-to-end tests.
- Analytics and advertising conversions are visible in client-owned accounts and consent behavior is verified.
- No staging domains or `http://` links remain in production content/configuration.
- Production is indexable; staging remains `noindex` and preferably access-controlled.
- No provider-owned user, key, license, OAuth grant, or billing dependency remains without an explicit written exception.
- The client possesses source files, originals, historical data, documentation, and signed IP rights.
- Backups are stored both on-platform and in client-controlled off-platform storage, and restoration has been tested.
- A rollback window and handoff support contact are active.

## 18. Provider sign-off table

Use one row per account or deliverable and do not accept “handled by agency” as a final owner.

| Item | Current owner | New client owner/admin | Delivered date | Independently verified by/date | Exception or follow-up |
|---|---|---|---|---|---|
| Domain registrar |  |  |  |  |  |
| DNS provider |  |  |  |  |  |
| WP Engine |  |  |  |  |  |
| WordPress admin |  |  |  |  |  |
| Source repository |  |  |  |  |  |
| GeneratePress / GenerateBlocks |  |  |  |  |  |
| Weglot |  |  |  |  |  |
| HubSpot |  |  |  |  |  |
| Unbounce |  |  |  |  |  |
| GTM / GA4 / Search Console |  |  |  |  |  |
| Google Ads |  |  |  |  |  |
| Microsoft Ads |  |  |  |  |  |
| Meta / LinkedIn / Reddit / TTD |  |  |  |  |  |
| SMTP/email |  |  |  |  |  |
| Help center/support/status |  |  |  |  |  |
| Social/video accounts |  |  |  |  |  |
| Full backup and restore test |  |  |  |  |  |
| IP/source asset assignment |  |  |  |  |  |

## Scope limitation

This was a public front-end review of the staging site, not an authenticated audit of WordPress, WP Engine, DNS, source control, vendor accounts, or the production environment. The observed technologies and IDs are evidence for the handoff request, but the old provider must supply a complete authenticated inventory and the incoming team must verify it. Hidden plugins, server rules, inactive content, private integrations, production-only settings, and historical data cannot be proven from the public staging site alone.
