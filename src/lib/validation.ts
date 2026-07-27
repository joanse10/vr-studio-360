import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(1).max(100),
});

export const createCollectionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['public', 'private', 'closed']).default('private'),
  coverImage: z.string().max(2000).optional().default(''),
  rooms: z.array(z.object({
    name: z.string().min(1).max(100),
    panoramaUrl: z.string().min(1).max(2000),
    initialYaw: z.number().min(-180).max(180).default(0),
    initialPitch: z.number().min(-90).max(90).default(0),
    initialHfov: z.number().min(30).max(150).default(100),
  })).optional().default([]),
  beforeAfters: z.array(z.object({
    title: z.string().max(100).default(''),
    beforeImage: z.string().min(1).max(2000),
    afterImage: z.string().min(1).max(2000),
  })).optional().default([]),
});

export const updateCollectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['public', 'private', 'closed']).optional(),
  coverImage: z.string().max(2000).optional(),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  panoramaUrl: z.string().min(1).max(2000),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  panoramaUrl: z.string().min(1).max(2000).optional(),
  initialYaw: z.number().min(-180).max(180).optional(),
  initialPitch: z.number().min(-90).max(90).optional(),
  initialHfov: z.number().min(30).max(150).optional(),
});

export const createHotspotSchema = z.object({
  toRoomId: z.string().min(1),
  yaw: z.number().min(-180).max(180),
  pitch: z.number().min(-90).max(90),
  label: z.string().max(100).default('Перейти'),
});

export const createBeforeAfterSchema = z.object({
  title: z.string().max(100).default(''),
  beforeImage: z.string().min(1).max(2000),
  afterImage: z.string().min(1).max(2000),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  collectionId: z.string().min(1).optional().nullable(),
});

export const createShareLinkSchema = z.object({
  label: z.string().max(100).default(''),
});
