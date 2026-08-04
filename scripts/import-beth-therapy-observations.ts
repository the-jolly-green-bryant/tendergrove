/**
 * Add Beth's dated observations from the Therapy Files archive.
 *
 * This import is deliberately additive and idempotent:
 * - existing check-ins are never deleted;
 * - existing checked signals and events are never removed;
 * - existing notes are preserved and source notes are only appended;
 * - running the script again produces no duplicate dates or note text.
 *
 * Dry run: npx tsx scripts/import-beth-therapy-observations.ts
 * Apply:   npx tsx scripts/import-beth-therapy-observations.ts --apply
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const REGION = 'us-west-2'
const PERSON_TABLE = 'Person-dwoibtanijguhot2azh4z4z4ua-NONE'
const INDICATOR_TABLE = 'Indicator-dwoibtanijguhot2azh4z4z4ua-NONE'
const CHECK_IN_TABLE = 'CheckIn-dwoibtanijguhot2azh4z4z4ua-NONE'
const BETH_ID = 'e665be9f-22e8-493c-93a6-5f1e1de35bab'
const apply = process.argv.includes('--apply')

type AttributeValue = {
  S?: string
  N?: string
  BOOL?: boolean
  NULL?: boolean
  L?: AttributeValue[]
  M?: Record<string, AttributeValue>
}

interface ScanResult {
  Items?: Array<Record<string, AttributeValue>>
}

interface ObservationImport {
  date: string
  signals: string[]
  note: string
}

const observations: ObservationImport[] = [
  {
    date: '2024-02-14',
    signals: [
      'Emotional withdrawal',
      'Worked toward a goal',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: Charlie Health individual therapy note dated 2/14/2024. Intake described dysregulation at home and strained family connection. Beth engaged fully, identified goals of spending more time with family and reading for self-care, and participated in treatment and safety planning.',
  },
  {
    date: '2024-02-21',
    signals: [
      'Meltdown',
      'Escalated or harmful family communication',
      'Difficulty recovering from distress',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: Charlie Health individual therapy note dated 2/21/2024. Parents reported an argument in which Beth hit her mother and threw items in her room. Beth identified anger and sadness, took accountability, described needing space when upset, and successfully processed her emotions, actions, and thoughts.',
  },
  {
    date: '2024-02-28',
    signals: [
      'Anxiety',
      'Difficulty recovering from distress',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: Charlie Health individual therapy note dated 2/28/2024. Beth reported irritability, feeling unheard, and difficulty managing anger and sadness. She remained joyful and cooperative in session and effectively described how she thinks and acts with different emotions.',
  },
  {
    date: '2024-03-06',
    signals: [
      'Anxiety',
      'Emotional withdrawal',
      'Reduced participation',
      'Risky behavior',
      'Difficulty recovering from distress',
    ],
    note: 'Source: Charlie Health psychiatric evaluation dated 3/6/2024. Parent and client history described recurrent dysregulated behavior, irritability, depression, apathy, fatigue, concentration difficulty, social withdrawal, anxiety, sleep difficulty, intermittent passive suicidal thoughts, and suicidal statements of uncertain intent.',
  },
  {
    date: '2024-03-13',
    signals: [
      'Anxiety',
      'Worked toward a goal',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: Charlie Health individual therapy note dated 3/13/2024. Beth rated depression 4/10 and anxiety 5/10, presented as anxious and restless, engaged openly, and expressed motivation to learn additional ways to reduce symptoms.',
  },
  {
    date: '2024-03-20',
    signals: [
      'Escalated or harmful family communication',
      'Conflict at home',
      'Difficulty recovering from distress',
      'Worked toward a goal',
    ],
    note: 'Sources: Charlie Health individual, family, and psychiatric notes dated 3/20/2024. Beth reported feeling good and beginning online school. Parents described aggression and lashing out when limits or serious topics were discussed. The psychiatric follow-up documented a calmer recent period with no severe behavioral spike for roughly two and a half weeks.',
  },
  {
    date: '2024-03-27',
    signals: [
      'Meltdown',
      'Anxiety',
      'Escalated or harmful family communication',
      'Difficulty recovering from distress',
      'Addresses feelings without significant prompting',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 3/27/2024. Beth rated depression 7/10 and anxiety 5/10 and described screaming, stomping away, slamming her door, striking walls, and later regretting hurtful statements. Family therapy documented a communication breakdown and frequent concern about yelling.',
  },
  {
    date: '2024-04-03',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
      'Positive social interaction',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 4/3/2024. Beth reported depression 0/10, no recent anxiety, improved anger management, and a positive spring-break week. Her father also reported improved attitude and behavior, and the family held a positive weekly celebration.',
  },
  {
    date: '2024-04-10',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
      'Positive social interaction',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 4/10/2024. Beth reported depression and anxiety at 0/10, no recent angry outbursts, improved behavior, family pizza and movie time, and learning anger-management skills in therapy.',
  },
  {
    date: '2024-04-17',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: Charlie Health individual therapy note dated 4/17/2024. Beth reported no recent depression or anxiety, successful online schooling, and using skills from individual and group therapy when needed.',
  },
  {
    date: '2024-04-18',
    signals: [
      'Meltdown',
      'Escalated or harmful family communication',
      'Conflict at home',
      'Difficulty recovering from distress',
    ],
    note: 'Source: Charlie Health family therapy note dated 4/18/2024. Parents described an earlier episode after a teacher conference involving swearing, throwing items, kicking a car seat, screaming, and hurtful statements, with ongoing strain in communication at home.',
  },
  {
    date: '2024-04-24',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
      'Positive social interaction',
    ],
    note: 'Source: Charlie Health individual therapy note dated 4/24/2024. Beth rated depression and anxiety at 0/10, described a good week and a month of earning the family pizza celebration, and practiced skills for reacting to problems and embracing change.',
  },
  {
    date: '2024-04-25',
    signals: [
      'Escalated or harmful family communication',
      'Conflict at home',
      'Difficulty recovering from distress',
    ],
    note: 'Source: Charlie Health family therapy note dated 4/25/2024. Parents described disrespect, anger, yelling, large emotions, difficulty following home expectations, and a household feeling of walking on eggshells, while noting the week was still better than earlier periods.',
  },
  {
    date: '2024-05-01',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
      'Positive social interaction',
    ],
    note: 'Sources: Charlie Health individual therapy and psychiatric follow-up dated 5/1/2024. Beth reported depression and anxiety at 0/10 and five consecutive weeks earning the family celebration by using learned skills. Parent reported a recent frustrated response without prior aggression or profanity and improved school performance after support.',
  },
  {
    date: '2024-05-02',
    signals: [
      'Conflict at home',
      'Using Coping Skills',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: Charlie Health family therapy note dated 5/2/2024. Family discussed continuing strain around respect and contributions at home while also reporting improved behavior. Beth described working hard to reduce anger and use skills learned in treatment.',
  },
  {
    date: '2024-05-08',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: Charlie Health individual therapy note dated 5/8/2024. Beth reported depression and anxiety at 0/10. The therapist documented a reduction in angry outbursts from five days per week to two and a reduction in frequent tiredness while Beth continued using learned skills.',
  },
  {
    date: '2024-05-09',
    signals: ['Using Coping Skills', 'Worked toward a goal'],
    note: 'Source: Charlie Health family therapy note dated 5/9/2024. Father reported progress in Beth’s use of coping skills for irritability and anger, with continued work needed on communication and focus on schoolwork.',
  },
  {
    date: '2024-05-15',
    signals: ['Escalated or harmful family communication', 'Using Coping Skills'],
    note: 'Source: Charlie Health individual therapy note dated 5/15/2024. Beth reported saying several things in anger earlier in the week while rating depression and anxiety at 0/10. The session focused on emotion regulation and interpersonal-effectiveness skills.',
  },
  {
    date: '2024-05-16',
    signals: ['Using Coping Skills', 'Worked toward a goal'],
    note: 'Source: Charlie Health family therapy note dated 5/16/2024. Father described improvement in Beth’s attitude and handling of anxiety and irritability, while noting that continued family support would be needed when symptoms arose.',
  },
  {
    date: '2024-05-22',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
      'Positive social interaction',
    ],
    note: 'Source: Charlie Health individual therapy note dated 5/22/2024. Beth rated depression and anxiety at 0/10 and described being happier and having fewer blowups. Her father reported that aggression and violent behavior no longer stopped the household’s entire day.',
  },
  {
    date: '2024-06-03',
    signals: [
      'Completed responsibilities',
      'Positive social interaction',
      'Worked toward a goal',
    ],
    note: 'Source: Charlie Health psychiatric follow-up dated 6/3/2024. Beth and her father reported medication adherence, enjoyment of online school, friendships in class, no negative medication effects, and no acute safety concerns.',
  },
  {
    date: '2024-06-10',
    signals: [
      'Meltdown',
      'Escalated or harmful family communication',
      'Conflict at home',
      'Difficulty recovering from distress',
      'School concern',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 6/10/2024, describing the prior Friday. A school-related computer limit led to yelling, name-calling, kicking, punching, and damage in Beth’s room. Parents reported that available calming supports were not used during the episode.',
  },
  {
    date: '2024-06-17',
    signals: ['Anxiety', 'Difficulty recovering from distress'],
    note: 'Sources: Charlie Health individual therapy and psychiatric follow-up dated 6/17/2024. Beth reported low depression and anxiety but poor sleep. The psychiatric review described behavioral episodes as less frequent over recent months but potentially more intense, including a significant recent outburst involving physical aggression.',
  },
  {
    date: '2024-06-26',
    signals: [
      'Anxiety',
      'School concern',
      'Escalates without requesting support',
      'Difficulty recovering from distress',
    ],
    note: 'Source: Charlie Health psychiatric follow-up dated 6/26/2024. Parents described persistent attention, organization, follow-through, and hyperactivity concerns, along with occasional arguments and loss of temper. Outbursts were reported as less frequent but more intense.',
  },
  {
    date: '2024-07-01',
    signals: [
      'Anxiety',
      'Emotional withdrawal',
      'Conflict at home',
      'Addresses feelings without significant prompting',
      'Using Coping Skills',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 7/1/2024. Beth described intermittent anger, sadness, loneliness, tiredness, and difficulty discussing past experiences, while also reporting recent improvement in anger and identifying supportive people and coping strategies.',
  },
  {
    date: '2024-07-08',
    signals: [
      'Using Coping Skills',
      'Worked toward a goal',
      'Completed responsibilities',
      'Positive social interaction',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 7/8/2024. Beth rated depression 0/10 and anxiety 1/10, reported medication adherence and effective use of reading and building activities as coping strategies, and discussed future goals. Parents described the week as going well.',
  },
  {
    date: '2024-07-15',
    signals: ['Anxiety', 'Using Coping Skills', 'Worked toward a goal'],
    note: 'Sources: Charlie Health individual therapy and psychiatric follow-up dated 7/15/2024. Beth described anxiety, worry, difficulty relaxing, and tiredness while remaining engaged and motivated to manage symptoms. Parent reported increased creativity and patience, and Beth identified coloring and other coping strategies.',
  },
  {
    date: '2024-07-29',
    signals: [
      'Anxiety',
      'Reduced participation',
      'School concern',
      'Using Coping Skills',
      'Addresses feelings without significant prompting',
      'Positive social interaction',
    ],
    note: 'Sources: Charlie Health individual, family, and psychiatric notes dated 7/29/2024. Beth described anxiety triggers, physical anxiety symptoms, nightmares, journaling, and creative coping. Parents reported difficulty with school, social functioning, emotional regulation, and therapy engagement, while also noting treatment and medication progress.',
  },
  {
    date: '2024-08-05',
    signals: [
      'Reduced participation',
      'School concern',
      'Emotional withdrawal',
      'Difficulty recovering from distress',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 8/5/2024. Records described difficulty focusing, restlessness, oversleeping, limited engagement or growth in treatment, repetitive behavior patterns, and family concern about a possible future emotional blowup.',
  },
  {
    date: '2024-08-12',
    signals: [
      'Anxiety',
      'Difficulty transitioning',
      'Using Coping Skills',
      'Worked toward a goal',
    ],
    note: 'Sources: Charlie Health individual and family therapy notes dated 8/12/2024. Beth rated anxiety 10/10 around transition to a therapeutic residential school, with frequent dreams and uncertainty. She also showed willingness to engage with the change and practiced affirmations and coping strategies.',
  },
  {
    date: '2024-09-25',
    signals: [
      'Anxiety',
      'Risky behavior',
      'Reduced participation',
      'Emotional withdrawal',
      'Using Coping Skills',
    ],
    note: 'Source: Charlie Health individual therapy note dated 9/25/2024. Beth rated depression and anxiety 10/10, reported auditory experiences that sometimes told her to self-harm, fleeting self-harm thoughts without plan or intent, concentration difficulty, and spacing out. She resisted the instructions and reviewed a safety plan and coping strategies.',
  },
  {
    date: '2024-09-30',
    signals: [
      'Anxiety',
      'Difficulty recovering from distress',
      'Emotional withdrawal',
      'Reduced participation',
    ],
    note: 'Source: Charlie Health individual therapy note dated 9/30/2024. Beth rated depression 5/10 and anxiety 7/10 and described boredom, sadness, anger, difficulty regulating emotions, and frustration with treatment engagement. She denied current suicidal or self-harm thoughts during the assessment.',
  },
  {
    date: '2024-10-07',
    signals: [
      'Using Coping Skills',
      'Positive social interaction',
      'Worked toward a goal',
      'Completed responsibilities',
    ],
    note: 'Source: Charlie Health individual therapy note dated 10/7/2024. Beth rated depression and anxiety 1/10 and showed improved emotional regulation, treatment participation, activity engagement, journaling, music use, positive self-talk, and social interaction despite some sleep disturbance and loneliness.',
  },
  {
    date: '2024-10-09',
    signals: [
      'Anxiety',
      'Difficulty transitioning',
      'Conflict at home',
      'Difficulty recovering from distress',
    ],
    note: 'Source: Charlie Health family therapy note dated 10/9/2024. Family reported anxiety and pacing around changes, difficulty regulating emotions and accepting limits, and ongoing tension with parents and sibling after Beth’s return from residential treatment.',
  },
  {
    date: '2024-10-14',
    signals: [
      'Risky behavior',
      'Emotional withdrawal',
      'Reduced participation',
      'Anxiety',
      'Difficulty recovering from distress',
    ],
    note: 'Source: Charlie Health individual therapy note dated 10/14/2024. Beth described depression, anxiety, worthlessness, feeling that the family would be better without her in the home, superficial self-harm by scratching her arm, isolation in her room, and difficulty engaging with treatment.',
  },
  {
    date: '2024-10-16',
    signals: [
      'Meltdown',
      'Escalated or harmful family communication',
      'School concern',
      'Difficulty recovering from distress',
      'Reduced participation',
    ],
    note: 'Source: Charlie Health family therapy note dated 10/16/2024. Family described difficulty with emotional regulation, social cues, communication, school and family functioning, and anger-driven outbursts or destructive behavior when expectations were not met.',
  },
  {
    date: '2024-10-21',
    signals: [
      'Anxiety',
      'Reduced participation',
      'School concern',
      'Using Coping Skills',
      'Worked toward a goal',
    ],
    note: 'Source: Charlie Health individual therapy note dated 10/21/2024. Beth rated depression 1/10 and anxiety 3/10, described tiredness and reduced school or extracurricular participation, and used mindfulness, journaling, art, and social support while setting a goal to attend more school activities.',
  },
]

// CSTC daily logs supplied in August 2026. These entries intentionally cover
// only dates that did not already have a Beth check-in when this batch was
// prepared. Signal choices are conservative and notes retain mixed outcomes.
observations.push(
  {
    date: '2026-06-01',
    signals: [
      'Positive social interaction',
      'Addresses feelings without significant prompting',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/1/2026. Beth began the day pleasant and sociable with peers, expressed frustration and overwhelm about peer behavior, participated well in recreation group, appropriately explained that peer discussion of weight was triggering and that she had mixed feelings about her own weight, then played games with good interactions and completed evening expectations.',
  },
  {
    date: '2026-06-02',
    signals: [
      'Positive social interaction',
      'Completed responsibilities',
      'Worked toward a goal',
      'Showed independence',
    ],
    note: 'Source: CSTC daily report dated 6/2/2026. Beth completed schoolwork, helped peers who were struggling, played appropriately with peers, participated in art group, packed for camp and appropriately asked for help, completed hygiene, and went to bed on time without reported issues.',
  },
  {
    date: '2026-06-03',
    signals: [
      'Positive social interaction',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: CSTC daily report dated 6/3/2026. Beth completed hygiene and school without incident, ate meals, passed a swim test at the state park, played games at the campsite, maintained safety expectations, and had no significant behavioral issue documented.',
  },
  {
    date: '2026-06-04',
    signals: [
      'Using Coping Skills',
      'Positive social interaction',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/4/2026. Beth ate with peers and staff, drew and colored in the milieu, attended individual therapy, used a deep breath and a break when frustrated, returned to the activity, met meal and hygiene expectations, and had no major issue reported.',
  },
  {
    date: '2026-06-05',
    signals: [
      'Completed responsibilities',
      'Positive social interaction',
      'Addresses feelings without significant prompting',
      'Emotional withdrawal',
    ],
    note: 'Source: CSTC daily report dated 6/5/2026. Beth completed schoolwork and participated without cues during the day. In the evening she made negative self-comments, declined basketball, and told staff she felt frustrated about family therapy and a staff interaction; she later watched a movie in the milieu and completed hygiene without further major issue.',
  },
  {
    date: '2026-06-06',
    signals: [
      'Positive social interaction',
      'Completed responsibilities',
      'Difficulty recovering from distress',
    ],
    note: 'Source: CSTC daily report dated 6/6/2026. Staff documented positive morning behavior and interactions with no significant issue. Later Beth fixated on a peer comment, became argumentative and raised her voice when asked to wait, required prompting to request a personal time-out appropriately, and then took space and went to bed.',
  },
  {
    date: '2026-06-07',
    signals: ['Difficulty recovering from distress', 'Using Coping Skills', 'Anxiety'],
    note: 'Source: CSTC daily report dated 6/7/2026. Beth showed low frustration tolerance at breakfast, cursed, slammed her door, spoke loudly, and initially struggled with directions. She later displayed a calmer affect, made appropriate requests, followed safety directions, joined milieu activities, and discussed anxiety about an upcoming overnight pass and making a cope-ahead plan.',
  },
  {
    date: '2026-06-08',
    signals: [
      'Reduced participation',
      'Positive social interaction',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: CSTC daily report dated 6/8/2026. Beth participated only partly in school and voiced somatic complaints and boredom or tiredness, but maintained positive interactions, presented a poem at a school assembly, met expectations, participated in social-skills group, and followed staff directions during a cottage safety event.',
  },
  {
    date: '2026-06-09',
    signals: [
      'Positive social interaction',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: CSTC daily report dated 6/9/2026. Beth completed hygiene and classwork, participated in class, ignored peer negativity, attended a pizza party, colored and talked with staff, attended therapy, played a game, completed evening hygiene, and had no incident documented.',
  },
  {
    date: '2026-06-10',
    signals: [
      'Using Coping Skills',
      'Positive social interaction',
      'Completed responsibilities',
      'Difficulty recovering from distress',
    ],
    note: 'Source: CSTC daily report dated 6/10/2026. Beth completed hygiene, room tasks, and active school participation. She became upset with clinical staff before family therapy but appeared in a better mood afterward. During recreation she worked through peer-related frustration, continued playing, joined peers for games, and completed evening expectations without further issue.',
  },
  {
    date: '2026-06-11',
    signals: [
      'Completed responsibilities',
      'Positive social interaction',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: CSTC daily report dated 6/11/2026. Beth initially argued about hygiene expectations, then calmed, apologized, checked in with staff, and completed morning tasks. She cleaned her room, joined cottage games and groups, complied with a safety event, was receptive to coaching about unfinished packing, and ended the day without further incident.',
  },
  {
    date: '2026-06-14',
    signals: [
      'Difficulty recovering from distress',
      'Using Coping Skills',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/14/2026. Beth remained visibly frustrated for much of the day and at times yelled or argued, but followed staff directions. She later accepted coaching, returned to a water-balloon activity, independently excused herself for two minutes to regulate after a peer comment, returned to the milieu, and completed evening expectations.',
  },
  {
    date: '2026-06-15',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Positive social interaction',
    ],
    note: 'Source: CSTC daily report dated 6/15/2026. Beth completed schoolwork and responsibilities, needed cues for attitude toward staff, felt annoyed with peers but ignored the distraction through class, played well with others, participated in milieu and recreation activities, and completed hygiene.',
  },
  {
    date: '2026-06-17',
    signals: [
      'Difficulty recovering from distress',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: CSTC daily report dated 6/17/2026. Beth complained about a peer in front of that peer and argued with staff when redirected. She then completed all schoolwork and met expectations during recreation, meals, room transition, milieu activities, hygiene, and bedtime with no later issue reported.',
  },
  {
    date: '2026-06-19',
    signals: [
      'Paranoia',
      'Difficulty recovering from distress',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/19/2026. Beth began the day argumentative and assumed staff were speaking negatively about her when they were discussing another patient. After an apology process, staff documented no further significant issue; she later met expectations, colored in the milieu, completed hygiene, and watched cottage media without problems.',
  },
  {
    date: '2026-06-20',
    signals: [
      'Positive social interaction',
      'Addresses feelings without significant prompting',
      'Difficulty recovering from distress',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/20/2026. Beth began with positive peer and staff interactions and completed hygiene and a milieu chore. Later she became frustrated about a peer and agitated after a call with her father, but worked with staff to identify the emotion and rate its intensity, apologized to staff, joined activities, and completed the evening without further issue.',
  },
  {
    date: '2026-06-24',
    signals: [
      'Paranoia',
      'Difficulty recovering from distress',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: CSTC daily report dated 6/24/2026. Beth initially handled an assumption that staff were talking about her, then later cried, argued, and yelled during school, therapy, and peer interactions. She subsequently appeared regulated, colored in the milieu, and was receptive during a staff check-in about tone and interactions.',
  },
  {
    date: '2026-06-29',
    signals: [
      'Laughed or showed joy',
      'Addresses feelings without significant prompting',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/29/2026. Beth showed a bright, smiling affect, followed safety directions, completed medication and hygiene routines, and used an emotion tracker to identify feeling frustrated and rate the intensity two out of five. Staff noted minor complaints but no further significant issue, and she joined milieu activities and interacted with staff and peers.',
  },
  {
    date: '2026-06-30',
    signals: [
      'Difficulty recovering from distress',
      'School concern',
      'Positive social interaction',
      'Completed responsibilities',
    ],
    note: 'Source: CSTC daily report dated 6/30/2026. Beth argued at breakfast and needed repeated door-touch resets. In class she later threw a booklet and banged on the desk after repeated cues, then complied with a staff-directed time-out. She recovered, played cards with peers without incident, and met evening goals and hygiene expectations.',
  },
  {
    date: '2026-07-03',
    signals: [
      'Positive social interaction',
      'Difficulty recovering from distress',
      'Using Coping Skills',
    ],
    note: 'Source: CSTC daily report dated 7/3/2026. Beth spent much of the day quietly watching movies in the milieu and completed room and meal expectations. In the evening she became argumentative and yelled after limits and staff interactions, but with prompting requested a break appropriately, took a personal time-out, and went to bed.',
  },
  {
    date: '2026-07-06',
    signals: [
      'Using Coping Skills',
      'Completed responsibilities',
      'Worked toward a goal',
      'Positive social interaction',
    ],
    note: 'Source: CSTC daily report dated 7/6/2026. Beth used coping skills to de-escalate after a peer comment and again when frustrated with a teacher, participated and followed directions at school, ate lunch with peers, completed reading, and had a good day overall. She later slammed down her plate after a dinner comment, with no further escalation documented.',
  },
  {
    date: '2026-07-13',
    signals: [
      'Using Coping Skills',
      'Worked toward a goal',
      'Completed responsibilities',
      'Positive social interaction',
    ],
    note: 'Source: CSTC daily report dated 7/13/2026. When a peer repeatedly kicked her desk, Beth asked him to stop, requested a break, used coping skills, and talked through the problem. Staff praised her handling of the antagonism; she participated successfully at school, recreation, meals, milieu activities, hygiene, and bedtime.',
  },
  {
    date: '2026-07-17',
    signals: [
      'Positive social interaction',
      'Difficulty recovering from distress',
      'Addresses feelings without significant prompting',
    ],
    note: 'Source: CSTC daily report dated 7/17/2026. Beth met morning expectations and had positive interactions. In the evening she became argumentative with staff, declined dinner and initially resisted recreation, then communicated her frustrations, participated in pod time, and went to bed.',
  },
  {
    date: '2026-07-18',
    signals: [
      'Positive social interaction',
      'Completed responsibilities',
      'Worked toward a goal',
    ],
    note: 'Source: CSTC daily report dated 7/18/2026. Beth completed medication, hygiene, and room expectations, watched media with peers, and had a good recreational outing. Although she felt it was unfair that other peers could not attend, staff documented no behavioral issue; she later joined milieu activities, meals, pod time, and bedtime routines.',
  },
  {
    date: '2026-07-20',
    signals: [
      'Difficulty recovering from distress',
      'Resists Intervention',
      'Addresses feelings without significant prompting',
      'Using Coping Skills',
    ],
    note: 'Source: CSTC daily report dated 7/20/2026. Beth became disruptive and argumentative in class, rejected an offered personal time-out and coaching, and required a staff-directed time-out. She later took accountability. During another escalation she accepted coaching and used a personal time-out, then completed room, hygiene, milieu, and bedtime routines.',
  },
)

const aws = (args: string[]): string =>
  execFileSync('aws', args, {
    encoding: 'utf8',
    env: { ...process.env, AWS_EC2_METADATA_DISABLED: 'true' },
    stdio: ['ignore', 'pipe', 'inherit'],
  })

const unmarshall = (value: AttributeValue | undefined): unknown => {
  if (!value) return undefined
  if (value.S !== undefined) return value.S
  if (value.N !== undefined) return Number(value.N)
  if (value.BOOL !== undefined) return value.BOOL
  if (value.NULL) return null
  if (value.L) return value.L.map(unmarshall)
  if (value.M)
    return Object.fromEntries(
      Object.entries(value.M).map(([key, nested]) => [key, unmarshall(nested)]),
    )
  return undefined
}

const marshall = (value: unknown): AttributeValue => {
  if (value === null || value === undefined) return { NULL: true }
  if (typeof value === 'string') return { S: value }
  if (typeof value === 'number') return { N: String(value) }
  if (typeof value === 'boolean') return { BOOL: value }
  if (Array.isArray(value)) return { L: value.map(marshall) }
  if (typeof value === 'object')
    return {
      M: Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, marshall(nested)]),
      ),
    }
  throw new Error(`Unsupported DynamoDB value: ${typeof value}`)
}

const scan = (
  tableName: string,
  projection: string,
  names?: Record<string, string>,
): ScanResult =>
  JSON.parse(
    aws([
      'dynamodb',
      'scan',
      '--table-name',
      tableName,
      '--region',
      REGION,
      '--filter-expression',
      'personId = :personId',
      '--expression-attribute-values',
      JSON.stringify({ ':personId': { S: BETH_ID } }),
      '--projection-expression',
      projection,
      ...(names ? ['--expression-attribute-names', JSON.stringify(names)] : []),
      '--output',
      'json',
    ]),
  ) as ScanResult

const person = JSON.parse(
  aws([
    'dynamodb',
    'get-item',
    '--table-name',
    PERSON_TABLE,
    '--region',
    REGION,
    '--key',
    JSON.stringify({ id: { S: BETH_ID } }),
    '--output',
    'json',
  ]),
) as { Item?: Record<string, AttributeValue> }

if (person.Item?.displayName?.S !== 'Beth' || !person.Item.owner?.S)
  throw new Error('Beth record or owner could not be resolved safely.')

const owner = person.Item.owner.S
const indicators = scan(INDICATOR_TABLE, 'id,#name', { '#name': 'name' }).Items ?? []
const indicatorByName = new Map(
  indicators.flatMap((item) =>
    item.id?.S && item.name?.S ? [[item.name.S, item.id.S] as const] : [],
  ),
)
const missingSignals = [
  ...new Set(
    observations.flatMap((entry) =>
      entry.signals.filter((name) => !indicatorByName.has(name)),
    ),
  ),
]
if (missingSignals.length)
  throw new Error(`Beth is missing expected signals: ${missingSignals.join(', ')}`)

const existing = scan(CHECK_IN_TABLE, 'id,occurredAt,answersJson,note').Items ?? []
const existingByDate = new Map(
  existing.flatMap((item) =>
    item.id?.S && item.occurredAt?.S
      ? [[item.occurredAt.S.slice(0, 10), item] as const]
      : [],
  ),
)

const parseAnswers = (value: AttributeValue | undefined) => {
  const decoded = unmarshall(value)
  if (typeof decoded === 'string') {
    try {
      return JSON.parse(decoded) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return decoded && typeof decoded === 'object'
    ? (decoded as Record<string, unknown>)
    : {}
}

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []

const changes = observations.flatMap((entry) => {
  const signalIds = entry.signals.map((name) => indicatorByName.get(name)!)
  const current = existingByDate.get(entry.date)
  if (!current) return [{ type: 'create' as const, entry, signalIds }]

  const answers = parseAnswers(current.answersJson)
  const checked = [...new Set([...stringArray(answers.checked), ...signalIds])]
  const events = stringArray(answers.events)
  const currentNote = current.note?.S ?? ''
  const note = currentNote.includes(entry.note)
    ? currentNote
    : [currentNote.trim(), entry.note].filter(Boolean).join('\n\n')
  const changed =
    checked.length !== stringArray(answers.checked).length || note !== currentNote
  return changed
    ? [
        {
          type: 'update' as const,
          entry,
          id: current.id!.S!,
          answers: { ...answers, checked, events },
          note,
        },
      ]
    : []
})

const creates = changes.filter((change) => change.type === 'create')
const updates = changes.filter((change) => change.type === 'update')
console.log(
  `${apply ? 'Applying' : 'Dry run'}: ${creates.length} new Beth observations and ${updates.length} additive updates; ${observations.length - changes.length} already complete.`,
)
console.log(`Dates: ${changes.map((change) => change.entry.date).join(', ') || 'none'}`)

if (!apply) {
  console.log('No data changed. Re-run with --apply to perform the additive import.')
  process.exit(0)
}

for (const change of changes) {
  const now = new Date().toISOString()
  if (change.type === 'create') {
    const occurredAt = new Date(`${change.entry.date}T12:00:00`).toISOString()
    const item = {
      id: { S: randomUUID() },
      personId: { S: BETH_ID },
      owner: { S: owner },
      occurredAt: { S: occurredAt },
      answersJson: marshall({ checked: change.signalIds, events: [] }),
      note: { S: change.entry.note },
      createdAt: { S: now },
      updatedAt: { S: now },
      __typename: { S: 'CheckIn' },
    }
    aws([
      'dynamodb',
      'put-item',
      '--table-name',
      CHECK_IN_TABLE,
      '--region',
      REGION,
      '--item',
      JSON.stringify(item),
      '--condition-expression',
      'attribute_not_exists(id)',
    ])
  } else {
    aws([
      'dynamodb',
      'update-item',
      '--table-name',
      CHECK_IN_TABLE,
      '--region',
      REGION,
      '--key',
      JSON.stringify({ id: { S: change.id } }),
      '--update-expression',
      'SET answersJson = :answers, note = :note, updatedAt = :updatedAt',
      '--condition-expression',
      'attribute_exists(id) AND personId = :personId',
      '--expression-attribute-values',
      JSON.stringify({
        ':answers': marshall(change.answers),
        ':note': { S: change.note },
        ':updatedAt': { S: now },
        ':personId': { S: BETH_ID },
      }),
    ])
  }
}

console.log(
  `Import complete: created ${creates.length}, additively updated ${updates.length}, deleted 0.`,
)
