export interface PlanetFacts {
  diameter: string
  gravity: string
  moons: number
  dayLength: string
  yearLength: string
  distanceFromSun: string
}

export interface RingDef {
  innerRadius: number
  outerRadius: number
  /** Color/transmission map (jpg). */
  textureUrl: string
  /** Alpha map (greyscale) – white = opaque. */
  alphaUrl?: string
  /** Extra tilt over the planet's axial tilt, in degrees. */
  tiltDeg?: number
  /** Multiplier on the alpha map. */
  opacity?: number
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
  /** Seconds per revolution around the parent. */
  orbitPeriodSec: number
  /** Initial phase, in radians. */
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
  orbitRadius: number
  orbitPeriodSec: number
  orbitInitialAngle: number
  axialTiltDeg: number
  rotationPeriodSec: number
  /**
   * Override the camera's focus distance. Defaults to a function of radius.
   */
  focusDistance?: number
  rings?: RingDef
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
    orbitPeriodSec: 24,
    orbitInitialAngle: Math.PI * 0.1,
    axialTiltDeg: 0.03,
    rotationPeriodSec: 14,
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
    orbitPeriodSec: 36,
    orbitInitialAngle: Math.PI * 0.7,
    axialTiltDeg: 177.4,
    rotationPeriodSec: 32,
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
    orbitPeriodSec: 60,
    orbitInitialAngle: Math.PI * 0.25,
    axialTiltDeg: 23.5,
    rotationPeriodSec: 6,
    moons: [
      {
        id: 'moon',
        name: 'Luna',
        color: '#cccccc',
        textureUrl: `${TEX}/moonmap1k.jpg`,
        radius: 0.24,
        orbitRadius: 1.7,
        orbitPeriodSec: 8,
        orbitInitialAngle: 0,
        inclinationDeg: 5.1,
      },
    ],
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
    orbitPeriodSec: 90,
    orbitInitialAngle: Math.PI * 1.3,
    axialTiltDeg: 25.2,
    rotationPeriodSec: 6.2,
    moons: [
      {
        id: 'phobos',
        name: 'Fobos',
        color: '#7e6b5a',
        radius: 0.09,
        orbitRadius: 1.05,
        orbitPeriodSec: 3,
        orbitInitialAngle: 0,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        color: '#9b8a78',
        radius: 0.07,
        orbitRadius: 1.45,
        orbitPeriodSec: 5.5,
        orbitInitialAngle: Math.PI,
      },
    ],
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
    orbitPeriodSec: 200,
    orbitInitialAngle: Math.PI * 1.8,
    axialTiltDeg: 3.1,
    rotationPeriodSec: 4.2,
    focusDistance: 8.5,
    moons: [
      {
        id: 'io',
        name: 'Ío',
        color: '#f4d96a',
        radius: 0.16,
        orbitRadius: 3.2,
        orbitPeriodSec: 4,
        orbitInitialAngle: 0,
      },
      {
        id: 'europa',
        name: 'Europa',
        color: '#e9d3a8',
        radius: 0.15,
        orbitRadius: 3.9,
        orbitPeriodSec: 6,
        orbitInitialAngle: Math.PI * 0.5,
      },
      {
        id: 'ganymede',
        name: 'Ganímedes',
        color: '#b9a489',
        radius: 0.22,
        orbitRadius: 4.7,
        orbitPeriodSec: 9,
        orbitInitialAngle: Math.PI,
      },
      {
        id: 'callisto',
        name: 'Calisto',
        color: '#6e6354',
        radius: 0.2,
        orbitRadius: 5.6,
        orbitPeriodSec: 13,
        orbitInitialAngle: Math.PI * 1.5,
      },
    ],
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
    orbitPeriodSec: 300,
    orbitInitialAngle: Math.PI * 0.4,
    axialTiltDeg: 26.7,
    rotationPeriodSec: 4.6,
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
        orbitPeriodSec: 11,
        orbitInitialAngle: 0,
      },
      {
        id: 'enceladus',
        name: 'Encélado',
        color: '#f0f0f5',
        radius: 0.09,
        orbitRadius: 4.1,
        orbitPeriodSec: 5,
        orbitInitialAngle: Math.PI * 0.6,
      },
    ],
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
    orbitPeriodSec: 420,
    orbitInitialAngle: Math.PI * 1.2,
    axialTiltDeg: 97.8,
    rotationPeriodSec: 5,
    focusDistance: 6.5,
    moons: [
      {
        id: 'titania',
        name: 'Titania',
        color: '#a99b8b',
        radius: 0.1,
        orbitRadius: 2.8,
        orbitPeriodSec: 8,
        orbitInitialAngle: 0,
      },
    ],
    facts: {
      diameter: '50 724 km',
      gravity: '8.69 m/s²',
      moons: 27,
      dayLength: '17h 14min',
      yearLength: '84 años',
      distanceFromSun: '2 872.5 millones de km',
    },
    description:
      'Único planeta que rota tumbado sobre su lado, con un eje de rotación inclinado casi 98°. Su atmósfera de hidrógeno, helio y metano da el característico tono cian. Posee un sistema de anillos finos y oscuros.',
  },
  {
    id: 'neptune',
    name: 'Neptuno',
    color: '#3b59c7',
    accentColor: '#7aa0ff',
    textureUrl: `${TEX}/neptunemap.jpg`,
    radius: 1.45,
    orbitRadius: 53,
    orbitPeriodSec: 540,
    orbitInitialAngle: Math.PI * 0.55,
    axialTiltDeg: 28.3,
    rotationPeriodSec: 5.2,
    focusDistance: 6.5,
    moons: [
      {
        id: 'triton',
        name: 'Tritón',
        color: '#cfd6ce',
        radius: 0.12,
        orbitRadius: 3,
        orbitPeriodSec: 9,
        orbitInitialAngle: Math.PI * 0.3,
      },
    ],
    facts: {
      diameter: '49 244 km',
      gravity: '11.15 m/s²',
      moons: 16,
      dayLength: '16h 6min',
      yearLength: '164.8 años',
      distanceFromSun: '4 495 millones de km',
    },
    description:
      'El planeta más lejano del sistema solar, con vientos que superan los 2 100 km/h, los más rápidos jamás registrados. Su intenso azul proviene del metano atmosférico. Tritón, su mayor luna, orbita en sentido retrógrado.',
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
