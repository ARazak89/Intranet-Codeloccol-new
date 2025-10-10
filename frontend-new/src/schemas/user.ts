import * as z from "zod";

export const editUserSchema = z.object({
  name: z.string({}).min(1, 'Nom est requis'),
  email: z.string().email('Email est requis'),
  password: z.string().optional().nullable(),
  role: z.string().min(1, 'Rôle est requis'),
  status: z.string().min(1, 'Statut est requis'),
  level: z.number().min(1, 'Niveau est requis'),
  daysRemaining: z.number().min(0, 'Jours restants est requis').optional(),
});     