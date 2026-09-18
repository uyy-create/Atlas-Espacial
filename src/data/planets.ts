import type { OrbitalElements } from '../simulation/ephemeris'

export interface PlanetFacts {
  diameter: string
  gravity: string
  moons: number
  dayLength: string
  yearLength: string
  distanceFromSun: string
}

export interface RingBand {
  /** Inner edge, as a fraction 0..1 of [innerRadius, outerRadius]. */
  from: number
  /** Outer edge, same scale. */
  to: number
  color: string
  /** Peak opacity of the band. */
  alpha: number
  /** Edge softness as a fraction of the band width (0 = hard edge). */
  soft?: number
}

/**
 * Ring system: either a texture pair (Saturn) or a procedural radial
 * profile of bands (thin, dark systems like Uranus and Neptune, for which
 * no texture exists and none is needed).
 */
export type RingDef = {
  innerRadius: number
  outerRadius: number
  /** Extra tilt over the planet's axial tilt, in degrees. */
  tiltDeg?: number
  /** Multiplier on the alpha map. */
  opacity?: number
} & (
  | {
      /** Color/transmission map (jpg). */
      textureUrl: string
      /** Alpha map (greyscale) – white = opaque. */
      alphaUrl?: string
      bands?: undefined
    }
  | {
      textureUrl?: undefined
      alphaUrl?: undefined
      bands: RingBand[]
    }
)

export interface AtmosphereDef {
  /** Glow colour (scattered light at the limb). */
  color: string
  /** Overall brightness multiplier. Default 1. */
  intensity?: number
  /** Outer halo radius relative to the planet. Default 1.16. */
  scale?: number
}

export interface MoonDef {
  id: string
  name: string
  /** Fallback color when no texture is provided. */
  color: string
  /** Optional texture URL (relative to /). */
  textureUrl?: string
  /** Visual radius in scene units. */
  radius: number
  /** Distance from the parent planet in scene units. */
  orbitRadius: number
  /** Real sidereal period in days; negative = retrograde. */
  orbitPeriodDays: number
  /** Initial phase, in radians (moon phases are not ephemeris-driven). */
  orbitInitialAngle: number
  /** Inclination relative to the parent's equator (degrees). */
  inclinationDeg?: number
}

export interface PlanetDef {
  id: string
  name: string
  /** Fallback color (used as emissive tint and for cards/glow). */
  color: string
  accentColor?: string
  /** Surface texture URL. */
  textureUrl: string
  /** Optional cloud overlay (Earth). */
  cloudsUrl?: string
  /** Visual radius in scene units. */
  radius: number
  /** Decorative orbit radius (not to scale). */
  orbitRadius: number
  /** Mean orbital elements: the angle along the orbit is real for any date. */
  elements: OrbitalElements
  axialTiltDeg: number
  /** Real sidereal rotation period in days. */
  rotationPeriodDays: number
  /**
   * Override the camera's focus distance. Defaults to a function of radius.
   */
  focusDistance?: number
  rings?: RingDef
  /** Fresnel glow; omit for airless bodies. */
  atmosphere?: AtmosphereDef
  moons?: MoonDef[]
  facts: PlanetFacts
  description: string
}

const TEX = '/textures'

