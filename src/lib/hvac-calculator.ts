import { CLIMATE_ZONES, BUILD_TYPES, type ClimateZoneKey, type BuildTypeKey } from './constants'

export interface CalculatorInput {
  area_m2: number
  climate_zone: ClimateZoneKey
  build_type: BuildTypeKey
  ceiling_height_m: number
  num_occupants?: number
  num_windows?: number
  has_kitchen?: boolean
}

export interface CalculatorResult {
  btu_load: number
  tons: number
  tons_recommended: number
  kw_cooling: number
  area_sqft: number
  breakdown: {
    base_load: number
    climate_adjustment: number
    insulation_adjustment: number
    occupancy_load: number
    window_load: number
    kitchen_load: number
  }
}

const STANDARD_TONS = [0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7.5, 10, 12.5, 15]

export function calculateHVACLoad(input: CalculatorInput): CalculatorResult {
  const climate = CLIMATE_ZONES[input.climate_zone]
  const build = BUILD_TYPES[input.build_type]

  const area_sqft = input.area_m2 * 10.764

  const base_load = area_sqft * climate.btuPerSqFt
  const climate_adjustment = base_load * (climate.factor - 1)
  const insulation_adjustment = base_load * (build.insulationFactor - 1)

  const height_factor = input.ceiling_height_m / 2.5

  const occupants = input.num_occupants ?? Math.max(1, Math.ceil(input.area_m2 / 10))
  const occupancy_load = occupants * build.occupancyWatts * 3.412

  const windows = input.num_windows ?? Math.max(1, Math.ceil(input.area_m2 / 15))
  const window_load = windows * 1000 * build.windowFactor

  const kitchen_load = input.has_kitchen ? 4000 : 0

  const total_btu =
    (base_load + climate_adjustment + insulation_adjustment + occupancy_load + window_load + kitchen_load) *
    height_factor

  const tons = total_btu / 12000
  const tons_recommended = STANDARD_TONS.find((t) => t >= tons) ?? STANDARD_TONS[STANDARD_TONS.length - 1]

  return {
    btu_load: Math.round(total_btu),
    tons: Math.round(tons * 100) / 100,
    tons_recommended,
    kw_cooling: Math.round(tons_recommended * 3.517 * 100) / 100,
    area_sqft: Math.round(area_sqft),
    breakdown: {
      base_load: Math.round(base_load),
      climate_adjustment: Math.round(climate_adjustment),
      insulation_adjustment: Math.round(insulation_adjustment),
      occupancy_load: Math.round(occupancy_load),
      window_load: Math.round(window_load),
      kitchen_load,
    },
  }
}

export function estimateCosts(params: {
  tons: number
  area_m2: number
  labor_rate: number
  margin_pct: number
  equipment_cost: number
  install_hours: number
}) {
  const { area_m2, labor_rate, margin_pct, equipment_cost, install_hours, tons } = params

  const cost_ducts = Math.round(area_m2 * 165)
  const cost_piping = Math.round(tons * 1200)
  const cost_labor = Math.round(install_hours * labor_rate)
  const subtotal = equipment_cost + cost_ducts + cost_piping + cost_labor
  const total = Math.round(subtotal * (1 + margin_pct / 100))

  return {
    cost_equipment: equipment_cost,
    cost_ducts,
    cost_piping,
    cost_labor,
    labor_hours: install_hours,
    subtotal: Math.round(subtotal),
    margin_pct,
    total,
  }
}
