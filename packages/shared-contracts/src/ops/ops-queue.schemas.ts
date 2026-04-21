import { z } from 'zod'
import { opsInterventionSummarySchema } from './ops-intervention.schemas'

export const opsQueueStateSchema = z.enum([
  'new',
  'assignable',
  'needsClarification',
  'assigned',
  'blocked',
  'unavailable',
])

export const opsAssignmentStatusSchema = z.enum([
  'unassigned',
  'waitingForClarification',
  'dispatchInProgress',
  'blocked',
  'unavailable',
])

export const opsQueueItemSchema = z.object({
  publicId: z.string().min(1),
  issueLabel: z.string().min(1),
  addressSummary: z.string().min(1),
  queueState: opsQueueStateSchema,
  queueStateLabel: z.string().min(1),
  queueStateDetail: z.string().min(1),
  urgencyCue: z.string().min(1),
  assignmentStatus: opsAssignmentStatusSchema,
  assignmentStatusLabel: z.string().min(1),
  assignedOwnerLabel: z.string().min(1).nullable().optional(),
  intervention: opsInterventionSummarySchema.nullable(),
  receivedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  latestChangeSummary: z.string().min(1),
})

export const opsQueueSummarySchema = z.object({
  totalActive: z.number().int().nonnegative(),
  needsAttentionCount: z.number().int().nonnegative(),
  assignedCount: z.number().int().nonnegative(),
  blockedCount: z.number().int().nonnegative(),
  unavailableCount: z.number().int().nonnegative(),
})

export const opsQueueResponseSchema = z.object({
  items: z.array(opsQueueItemSchema),
  summary: opsQueueSummarySchema,
  refreshedAt: z.iso.datetime(),
})

export type OpsQueueState = z.infer<typeof opsQueueStateSchema>
export type OpsAssignmentStatus = z.infer<typeof opsAssignmentStatusSchema>
export type OpsQueueItem = z.infer<typeof opsQueueItemSchema>
export type OpsQueueSummary = z.infer<typeof opsQueueSummarySchema>
export type OpsQueueResponse = z.infer<typeof opsQueueResponseSchema>
