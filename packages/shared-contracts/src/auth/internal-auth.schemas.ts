import { z } from 'zod'

export const internalUserRoleSchema = z.enum(['ops', 'support'])

export const internalAuthRequestSchema = z.object({
  email: z.email().trim().max(160),
  password: z.string().min(8).max(160),
})

export const internalAuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1),
  role: internalUserRoleSchema,
})

export const internalSessionSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresAt: z.iso.datetime(),
  issuedAt: z.iso.datetime(),
  user: internalAuthUserSchema,
})

export const internalOpsSessionSchema = z.object({
  scope: z.literal('ops'),
  message: z.string().min(1),
  user: internalAuthUserSchema,
})

export type InternalUserRole = z.infer<typeof internalUserRoleSchema>
export type InternalAuthRequest = z.infer<typeof internalAuthRequestSchema>
export type InternalAuthUser = z.infer<typeof internalAuthUserSchema>
export type InternalSession = z.infer<typeof internalSessionSchema>
export type InternalOpsSession = z.infer<typeof internalOpsSessionSchema>
