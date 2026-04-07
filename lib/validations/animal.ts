import { z } from "zod";

export const animalSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas depasser 100 caracteres"),
  species: z.enum(["chien", "chat", "lapin", "oiseau", "rongeur", "autre"]),
  breed: z.string().max(100).nullable().optional(),
  age_months: z
    .number()
    .int("L'age doit etre un nombre entier")
    .min(0, "L'age ne peut pas etre negatif")
    .max(600, "L'age semble incorrect")
    .nullable()
    .optional(),
  gender: z.enum(["male", "femelle", "inconnu"]).default("inconnu"),
  description: z.string().max(2000, "Description trop longue").nullable().optional(),
  photo_url: z.string().url("URL de photo invalide").nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  canton: z.string().max(2).nullable().optional(),
  weight_kg: z
    .number()
    .min(0, "Le poids ne peut pas etre negatif")
    .max(500, "Le poids semble incorrect")
    .nullable()
    .optional(),
  vaccinated: z.boolean().default(false),
  sterilized: z.boolean().default(false),
  traits: z.array(z.string()).default([]).optional(),
  status: z
    .enum(["disponible", "en_cours", "adopte"])
    .default("disponible")
    .optional(),
  diet_type: z.string().max(50).nullable().optional(),
  food_brand: z.string().max(200).nullable().optional(),
  treats: z.string().max(500).nullable().optional(),
  allergies: z.string().max(500).nullable().optional(),
  extra_photos: z.array(z.string().url()).default([]).optional(),
});

export type AnimalInput = z.infer<typeof animalSchema>;

export function validateAnimal(data: unknown) {
  const result = animalSchema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return { data: null, error: firstError.message };
  }
  return { data: result.data, error: null };
}
