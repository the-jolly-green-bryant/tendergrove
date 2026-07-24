/** Research concepts associated with a published source. */
export type ResearchSupport =
  | 'longitudinal-observation'
  | 'ema'
  | 'instability'
  | 'persistence'
  | 'youth-dynamics'
  | 'methodology'

/** Structured publication metadata displayed on the methodology page. */
export interface ResearchReference {
  id: string
  title: string
  authors: string
  journal: string
  year: number
  doi: string
  pmid: string
  pmcid?: string
  supports: ResearchSupport[]
}

export const RESEARCH_METHODOLOGY_PATH = '/about/research'

export const researchReferences: ResearchReference[] = [
  {
    id: 'reitsema-2022',
    title:
      'Emotion dynamics in children and adolescents: A meta-analytic and descriptive review',
    authors: 'Reitsema et al.',
    journal: 'Emotion',
    year: 2022,
    doi: '10.1037/emo0000970',
    pmid: '34843305',
    supports: ['youth-dynamics', 'instability', 'longitudinal-observation'],
  },
  {
    id: 'russell-2020',
    title:
      'Annual Research Review: Ecological momentary assessment studies in child psychology and psychiatry',
    authors: 'Russell and Gajos',
    journal: 'Journal of Child Psychology and Psychiatry',
    year: 2020,
    doi: '10.1111/jcpp.13204',
    pmid: '31997358',
    pmcid: 'PMC8428969',
    supports: ['ema', 'youth-dynamics', 'methodology'],
  },
  {
    id: 'trull-2015',
    title: 'Affective Dynamics in Psychopathology',
    authors: 'Trull et al.',
    journal: 'Emotion Review',
    year: 2015,
    doi: '10.1177/1754073915590617',
    pmid: '27617032',
    pmcid: 'PMC5016030',
    supports: ['instability', 'persistence', 'longitudinal-observation'],
  },
  {
    id: 'ebner-priemer-2009',
    title:
      'Analytic strategies for understanding affective (in)stability and other dynamic processes in psychopathology',
    authors: 'Ebner-Priemer et al.',
    journal: 'Journal of Abnormal Psychology',
    year: 2009,
    doi: '10.1037/a0014868',
    pmid: '19222325',
    supports: ['instability', 'methodology'],
  },
  {
    id: 'baltasar-tello-2018',
    title:
      'Ecological Momentary Assessment and Mood Disorders in Children and Adolescents: A Systematic Review',
    authors: 'Baltasar-Tello et al.',
    journal: 'Current Psychiatry Reports',
    year: 2018,
    doi: '10.1007/s11920-018-0913-z',
    pmid: '30069650',
    supports: ['ema', 'youth-dynamics', 'methodology'],
  },
]
