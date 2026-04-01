import { SupabaseClient } from "@supabase/supabase-js";
import { validateAnimal, AnimalInput } from "@/lib/validations/animal";

export type AnimalRow = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age_months: number | null;
  gender: string;
  description: string | null;
  photo_url: string | null;
  status: string;
  city: string | null;
  canton: string | null;
  weight_kg: number | null;
  vaccinated: boolean;
  sterilized: boolean;
  traits: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export async function uploadAnimalPhoto(
  supabase: SupabaseClient,
  file: File
): Promise<ServiceResult<string>> {
  try {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) {
      return { data: null, error: "Format non supporté. Utilisez JPG, PNG ou WebP." };
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { data: null, error: "La photo ne doit pas dépasser 5 Mo." };
    }

    const fileName = crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await supabase.storage
      .from("animals")
      .upload(fileName, file);

    if (uploadError) {
      return { data: null, error: "Erreur upload: " + uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from("animals")
      .getPublicUrl(fileName);

    return { data: urlData.publicUrl, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue lors de l'upload." };
  }
}

export async function createAnimal(
  supabase: SupabaseClient,
  input: unknown,
  userId?: string
): Promise<ServiceResult<AnimalRow>> {
  const { data: validated, error: validationError } = validateAnimal(input);
  if (validationError) {
    return { data: null, error: validationError };
  }

  try {
    const insertData = { ...validated, created_by: userId || null };

    const { data, error } = await supabase
      .from("animals")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return { data: null, error: "Erreur lors de la création: " + error.message };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue lors de la création." };
  }
}

export async function updateAnimal(
  supabase: SupabaseClient,
  id: string,
  input: unknown
): Promise<ServiceResult<AnimalRow>> {
  const { data: validated, error: validationError } = validateAnimal(input);
  if (validationError) {
    return { data: null, error: validationError };
  }

  try {
    const { data, error } = await supabase
      .from("animals")
      .update(validated as AnimalInput)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: "Erreur lors de la modification: " + error.message };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue lors de la modification." };
  }
}

export async function deleteAnimal(
  supabase: SupabaseClient,
  id: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from("animals")
      .delete()
      .eq("id", id);

    if (error) {
      return { data: null, error: "Erreur lors de la suppression: " + error.message };
    }

    return { data: true, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue lors de la suppression." };
  }
}

export async function getAnimalById(
  supabase: SupabaseClient,
  id: string
): Promise<ServiceResult<AnimalRow>> {
  try {
    const { data, error } = await supabase
      .from("animals")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: "Animal introuvable." };
    }

    return { data, error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}

export async function listAnimals(
  supabase: SupabaseClient,
  filters?: { species?: string; canton?: string; status?: string }
): Promise<ServiceResult<AnimalRow[]>> {
  try {
    let query = supabase
      .from("animals")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.species) query = query.eq("species", filters.species);
    if (filters?.canton) query = query.eq("canton", filters.canton);
    if (filters?.status) query = query.eq("status", filters.status);

    const { data, error } = await query;

    if (error) {
      return { data: null, error: "Erreur lors du chargement: " + error.message };
    }

    return { data: data || [], error: null };
  } catch {
    return { data: null, error: "Erreur inattendue." };
  }
}
