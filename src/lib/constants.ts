export const CLIMATE_ZONES = {
  MUY_CALIDO_HUMEDO: {
    label: "Muy Cálido y Húmedo",
    description: "Zonas costeras tropicales (Veracruz, Cancún, Mérida)",
    factor: 1.25,
    btuPerSqFt: 30,
    examples: ["Veracruz", "Cancún", "Mérida", "Villahermosa", "Acapulco"],
  },
  CALIDO_SECO: {
    label: "Cálido y Seco",
    description: "Zonas desérticas y semidesérticas (Sonora, Chihuahua)",
    factor: 1.20,
    btuPerSqFt: 28,
    examples: ["Hermosillo", "Chihuahua", "Mexicali", "Monterrey"],
  },
  TEMPLADO: {
    label: "Templado",
    description: "Altiplano y zonas de clima moderado (CDMX, Guadalajara)",
    factor: 1.0,
    btuPerSqFt: 22,
    examples: ["Ciudad de México", "Guadalajara", "Puebla", "Querétaro"],
  },
  SEMIFRIO: {
    label: "Semifrío",
    description: "Zonas de altura con inviernos moderados",
    factor: 0.85,
    btuPerSqFt: 18,
    examples: ["Toluca", "Xalapa", "San Cristóbal de las Casas"],
  },
  FRIO: {
    label: "Frío",
    description: "Zonas de alta montaña con inviernos fuertes",
    factor: 0.75,
    btuPerSqFt: 15,
    examples: ["Zacatecas", "Durango", "Saltillo"],
  },
} as const;

export type ClimateZoneKey = keyof typeof CLIMATE_ZONES;

export const BUILD_TYPES = {
  RESIDENCIAL_LIGERO: {
    label: "Residencial Ligero",
    description: "Casas con buena aislación, ventanas dobles",
    insulationFactor: 0.85,
    windowFactor: 0.90,
    ceilingHeightM: 2.5,
    occupancyWatts: 75,
  },
  RESIDENCIAL_ESTANDAR: {
    label: "Residencial Estándar",
    description: "Casas o departamentos con aislación normal",
    insulationFactor: 1.0,
    windowFactor: 1.0,
    ceilingHeightM: 2.7,
    occupancyWatts: 90,
  },
  RESIDENCIAL_PESADO: {
    label: "Residencial Pesado",
    description: "Construcción antigua o sin aislación adecuada",
    insulationFactor: 1.20,
    windowFactor: 1.15,
    ceilingHeightM: 3.0,
    occupancyWatts: 90,
  },
  COMERCIAL_LIGERO: {
    label: "Comercial Ligero",
    description: "Oficinas, consultorios, locales pequeños",
    insulationFactor: 1.10,
    windowFactor: 1.15,
    ceilingHeightM: 2.8,
    occupancyWatts: 120,
  },
  COMERCIAL_MEDIO: {
    label: "Comercial Medio",
    description: "Tiendas, restaurantes, salones",
    insulationFactor: 1.20,
    windowFactor: 1.20,
    ceilingHeightM: 3.0,
    occupancyWatts: 150,
  },
  COMERCIAL_PESADO: {
    label: "Comercial Pesado",
    description: "Industria ligera, bodegas climatizadas, servidores",
    insulationFactor: 1.40,
    windowFactor: 1.10,
    ceilingHeightM: 4.0,
    occupancyWatts: 200,
  },
  INDUSTRIAL: {
    label: "Industrial",
    description: "Plantas de manufactura, cuartos de equipos críticos",
    insulationFactor: 1.60,
    windowFactor: 1.05,
    ceilingHeightM: 5.0,
    occupancyWatts: 300,
  },
} as const;

export type BuildTypeKey = keyof typeof BUILD_TYPES;

export const BTU_TO_TON = 12000;
export const TON_TO_KW = 3.517;
export const SQFT_TO_M2 = 0.0929;
export const M2_TO_SQFT = 10.764;

export const DUCT_TYPES = {
  METALICO_GALVANIZADO: {
    label: "Metálico Galvanizado",
    pricePerM2: 280,
    laborPerM2: 120,
    leakageFactor: 0.05,
  },
  FIBRA_DE_VIDRIO: {
    label: "Fibra de Vidrio",
    pricePerM2: 340,
    laborPerM2: 100,
    leakageFactor: 0.03,
  },
  FLEXIBLE: {
    label: "Ducto Flexible",
    pricePerM: 85,
    laborPerM: 45,
    leakageFactor: 0.08,
  },
} as const;

export type DuctTypeKey = keyof typeof DUCT_TYPES;

export const REFRIGERANT_TYPES = {
  R32: { label: "R-32", gwp: 675, efficiency: "Alta" },
  R410A: { label: "R-410A", gwp: 2088, efficiency: "Alta" },
  R22: { label: "R-22 (Legacy)", gwp: 1810, efficiency: "Media" },
  R454B: { label: "R-454B", gwp: 466, efficiency: "Alta" },
} as const;

export type RefrigerantTypeKey = keyof typeof REFRIGERANT_TYPES;

export const PROJECT_STATUS = {
  BORRADOR: { label: "Borrador", color: "gray" },
  ENVIADO: { label: "Enviado al cliente", color: "blue" },
  EN_REVISION: { label: "En revisión", color: "yellow" },
  APROBADO: { label: "Aprobado", color: "green" },
  RECHAZADO: { label: "Rechazado", color: "red" },
  EN_EJECUCION: { label: "En ejecución", color: "purple" },
  COMPLETADO: { label: "Completado", color: "emerald" },
} as const;

export type ProjectStatusKey = keyof typeof PROJECT_STATUS;
