import { z } from 'zod';

export const opsAssignmentOwnerTypeSchema = z.enum([
  'provider',
  'internalOwner',
]);

export const opsAssignmentOwnerTypeLabelSchema = z.enum([
  'Provider',
  'Internal owner',
]);

export const opsAssignmentOwnerOptionSchema = z.object({
  ownerType: opsAssignmentOwnerTypeSchema,
  ownerTypeLabel: opsAssignmentOwnerTypeLabelSchema,
  ownerId: z.string().min(1),
  ownerLabel: z.string().min(1),
  description: z.string().min(1),
});

export const opsCurrentAssignmentSchema = z.object({
  ownerType: opsAssignmentOwnerTypeSchema,
  ownerTypeLabel: opsAssignmentOwnerTypeLabelSchema,
  ownerId: z.string().min(1),
  ownerLabel: z.string().min(1),
  assignedAt: z.iso.datetime(),
  note: z.string().min(1).optional(),
});

export const opsAssignmentStateSchema = z.object({
  currentAssignment: opsCurrentAssignmentSchema.nullable(),
  availableOwners: z.array(opsAssignmentOwnerOptionSchema).min(1),
  canAssign: z.boolean(),
  assignmentBlockedReason: z.string().min(1).nullable(),
});

export const opsAssignRequestSchema = z.object({
  ownerId: z.string().min(1),
  note: z.string().trim().max(280).optional(),
});

export type OpsAssignmentOwnerType = z.infer<
  typeof opsAssignmentOwnerTypeSchema
>;
export type OpsAssignmentOwnerTypeLabel = z.infer<
  typeof opsAssignmentOwnerTypeLabelSchema
>;
export type OpsAssignmentOwnerOption = z.infer<
  typeof opsAssignmentOwnerOptionSchema
>;
export type OpsCurrentAssignment = z.infer<typeof opsCurrentAssignmentSchema>;
export type OpsAssignmentState = z.infer<typeof opsAssignmentStateSchema>;
export type OpsAssignRequest = z.infer<typeof opsAssignRequestSchema>;
