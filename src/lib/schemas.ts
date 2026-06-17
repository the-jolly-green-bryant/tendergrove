import { z } from 'zod';

const severity = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const childCheckInSchema = z.object({
  id: z.string(), createdAt: z.string(), mood: z.enum(['regulated','fragile','distressed','shutdown','agitated']),
  severity, sleepQuality: severity, toiletingChange: z.boolean(), schoolDay: z.boolean(), notes: z.string().optional(),
});

export const incidentSchema = z.object({
  id: z.string(), createdAt: z.string(), severity, durationMinutes: z.number(), trigger: z.string().optional(),
  behavior: z.string(), intervention: z.string().optional(), recovered: z.boolean(), notes: z.string().optional(),
});

export const parentCareSchema = z.object({
  id: z.string(), createdAt: z.string(), brushedTeeth: z.boolean(), ateMeal: z.boolean(), drankWater: z.boolean(),
  sleptEnough: z.boolean(), stress: severity, notes: z.string().optional(),
});
