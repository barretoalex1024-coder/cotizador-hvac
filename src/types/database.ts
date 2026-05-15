// Auto-aligned with supabase/migrations/001_initial.sql

export type ProjectStatus = "draft" | "sent" | "approved" | "rejected";
export type EquipmentType = "mini_split" | "central" | "package";

// ------------------------------------------------------------
// Tabla: profiles
// ------------------------------------------------------------
export interface Profile {
  id: string;
  company_name: string | null;
  phone: string | null;
  city: string | null;
  logo_url: string | null;
  labor_rate: number;
  default_margin: number;
  created_at: string;
}

export type ProfileInsert = Omit<Profile, "created_at"> & {
  created_at?: string;
};

export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "created_at">
>;

// ------------------------------------------------------------
// Tabla: projects
// ------------------------------------------------------------
export interface Project {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  address: string | null;
  area_m2: number;
  climate_zone: string;
  build_type: string;
  ceiling_height_m: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProjectUpdate = Partial<
  Omit<Project, "id" | "user_id" | "created_at" | "updated_at">
>;

// ------------------------------------------------------------
// Tabla: estimates
// ------------------------------------------------------------
export interface Estimate {
  id: string;
  project_id: string;
  btu_load: number | null;
  tons: number | null;
  equipment_id: string | null;
  cost_equipment: number;
  cost_ducts: number;
  cost_piping: number;
  cost_labor: number;
  labor_hours: number | null;
  /** Columna generada: cost_equipment + cost_ducts + cost_piping + cost_labor */
  subtotal: number;
  margin_pct: number;
  /** Columna generada: subtotal * (1 + margin_pct / 100) */
  total: number;
  version: number;
  notes: string | null;
  created_at: string;
}

export type EstimateInsert = Omit<
  Estimate,
  "id" | "subtotal" | "total" | "created_at"
> & {
  id?: string;
  created_at?: string;
};

export type EstimateUpdate = Partial<
  Omit<Estimate, "id" | "project_id" | "subtotal" | "total" | "created_at">
>;

// ------------------------------------------------------------
// Tabla: equipment_catalog
// ------------------------------------------------------------
export interface EquipmentCatalog {
  id: string;
  brand: string;
  model: string;
  tons: number;
  seer: number | null;
  unit_cost: number;
  install_hours: number;
  refrigerant: string | null;
  type: EquipmentType;
  is_active: boolean;
  created_at: string;
}

export type EquipmentCatalogInsert = Omit<
  EquipmentCatalog,
  "id" | "created_at"
> & {
  id?: string;
  created_at?: string;
};

export type EquipmentCatalogUpdate = Partial<
  Omit<EquipmentCatalog, "id" | "created_at">
>;

// ------------------------------------------------------------
// Tipos de join frecuentes
// ------------------------------------------------------------
export interface ProjectWithEstimates extends Project {
  estimates: Estimate[];
}

export interface EstimateWithEquipment extends Estimate {
  equipment_catalog: EquipmentCatalog | null;
}

export interface ProjectWithLatestEstimate extends Project {
  latest_estimate: Estimate | null;
}

// ------------------------------------------------------------
// Tipo raíz de la base de datos (compatible con @supabase/supabase-js)
// ------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      estimates: {
        Row: Estimate;
        Insert: EstimateInsert;
        Update: EstimateUpdate;
      };
      equipment_catalog: {
        Row: EquipmentCatalog;
        Insert: EquipmentCatalogInsert;
        Update: EquipmentCatalogUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
      equipment_type: EquipmentType;
    };
  };
}
