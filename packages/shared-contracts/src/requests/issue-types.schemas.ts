import { z } from 'zod';

export const issueTypeIds = [
  'dripping-faucet',
  'under-sink-leak',
  'clogged-toilet',
  'slow-drain',
  'shower-bath-leak',
] as const;

export const issueTypeIdSchema = z.enum(issueTypeIds);

export const issueTypeSchema = z.object({
  id: issueTypeIdSchema,
  label: z.string().min(1),
  shortDescription: z.string().min(1),
  urgencyCue: z.string().min(1),
});

export const issueTypeListSchema = z.array(issueTypeSchema);

export const issueSelectionSchema = z.object({
  issueTypeId: issueTypeIdSchema,
});

export const supportedIssueTypes = issueTypeListSchema.parse([
  {
    id: 'dripping-faucet',
    label: 'Dripping faucet',
    shortDescription: 'Water keeps dripping from a sink or fixture that should be off.',
    urgencyCue: 'Usually manageable',
  },
  {
    id: 'under-sink-leak',
    label: 'Leak under sink',
    shortDescription: 'Water is pooling or dripping inside the cabinet below a sink.',
    urgencyCue: 'Act quickly',
  },
  {
    id: 'clogged-toilet',
    label: 'Clogged toilet',
    shortDescription: 'The toilet is blocked, backing up, or close to overflowing.',
    urgencyCue: 'Priority help',
  },
  {
    id: 'slow-drain',
    label: 'Slow drain',
    shortDescription: 'Water drains slowly from a sink, tub, or shower.',
    urgencyCue: 'Good to catch early',
  },
  {
    id: 'shower-bath-leak',
    label: 'Shower or bath leak',
    shortDescription: 'Water is leaking around a tub, shower fixture, or visible pipe.',
    urgencyCue: 'Prevent water damage',
  },
]);