export const PLANETS: PlanetDef[] = [
  {
    id: 'mercury',
    name: 'Mercurio',
    color: '#a89888',
    textureUrl: `${TEX}/mercurymap.jpg`,
    radius: 0.55,
    orbitRadius: 9,
    elements: { L0: 252.2503235, Lrate: 149472.67411175, varpi: 77.45779628, e: 0.20563593 },
    axialTiltDeg: 0.03,
    rotationPeriodDays: 58.646,
    facts: {
      diameter: '4 879 km',
      gravity: '3.7 m/s²',
      moons: 0,
      dayLength: '58.6 días',
      yearLength: '88 días',
      distanceFromSun: '57.9 millones de km',
    },
    description:
      'El planeta más cercano al Sol y el más pequeño del sistema. Su superficie cráteriza recuerda a la de la Luna y experimenta los mayores contrastes térmicos del sistema solar: hasta 430 °C de día y -180 °C de noche.',
  },
  {
    id: 'venus',
    name: 'Venus',
    color: '#e6c98f',
    accentColor: '#fff2c2',
    textureUrl: `${TEX}/venusmap.jpg`,
    radius: 0.85,
    orbitRadius: 12.5,
    elements: { L0: 181.9790995, Lrate: 58517.81538729, varpi: 131.60246718, e: 0.00677672 },
    axialTiltDeg: 177.4,
    rotationPeriodDays: 243.02,
    atmosphere: { color: '#ffe3a3', intensity: 1.1, scale: 1.2 },
    facts: {
      diameter: '12 104 km',
      gravity: '8.87 m/s²',
      moons: 0,
      dayLength: '243 días',
      yearLength: '225 días',
      distanceFromSun: '108.2 millones de km',
    },
    description:
      'Cubierto por una densa atmósfera de dióxido de carbono y nubes de ácido sulfúrico, Venus sufre un efecto invernadero extremo que lo convierte en el planeta más caliente del sistema solar, con superficies de 460 °C.',
  },
  {
    id: 'earth',
    name: 'Tierra',
    color: '#3b82f6',
    accentColor: '#22c55e',
    textureUrl: `${TEX}/earthmap1k.jpg`,
    cloudsUrl: `${TEX}/earthcloudmap.jpg`,
    radius: 0.9,
    orbitRadius: 16,
    elements: { L0: 100.46457166, Lrate: 35999.37244981, varpi: 102.93768193, e: 0.01671123 },
    axialTiltDeg: 23.5,
    rotationPeriodDays: 0.99727,
    moons: [
      {
        id: 'moon',
        name: 'Luna',
        color: '#cccccc',
        textureUrl: `${TEX}/moonmap1k.jpg`,
        radius: 0.24,
        orbitRadius: 1.7,
        orbitPeriodDays: 27.32,
        orbitInitialAngle: 0,
        inclinationDeg: 5.1,
      },
    ],
    atmosphere: { color: '#5aa9ff', intensity: 1.25, scale: 1.18 },
    facts: {
      diameter: '12 742 km',
      gravity: '9.807 m/s²',
      moons: 1,
      dayLength: '24 horas',
      yearLength: '365.25 días',
      distanceFromSun: '149.6 millones de km',
    },
    description:
      'El tercer planeta desde el Sol y el único conocido que alberga vida. Su superficie está cubierta en un 71% por agua líquida y posee una atmósfera rica en nitrógeno y oxígeno que protege la biosfera de la radiación solar.',
  },
  {
    id: 'mars',
    name: 'Marte',
    color: '#c1502c',
    accentColor: '#ff8a55',
    textureUrl: `${TEX}/marsmap1k.jpg`,
    radius: 0.7,
    orbitRadius: 20,
    elements: { L0: -4.55343205, Lrate: 19140.30268499, varpi: -23.94362959, e: 0.0933941 },
    axialTiltDeg: 25.2,
    rotationPeriodDays: 1.02596,
    moons: [
      {
        id: 'phobos',
        name: 'Fobos',
        color: '#7e6b5a',
        radius: 0.09,
        orbitRadius: 1.05,
        orbitPeriodDays: 0.319,
        orbitInitialAngle: 0,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        color: '#9b8a78',
        radius: 0.07,
        orbitRadius: 1.45,
        orbitPeriodDays: 1.263,
        orbitInitialAngle: Math.PI,
      },
    ],
    atmosphere: { color: '#ffb08a', intensity: 0.55, scale: 1.1 },
    facts: {
      diameter: '6 779 km',
      gravity: '3.71 m/s²',
      moons: 2,
      dayLength: '24h 37min',
      yearLength: '687 días',
      distanceFromSun: '227.9 millones de km',
    },
    description:
      'Conocido como el Planeta Rojo por el óxido de hierro de su superficie, Marte alberga el volcán más alto del sistema solar (Olympus Mons) y un cañón de 4 000 km, el Valles Marineris. Es el principal candidato para la exploración humana.',
  },
  {
    id: 'jupiter',
    name: 'Júpiter',
    color: '#d6a76a',
    accentColor: '#f5dca8',
    textureUrl: `${TEX}/jupitermap.jpg`,
    radius: 2.6,
    orbitRadius: 27,
    elements: { L0: 34.39644051, Lrate: 3034.74612775, varpi: 14.72847983, e: 0.04838624 },
    axialTiltDeg: 3.1,
    rotationPeriodDays: 0.41354,
    focusDistance: 8.5,
    moons: [
      {
        id: 'io',
        name: 'Ío',
        color: '#f4d96a',
        radius: 0.16,
        orbitRadius: 3.2,
        orbitPeriodDays: 1.769,
        orbitInitialAngle: 0,
      },
      {
        id: 'europa',
        name: 'Europa',
        color: '#e9d3a8',
        radius: 0.15,
        orbitRadius: 3.9,
        orbitPeriodDays: 3.551,
        orbitInitialAngle: Math.PI * 0.5,
      },
      {
        id: 'ganymede',
        name: 'Ganímedes',
        color: '#b9a489',
        radius: 0.22,
        orbitRadius: 4.7,
        orbitPeriodDays: 7.155,
        orbitInitialAngle: Math.PI,
      },
      {
        id: 'callisto',
        name: 'Calisto',
        color: '#6e6354',
        radius: 0.2,
        orbitRadius: 5.6,
        orbitPeriodDays: 16.69,
        orbitInitialAngle: Math.PI * 1.5,
      },
    ],
    atmosphere: { color: '#f3d7a8', intensity: 0.7, scale: 1.1 },
    facts: {
      diameter: '139 820 km',
      gravity: '24.79 m/s²',
      moons: 95,
      dayLength: '9h 56min',
      yearLength: '11.86 años',
      distanceFromSun: '778.5 millones de km',
    },
    description:
      'El gigante gaseoso del sistema solar, con una masa 2.5 veces la de los demás planetas juntos. Sus bandas atmosféricas y la Gran Mancha Roja son tormentas que llevan siglos rugiendo. Sus cuatro lunas galileanas son auténticos mundos.',
  },
  {
    id: 'saturn',
    name: 'Saturno',
    color: '#e7c987',
    accentColor: '#fff1c5',
    textureUrl: `${TEX}/saturnmap.jpg`,
    radius: 2.2,
    orbitRadius: 36,
    elements: { L0: 49.95424423, Lrate: 1222.49362201, varpi: 92.59887831, e: 0.05386179 },
    axialTiltDeg: 26.7,
    rotationPeriodDays: 0.44401,
    focusDistance: 9,
    rings: {
      innerRadius: 2.7,
      outerRadius: 4.6,
      textureUrl: `${TEX}/saturnringcolor.jpg`,
      alphaUrl: `${TEX}/saturnringpattern.gif`,
      opacity: 0.95,
    },
    moons: [
      {
        id: 'titan',
        name: 'Titán',
        color: '#d99a52',
        radius: 0.22,
        orbitRadius: 5.4,
        orbitPeriodDays: 15.95,
        orbitInitialAngle: 0,
      },
      {
        id: 'enceladus',
        name: 'Encélado',
        color: '#f0f0f5',
        radius: 0.09,
        orbitRadius: 4.1,
        orbitPeriodDays: 1.37,
        orbitInitialAngle: Math.PI * 0.6,
      },
    ],
    atmosphere: { color: '#fbe8b8', intensity: 0.6, scale: 1.09 },
    facts: {
      diameter: '116 460 km',
      gravity: '10.44 m/s²',
      moons: 146,
      dayLength: '10h 33min',
      yearLength: '29.45 años',
      distanceFromSun: '1 433.5 millones de km',
    },
    description:
      'Famoso por su sistema de anillos compuesto principalmente de hielo y polvo, Saturno es un gigante gaseoso de baja densidad —tan ligero que flotaría en agua—. Su luna Titán tiene lagos de metano líquido y atmósfera densa.',
  },
  {
    id: 'uranus',
    name: 'Urano',
    color: '#a8e0e8',
    accentColor: '#cdf0ff',
    textureUrl: `${TEX}/uranusmap.jpg`,
    radius: 1.5,
    orbitRadius: 45,
    elements: { L0: 313.23810451, Lrate: 428.48202785, varpi: 170.9542763, e: 0.04725744 },
    axialTiltDeg: 97.8,
    rotationPeriodDays: 0.71833,
    focusDistance: 6.5,
    moons: [
      {
        id: 'titania',
        name: 'Titania',
        color: '#a99b8b',
        radius: 0.1,
        orbitRadius: 2.8,
        orbitPeriodDays: 8.706,
        orbitInitialAngle: 0,
      },
    ],
    // Thirteen narrow, dark rings between 1.64 and 2.0 radii; epsilon is
    // by far the brightest. Radii are real, widths exaggerated to be seen.
    rings: {
      innerRadius: 2.4,
      outerRadius: 3.08,
      bands: [
        { from: 0.076, to: 0.088, color: '#a9adb8', alpha: 0.28, soft: 0.4 },
        { from: 0.109, to: 0.121, color: '#a9adb8', alpha: 0.28, soft: 0.4 },
        { from: 0.14, to: 0.152, color: '#a9adb8', alpha: 0.3, soft: 0.4 },
        { from: 0.322, to: 0.34, color: '#b4b8c4', alpha: 0.5, soft: 0.35 },
        { from: 0.401, to: 0.419, color: '#b4b8c4', alpha: 0.5, soft: 0.35 },
        { from: 0.51, to: 0.524, color: '#a9adb8', alpha: 0.3, soft: 0.4 },
        { from: 0.573, to: 0.587, color: '#b4b8c4', alpha: 0.45, soft: 0.35 },
        { from: 0.655, to: 0.669, color: '#b4b8c4', alpha: 0.45, soft: 0.35 },
        { from: 0.783, to: 0.797, color: '#a9adb8', alpha: 0.18, soft: 0.5 },
        { from: 0.88, to: 0.912, color: '#c8ccd8', alpha: 0.8, soft: 0.3 },
      ],
    },
    atmosphere: { color: '#9ff2ff', intensity: 1.0, scale: 1.14 },
    facts: {
      diameter: '50 724 km',
      gravity: '8.69 m/s²',
      moons: 27,
      dayLength: '17h 14min',
      yearLength: '84 años',
      distanceFromSun: '2 872.5 millones de km',
    },
    description:
      'Único planeta que rota tumbado sobre su lado, con un eje de rotación inclinado casi 98°. Su atmósfera de hidrógeno, helio y metano da el característico tono cian. Sus trece anillos, finos y oscuros, giran casi perpendiculares a su órbita.',
  },
  {
    id: 'neptune',
    name: 'Neptuno',
    color: '#3b59c7',
    accentColor: '#7aa0ff',
    textureUrl: `${TEX}/neptunemap.jpg`,
    radius: 1.45,
    orbitRadius: 53,
    elements: { L0: -55.12002969, Lrate: 218.45945325, varpi: 44.96476227, e: 0.00859048 },
    axialTiltDeg: 28.3,
    rotationPeriodDays: 0.67125,
    focusDistance: 6.5,
    moons: [
      {
        id: 'triton',
        name: 'Tritón',
        color: '#cfd6ce',
        radius: 0.12,
        orbitRadius: 3,
        orbitPeriodDays: -5.877,
        orbitInitialAngle: Math.PI * 0.3,
      },
    ],
    // Galle (broad, faint), Le Verrier, Lassell sheet, Arago and Adams
    // (the brightest, with its clumpy arcs) at their real radii.
    rings: {
      innerRadius: 2.39,
      outerRadius: 3.77,
      bands: [
        { from: 0.042, to: 0.116, color: '#d8d2c8', alpha: 0.1, soft: 0.5 },
        { from: 0.518, to: 0.534, color: '#e0dad0', alpha: 0.5, soft: 0.35 },
        { from: 0.534, to: 0.695, color: '#d8d2c8', alpha: 0.07, soft: 0.3 },
        { from: 0.69, to: 0.7, color: '#e0dad0', alpha: 0.25, soft: 0.4 },
        { from: 0.928, to: 0.946, color: '#ece6dc', alpha: 0.65, soft: 0.3 },
      ],
    },
    atmosphere: { color: '#6f8cff', intensity: 1.1, scale: 1.15 },
    facts: {
      diameter: '49 244 km',
      gravity: '11.15 m/s²',
      moons: 16,
      dayLength: '16h 6min',
      yearLength: '164.8 años',
      distanceFromSun: '4 495 millones de km',
    },
    description:
      'El planeta más lejano del sistema solar, con vientos que superan los 2 100 km/h, los más rápidos jamás registrados. Su intenso azul proviene del metano atmosférico. Tiene cinco anillos tenues de polvo y Tritón, su mayor luna, orbita en sentido retrógrado.',
  },
]

export const getPlanetById = (id: string | null): PlanetDef | undefined =>
  id ? PLANETS.find((p) => p.id === id) : undefined

export const getPlanetIndex = (id: string | null): number =>
  id ? PLANETS.findIndex((p) => p.id === id) : -1

export const getNeighborPlanetId = (
  id: string | null,
  direction: 1 | -1,
): string | null => {
  if (!id) return null
  const idx = getPlanetIndex(id)
  if (idx === -1) return null
  const next = (idx + direction + PLANETS.length) % PLANETS.length
  return PLANETS[next].id
}
