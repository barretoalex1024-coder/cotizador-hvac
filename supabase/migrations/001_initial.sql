-- ============================================================
-- HVAC Pro — Migración inicial
-- ============================================================

-- ------------------------------------------------------------
-- TABLA: equipment_catalog
-- Catálogo de equipos disponibles (sin dependencias externas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_catalog (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand          text        NOT NULL,
  model          text        NOT NULL,
  tons           numeric     NOT NULL CHECK (tons > 0),
  seer           numeric     CHECK (seer > 0),
  unit_cost      numeric     NOT NULL CHECK (unit_cost >= 0),
  install_hours  numeric     NOT NULL DEFAULT 4 CHECK (install_hours >= 0),
  refrigerant    text,
  type           text        NOT NULL CHECK (type IN ('mini_split', 'central', 'package')),
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_catalog_tons      ON equipment_catalog (tons);
CREATE INDEX idx_equipment_catalog_type      ON equipment_catalog (type);
CREATE INDEX idx_equipment_catalog_is_active ON equipment_catalog (is_active);

-- ------------------------------------------------------------
-- TABLA: profiles
-- Extiende auth.users con datos de contratista
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  company_name     text,
  phone            text,
  city             text,
  logo_url         text,
  labor_rate       numeric     NOT NULL DEFAULT 65  CHECK (labor_rate >= 0),
  default_margin   numeric     NOT NULL DEFAULT 25  CHECK (default_margin >= 0 AND default_margin <= 100),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- TABLA: projects
-- Proyectos de cotización por usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_name      text        NOT NULL,
  client_email     text,
  client_phone     text,
  address          text,
  area_m2          numeric     NOT NULL CHECK (area_m2 > 0),
  climate_zone     text        NOT NULL,
  build_type       text        NOT NULL,
  ceiling_height_m numeric     NOT NULL DEFAULT 2.7 CHECK (ceiling_height_m > 0),
  status           text        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_id   ON projects (user_id);
CREATE INDEX idx_projects_status    ON projects (status);
CREATE INDEX idx_projects_client    ON projects (client_name);

-- ------------------------------------------------------------
-- TABLA: estimates
-- Cálculos técnicos y económicos vinculados a un proyecto
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS estimates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  btu_load        numeric     CHECK (btu_load >= 0),
  tons            numeric     CHECK (tons >= 0),
  equipment_id    uuid        REFERENCES equipment_catalog (id) ON DELETE SET NULL,
  cost_equipment  numeric     NOT NULL DEFAULT 0 CHECK (cost_equipment >= 0),
  cost_ducts      numeric     NOT NULL DEFAULT 0 CHECK (cost_ducts >= 0),
  cost_piping     numeric     NOT NULL DEFAULT 0 CHECK (cost_piping >= 0),
  cost_labor      numeric     NOT NULL DEFAULT 0 CHECK (cost_labor >= 0),
  labor_hours     numeric     CHECK (labor_hours >= 0),
  subtotal        numeric     GENERATED ALWAYS AS (
                    cost_equipment + cost_ducts + cost_piping + cost_labor
                  ) STORED,
  margin_pct      numeric     NOT NULL DEFAULT 25 CHECK (margin_pct >= 0 AND margin_pct <= 100),
  total           numeric     GENERATED ALWAYS AS (
                    (cost_equipment + cost_ducts + cost_piping + cost_labor)
                    * (1 + (margin_pct / 100.0))
                  ) STORED,
  version         integer     NOT NULL DEFAULT 1 CHECK (version >= 1),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_estimates_project_id ON estimates (project_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- Trigger: actualizar updated_at en projects automáticamente
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Trigger: crear profile automáticamente al registrar usuario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ------------------------------------------------------------
-- RLS: projects — cada usuario solo ve/modifica sus proyectos
-- ------------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: select own"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects: insert own"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects: update own"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects: delete own"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- RLS: estimates — acceso a través de pertenencia al proyecto
-- ------------------------------------------------------------
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estimates: select own"
  ON estimates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = estimates.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "estimates: insert own"
  ON estimates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = estimates.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "estimates: update own"
  ON estimates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = estimates.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "estimates: delete own"
  ON estimates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = estimates.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- RLS: profiles — cada usuario solo ve y edita su propio perfil
-- ------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: select own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- RLS: equipment_catalog — lectura pública, escritura solo admin
-- (la tabla es compartida; se gestiona por service_role)
-- ------------------------------------------------------------
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_catalog: select all authenticated"
  ON equipment_catalog FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================
-- DATOS SEMILLA — equipment_catalog
-- Equipos de ejemplo para arrancar el catálogo
-- ============================================================
INSERT INTO equipment_catalog (brand, model, tons, seer, unit_cost, install_hours, refrigerant, type) VALUES
  ('Daikin',    'FTXS09LVMA',    0.75, 21.0,  8500,  4, 'R-32',   'mini_split'),
  ('Daikin',    'FTXS12LVMA',    1.00, 21.0,  9800,  4, 'R-32',   'mini_split'),
  ('Daikin',    'FTXS18LVMA',    1.50, 20.0, 13500,  5, 'R-32',   'mini_split'),
  ('Daikin',    'FTXS24LVMA',    2.00, 19.0, 17200,  6, 'R-32',   'mini_split'),
  ('Carrier',   'XC25-036',      3.00, 26.0, 28000,  8, 'R-410A', 'central'),
  ('Carrier',   'XC25-048',      4.00, 25.0, 34500,  8, 'R-410A', 'central'),
  ('Carrier',   'XC25-060',      5.00, 25.0, 41000, 10, 'R-410A', 'central'),
  ('Trane',     'XR15-036',      3.00, 16.0, 22000,  8, 'R-410A', 'central'),
  ('Trane',     'XR15-048',      4.00, 16.0, 27500,  8, 'R-410A', 'central'),
  ('Lennox',    'XC21-036',      3.00, 21.0, 25000,  8, 'R-410A', 'central'),
  ('Rheem',     'RKPN-036',      3.00, 14.0, 18500, 10, 'R-410A', 'package'),
  ('Rheem',     'RKPN-048',      4.00, 14.0, 23000, 10, 'R-410A', 'package'),
  ('York',      'ZH060',         5.00, 15.0, 26000, 12, 'R-410A', 'package'),
  ('LG',        'LMU360HHV',     3.00, 20.0, 24000,  6, 'R-410A', 'mini_split'),
  ('Samsung',   'AM018TNADEH',   1.50, 22.0, 14000,  5, 'R-32',   'mini_split');
