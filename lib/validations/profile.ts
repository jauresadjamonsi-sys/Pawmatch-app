import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Le nom doit faire au moins 2 caractères")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .nullable()
    .optional(),
  phone: z
    .string()
    .regex(/^(\+41|0)\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$|^$/, "Format de téléphone suisse invalide (ex: +41 79 123 45 67)")
    .nullable()
    .optional(),
  city: z
    .string()
    .min(2, "La ville doit faire au moins 2 caractères")
    .max(100)
    .nullable()
    .optional(),
});

export function validateProfile(data: unknown) {
  const result = profileSchema.safeParse(data);
  if (!result.success) {
    return { data: null, error: result.error.issues[0].message };
  }
  return { data: result.data, error: null };
}
