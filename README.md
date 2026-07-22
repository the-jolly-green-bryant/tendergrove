# Grove

Grove Care is the formal product name. Existing package identifiers retain the
`tendergrove` namespace for release continuity.

Startup-quality Ionic React starter for fast parent observations, child distress tracking, incident logging, parent-care checks, and plain-text reporting.

## Stack

- Ionic React + Vite
- TypeScript strict mode
- Zustand state management
- Capacitor Preferences local persistence
- Zod runtime validation
- Feature-based folders

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Important next production steps

1. Replace Capacitor Preferences with SQLite before heavy usage or multi-child support.
2. Add encrypted local storage if storing sensitive health or education records.
3. Add account auth only after the offline workflow feels right.
4. Add export formats: PDF, CSV, provider summary, school/IEP summary.
5. Add reminders with Capacitor Local Notifications.
6. Add consent-aware AI summaries. Do not upload child records by default.

## Architecture

```text
src/app               routing and shell
src/components        reusable UI primitives
src/features          product features
src/lib               domain, schemas, persistence
src/stores            app state
src/theme             Ionic styling
```

# Resources

## Authentication

```
App
  -> Cognito
    -> Google
      -> Cognito /oauth2/idpresponse
        -> App localhost:8100
```
