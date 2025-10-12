import { z } from 'zod';

export const profileSchema = z.object({
  // Informations de base
  name: z
    .string()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  
  firstName: z
    .string()
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères')
    .optional()
    .or(z.literal('')),
  
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide'),
  
  phoneNumber: z
    .string()
    .optional()
    .or(z.literal('')),
  
  gender: z
    .enum(['Homme', 'Femme', 'Autre', ''])
    .optional(),
  
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal('')),
  
  nationality: z
    .string()
    .max(100, 'La nationalité ne peut pas dépasser 100 caractères')
    .optional()
    .or(z.literal('')),
  
  // Adresse
  address: z.object({
    street: z
      .string()
      .max(200, 'La rue ne peut pas dépasser 200 caractères')
      .optional()
      .or(z.literal('')),
    
    city: z
      .string()
      .max(100, 'La ville ne peut pas dépasser 100 caractères')
      .optional()
      .or(z.literal('')),
    
    country: z
      .string()
      .max(100, 'Le pays ne peut pas dépasser 100 caractères')
      .optional()
      .or(z.literal('')),
  }).optional(),
  
  // Contact d'urgence
  emergencyContact: z.object({
    name: z
      .string()
      .max(100, 'Le nom ne peut pas dépasser 100 caractères')
      .optional()
      .or(z.literal('')),
    
    relationship: z
      .string()
      .max(50, 'Le lien ne peut pas dépasser 50 caractères')
      .optional()
      .or(z.literal('')),
    
    phone: z
      .string()
      .optional()
      .or(z.literal('')),
    
    address: z
      .string()
      .max(200, 'L\'adresse ne peut pas dépasser 200 caractères')
      .optional()
      .or(z.literal('')),
  }).optional(),
});

