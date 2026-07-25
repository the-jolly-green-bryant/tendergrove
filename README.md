# Grove Care

<p align="center">
  Private-by-default tools for turning everyday caregiver observations into useful patterns.
</p>

<p align="center">
  <img alt="Ionic" src="https://img.shields.io/badge/Ionic-React-3880FF?logo=ionic&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="AWS Amplify" src="https://img.shields.io/badge/AWS-Amplify-FF9900?logo=awsamplify&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-proprietary-lightgrey">
</p>

> The product name is **Grove Care**. Existing package identifiers retain the
> `tendergrove` namespace for release continuity.

Grove Care helps parents and caregivers capture short observations, record distress
incidents, check in on caregiver wellbeing, and turn those entries into plain-language
reports. The workflow is designed to be fast enough for real life and cautious with
sensitive family data.

## Product principles

- **Capture first:** observations should take seconds, not become another chore.
- **Patterns over diagnoses:** summarize what happened without making clinical claims.
- **Caregiver context matters:** parent wellbeing and environmental context belong
  beside child observations.
- **Consent before cloud or AI:** sensitive records should not leave the device by
  default.
- **Useful exports:** data should become something a family can bring to a provider,
  school, or care-team conversation.

## Current capabilities

- Rapid observation and incident logging
- Child distress tracking and parent-care check-ins
- Local persistence with schema validation
- Reminder and deep-link flows
- Role-aware household experiences
- Plain-text reporting
- Web, PWA, Android, and iOS build paths
- AWS Amplify backend scaffolding for authentication and data services

## Technology

| Layer | Choice |
|---|---|
| UI | Ionic React, Vite |
| Language | TypeScript in strict mode |
| State | Zustand |
| Validation | Zod |
| Local persistence | Capacitor Preferences |
| Native bridge | Capacitor |
| Cloud | AWS Amplify, Cognito, DynamoDB |
| Testing/tooling | Playwright, ESLint, pnpm workspaces |

## Getting started

### Requirements

- Node.js compatible with pnpm 11
- pnpm 11
- JDK 21 and Android Studio for Android builds
- Xcode for iOS simulator builds
- AWS credentials only when working with an Amplify sandbox

```bash
git clone https://github.com/the-jolly-green-bryant/tendergrove.git
cd tendergrove
pnpm install
pnpm pwa
```

Useful workspace commands:

```bash
pnpm lint
pnpm build
pnpm format
pnpm sandbox
```

Native debug builds:

```bash
pnpm mobile:build:debug
pnpm mobile:build:ios
```

## Architecture

```text
pwa/src/
├── app/          routing and application shell
├── components/   reusable UI primitives
├── features/     product workflows grouped by capability
├── lib/          domain models, schemas, and persistence
├── stores/       shared application state
└── theme/        Ionic and product styling

amplify/           backend definitions and infrastructure
scripts/           data, release, test, and maintenance utilities
docs/              product and design references
```

Authentication follows a Cognito-hosted flow with federated identity-provider support:

```text
Grove Care → Cognito → identity provider → Cognito callback → Grove Care
```

## Privacy and safety

This codebase handles data that may include health, education, and family context.
Before production use:

- replace Preferences with an encrypted SQLite-backed store;
- define retention, deletion, and export policies;
- require explicit consent for any AI-assisted summary;
- keep raw child records off third-party services by default;
- complete threat modeling and professional privacy/legal review.

The application is not a diagnostic or emergency-response tool.

## Roadmap

- Encrypted, queryable on-device storage
- Multi-child and multi-caregiver data separation
- PDF, CSV, provider, and school/IEP exports
- Capacitor local notifications
- Consent-aware summaries with traceable source observations

See [TODO.md](TODO.md) for the working engineering backlog and
[docs/product-analytics.md](docs/product-analytics.md) for analytics guidance.

## License

Copyright retained by the project owner. All rights reserved.
