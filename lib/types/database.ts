export type UserRole = "adoptant" | "admin";
export type AnimalStatus = "disponible" | "en_cours" | "adopte";
export type AnimalSpecies = "chien" | "chat" | "lapin" | "oiseau" | "rongeur" | "autre";
export type MatchStatus = "pending" | "accepted" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Animal {
  id: string;
  name: string;
  species: AnimalSpecies;
  breed: string | null;
  age_months: number | null;
  gender: "male" | "femelle" | "inconnu";
  description: string | null;
  photo_url: string | null;
  status: AnimalStatus;
  city: string | null;
  canton: string | null;
  weight_kg: number | null;
  vaccinated: boolean;
  sterilized: boolean;
  traits: string[];
  diet_type: string | null;
  food_brand: string | null;
  treats: string | null;
  allergies: string | null;
  extra_photos: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  sender_animal_id: string;
  receiver_animal_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface UserPresence {
  user_id: string;
  last_seen: string;
  is_online: boolean;
}
