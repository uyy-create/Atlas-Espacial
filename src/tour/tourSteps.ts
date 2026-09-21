import type { ViewId } from '../store/useSolarStore'

export type TourTarget =
  | { kind: 'body'; id: string }
  | { kind: 'view'; view: ViewId }

export interface TourStep {
  id: string
  title: string
  text: string
  target: TourTarget
  /** Seconds the step stays on screen once its target is reached. */
  duration: number
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'sun',
    title: 'El Sol',
    text: 'Una estrella corriente que concentra el 99,8 % de la masa del sistema. La luz que ves tarda ocho minutos en llegar a la Tierra; la que sale de Neptuno, más de cuatro horas.',
    target: { kind: 'view', view: 'solar' },
    duration: 10,
  },
  {
    id: 'mercury',
    title: 'Mercurio',
    text: 'El más pequeño y el más rápido: completa una vuelta cada 88 días. Sin atmósfera que reparta el calor, pasa de 430 °C de día a −180 °C de noche.',
    target: { kind: 'body', id: 'mercury' },
    duration: 9,
  },
  {
    id: 'venus',
    title: 'Venus',
    text: 'Casi gemelo de la Tierra en tamaño, pero con una atmósfera de CO₂ noventa veces más densa que lo convierte en el planeta más caliente. Gira al revés y muy despacio: su día dura más que su año.',
    target: { kind: 'body', id: 'venus' },
    duration: 10,
  },
  {
    id: 'earth',
    title: 'La Tierra',
    text: 'Nuestro hogar, el único mundo con vida conocida. Arrastra para rodearla: en el lado nocturno se encienden las luces de las ciudades.',
    target: { kind: 'body', id: 'earth' },
    duration: 11,
  },
  {
    id: 'moon',
    title: 'La Luna',
    text: 'Nació del impacto de un protoplaneta contra la Tierra primitiva. Siempre nos muestra la misma cara y se aleja de nosotros cuatro centímetros al año.',
    target: { kind: 'body', id: 'moon' },
    duration: 10,
  },
  {
    id: 'mars',
    title: 'Marte',
    text: 'Frío, seco y oxidado, pero con cauces de ríos y deltas que hablan de un pasado con agua. Es el siguiente destino de la exploración humana.',
    target: { kind: 'body', id: 'mars' },
    duration: 9,
  },
  {
    id: 'belt',
    title: 'El cinturón de asteroides',
    text: 'Entre Marte y Júpiter orbitan millones de rocas, restos de un planeta que la gravedad de Júpiter nunca dejó formarse. Juntas no llegan al 4 % de la masa de la Luna.',
    target: { kind: 'view', view: 'solar' },
    duration: 10,
  },
  {
    id: 'jupiter',
    title: 'Júpiter',
    text: 'El gigante: dos veces y media la masa de todos los demás planetas juntos. Su Gran Mancha Roja es una tormenta mayor que la Tierra que lleva siglos girando.',
    target: { kind: 'body', id: 'jupiter' },
    duration: 10,
  },
  {
    id: 'europa',
    title: 'Europa',
    text: 'Bajo su corteza de hielo hay un océano con más agua que todos los mares de la Tierra. Es uno de los mejores lugares del sistema solar para buscar vida.',
    target: { kind: 'body', id: 'europa' },
    duration: 10,
  },
  {
    id: 'saturn',
    title: 'Saturno',
    text: 'Sus anillos son hielo casi puro: cientos de miles de kilómetros de ancho y apenas unos metros de grosor. El planeta es tan ligero que flotaría en agua.',
    target: { kind: 'body', id: 'saturn' },
    duration: 10,
  },
  {
    id: 'titan',
    title: 'Titán',
    text: 'La única luna con una atmósfera densa. Bajo su neblina naranja hay lagos y ríos de metano líquido: el único paisaje con líquidos en superficie aparte del terrestre.',
    target: { kind: 'body', id: 'titan' },
    duration: 10,
  },
  {
    id: 'uranus',
    title: 'Urano',
    text: 'Rota tumbado, con el eje casi en el plano de su órbita, así que sus polos pasan 42 años seguidos al sol y otros 42 a oscuras. Sus anillos son finos y oscuros.',
    target: { kind: 'body', id: 'uranus' },
    duration: 10,
  },
  {
    id: 'neptune',
    title: 'Neptuno',
    text: 'El planeta más lejano, con los vientos más rápidos del sistema solar. Se descubrió con lápiz y papel: primero se calculó dónde debía estar y luego se miró.',
    target: { kind: 'body', id: 'neptune' },
    duration: 10,
  },
  {
    id: 'triton',
    title: 'Tritón',
    text: 'Orbita al revés que su planeta, delatando que fue capturado del cinturón de Kuiper. Tiene géiseres de nitrógeno a −235 °C.',
    target: { kind: 'body', id: 'triton' },
    duration: 9,
  },
  {
    id: 'galaxy',
    title: 'La Vía Láctea',
    text: 'Todo lo anterior cabe en un punto de esta espiral de cientos de miles de millones de estrellas. El Sol tarda 230 millones de años en dar una vuelta completa.',
    target: { kind: 'view', view: 'galaxy' },
    duration: 12,
  },
  {
    id: 'blackHole',
    title: 'Un agujero negro',
    text: 'Materia comprimida hasta que ni la luz escapa. El disco que brilla es gas cayendo a millones de grados; lo que parece un halo por encima es la parte trasera del disco, vista a través de la curvatura del espacio.',
    target: { kind: 'view', view: 'blackHole' },
    duration: 14,
  },
  {
    id: 'end',
    title: 'Fin del recorrido',
    text: 'Ya conoces el vecindario. Explora por tu cuenta: pulsa cualquier planeta, viaja en el tiempo con la barra inferior y comparte el enlace de lo que encuentres.',
    target: { kind: 'view', view: 'solar' },
    duration: 12,
  },
]
