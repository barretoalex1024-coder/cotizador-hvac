// Formato compatible con @supabase/supabase-js v2
// Sincronizado con supabase/migrations/001_initial.sql

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProjectStatus = 'draft' | 'sent' | 'approved' | 'rejected'
export type EquipmentType = 'mini_split' | 'central' | 'package'

export type Database = {
  public: {
    Tables: {
      equipment_catalog: {
        Row: {
          id: string
          brand: string
          model: string
          tons: number
          seer: number | null
          unit_cost: number
          install_hours: number
          refrigerant: string | null
          type: EquipmentType
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          brand: string
          model: string
          tons: number
          seer?: number | null
          unit_cost: number
          install_hours?: number
          refrigerant?: string | null
          type: EquipmentType
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          brand?: string
          model?: string
          tons?: number
          seer?: number | null
          unit_cost?: number
          install_hours?: number
          refrigerant?: string | null
          type?: EquipmentType
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          company_name: string | null
          phone: string | null
          city: string | null
          logo_url: string | null
          labor_rate: number
          default_margin: number
          created_at: string
        }
        Insert: {
          id: string
          company_name?: string | null
          phone?: string | null
          city?: string | null
          logo_url?: string | null
          labor_rate?: number
          default_margin?: number
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string | null
          phone?: string | null
          city?: string | null
          logo_url?: string | null
          labor_rate?: number
          default_margin?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      projects: {
        Row: {
          id: string
          user_id: string
          client_name: string
          client_email: string | null
          client_phone: string | null
          address: string | null
          area_m2: number
          climate_zone: string
          build_type: string
          ceiling_height_m: number
          status: ProjectStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_name: string
          client_email?: string | null
          client_phone?: string | null
          address?: string | null
          area_m2: number
          climate_zone: string
          build_type: string
          ceiling_height_m?: number
          status?: ProjectStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_name?: string
          client_email?: string | null
          client_phone?: string | null
          address?: string | null
          area_m2?: number
          climate_zone?: string
          build_type?: string
          ceiling_height_m?: number
          status?: ProjectStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      estimates: {
        Row: {
          id: string
          project_id: string
          btu_load: number | null
          tons: number | null
          equipment_id: string | null
          cost_equipment: number
          cost_ducts: number
          cost_piping: number
          cost_labor: number
          labor_hours: number | null
          subtotal: number
          margin_pct: number
          total: number
          version: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          btu_load?: number | null
          tons?: number | null
          equipment_id?: string | null
          cost_equipment?: number
          cost_ducts?: number
          cost_piping?: number
          cost_labor?: number
          labor_hours?: number | null
          margin_pct?: number
          version?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          btu_load?: number | null
          tons?: number | null
          equipment_id?: string | null
          cost_equipment?: number
          cost_ducts?: number
          cost_piping?: number
          cost_labor?: number
          labor_hours?: number | null
          margin_pct?: number
          version?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estimates_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estimates_equipment_id_fkey'
            columns: ['equipment_id']
            isOneToOne: false
            referencedRelation: 'equipment_catalog'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      project_status: ProjectStatus
      equipment_type: EquipmentType
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── Type aliases convenientes ─────────────────────────────────
type Tables = Database['public']['Tables']

export type Profile        = Tables['profiles']['Row']
export type ProfileInsert  = Tables['profiles']['Insert']
export type ProfileUpdate  = Tables['profiles']['Update']

export type Project        = Tables['projects']['Row']
export type ProjectInsert  = Tables['projects']['Insert']
export type ProjectUpdate  = Tables['projects']['Update']

export type Estimate       = Tables['estimates']['Row']
export type EstimateInsert = Tables['estimates']['Insert']
export type EstimateUpdate = Tables['estimates']['Update']

export type EquipmentCatalog       = Tables['equipment_catalog']['Row']
export type EquipmentCatalogInsert = Tables['equipment_catalog']['Insert']
export type EquipmentCatalogUpdate = Tables['equipment_catalog']['Update']

// ─── Join types frecuentes ────────────────────────────────────
export interface ProjectWithEstimates extends Project {
  estimates: Estimate[]
}

export interface EstimateWithEquipment extends Estimate {
  equipment_catalog: EquipmentCatalog | null
}

export interface ProjectWithLatestEstimate extends Project {
  latest_estimate: Estimate | null
}
