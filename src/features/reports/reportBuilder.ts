import { ChildCheckIn, Incident, ParentCareLog } from '../../lib/domain';

export function buildPlainTextReport(checkIns: ChildCheckIn[], incidents: Incident[], parentCare: ParentCareLog[]): string {
  const avg = (nums: number[]) => nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 'n/a';
  const lines = [
    'Special Needs Tracker Report',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'Summary',
    `Child check-ins: ${checkIns.length}`,
    `Average child distress: ${avg(checkIns.map(x => x.severity))}`,
    `Incidents: ${incidents.length}`,
    `High severity incidents: ${incidents.filter(x => x.severity >= 4).length}`,
    `Average parent stress: ${avg(parentCare.map(x => x.stress))}`,
    '',
    'Recent child observations',
    ...checkIns.slice(0, 10).map(x => `- ${new Date(x.createdAt).toLocaleDateString()}: mood=${x.mood}, distress=${x.severity}, schoolDay=${x.schoolDay}, toiletingChange=${x.toiletingChange}${x.notes ? `, notes=${x.notes}` : ''}`),
    '',
    'Recent incidents',
    ...incidents.slice(0, 10).map(x => `- ${new Date(x.createdAt).toLocaleDateString()}: severity=${x.severity}, duration=${x.durationMinutes}m, behavior=${x.behavior}, trigger=${x.trigger ?? 'unknown'}, intervention=${x.intervention ?? 'none noted'}, recovered=${x.recovered}`),
  ];
  return lines.join('\n');
}
