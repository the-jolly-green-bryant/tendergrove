# Grove product analytics

Grove stores product analytics in the authenticated Amplify Data backend. The
purpose is to measure activation, retention, feature adoption, household
composition, and coarse cohort wellness and Pattern Strain distributions without
copying care records into an analytics system.

Google Analytics uses the dedicated `Grove Care — Website & App` property
(`548089613`) and the `Grove Care Web & App` stream (`G-X0MQYM9M9X`). The shared
web bundle labels every session with `app_surface` (`web` or `app`) and
`app_platform`, and suppresses local browser-development traffic. The
authenticated Amplify analytics described below remains the source for Grove's
privacy-safe product and cohort reporting.

## Privacy boundary

`pwa/src/lib/productAnalytics.ts` is the only supported analytics entry point.
Every event has a fixed TypeScript payload and a runtime sanitizer that creates a
new object containing only approved fields.

Never add any of the following to analytics:

- names, email addresses, account IDs, household IDs, or person IDs;
- photographs or media URLs;
- notes, report text, custom signal names, custom event labels, or other free text;
- raw check-in answers or arrays of selected record IDs;
- incident, appointment, medication, or observation dates;
- exact wellness values when a coarse band answers the product question.

Analytics rows are owner-authorized and therefore pseudonymous, not anonymous.
Members of the Amplify `Admin` group can read aggregate records. Account deletion
deletes the owner's analytics rows before deleting the Cognito user.

## Event dictionary

| Event                   | Approved properties                                                                                                   | Product question                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `screen_viewed`         | broad screen category                                                                                                 | Which product areas are used?                                       |
| `household_profile`     | people count, self-tracking flag, role groups, 10-point wellness bands, Pattern Strain bands, observation-count bands | Who is Grove serving and what severity mix is represented?          |
| `check_in_saved`        | created/updated, selected-signal count band, selected-event count band, note-present flag                             | Are caregivers sustaining useful documentation?                     |
| `onboarding_completed`  | people count, self-tracking flag                                                                                      | Does onboarding create the intended two-person starting household?  |
| `report_downloaded`     | PDF format, wellness band, Pattern Strain band                                                                        | Are high- and lower-strain households reaching the flagship output? |
| `collaboration_granted` | read-only access                                                                                                      | Is caregiver collaboration being adopted?                           |

## Cohort metrics to calculate

- signup to onboarding completion;
- onboarding completion to first and second check-in;
- weekly active documenting households;
- check-ins per active household per week;
- households reaching their first report download;
- report downloads by wellness and strain band;
- median people tracked and percentage tracking themselves;
- wellness and strain distribution by role group;
- collaboration activation rate;
- four-week and eight-week documenting-household retention.

Do not publish small-cell wellness or strain breakdowns. Combine or suppress
cohorts with fewer than 10 households to reduce re-identification risk.
