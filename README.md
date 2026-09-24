# Sistema Solar Interactivo

Aplicación web 3D para explorar el sistema solar: planetas con texturas y atmósferas, Sol procedural, órbitas, información y transiciones "warp" entre tres vistas (Sistema Solar, Vía Láctea y Agujero negro). Está hecha con **React**, **TypeScript**, **Vite**, **Three.js** (`@react-three/fiber`, `@react-three/drei`) y **Tailwind CSS**.

## Cómo ejecutarla

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`).

## Scripts útiles

| Comando           | Descripción                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Servidor de desarrollo         |
| `npm run build`   | Compilación para producción    |
| `npm run preview` | Vista previa del build         |

## Controles

| Acción                          | Cómo                                          |
| ------------------------------- | --------------------------------------------- |
| Explorar un planeta             | Clic sobre él · `←` `→` para el vecino        |
| Orbitar / acercar (enfocado)    | Arrastrar · rueda (o pinza en táctil)         |
| Salir del foco                  | `Esc` o clic en el vacío                      |
| Pausar / reanudar el tiempo     | `Espacio` o el botón de la barra inferior     |
| Velocidad y fecha               | Barra inferior (1 día/s … 6 meses/s, «Hoy»)   |
| Cambiar de vista                | Navigator (arriba a la izquierda)             |
| Tour guiado                     | Botón arriba a la derecha · `←` `→` · `Esc`   |
| Ir a una fecha                  | Icono de calendario en la barra inferior      |

Las posiciones de los planetas son reales para la fecha simulada
(elementos orbitales medios del JPL); los radios de las órbitas y los
tamaños no están a escala. La fase de la Luna y la hora solar de la Tierra
también siguen la fecha; el resto de lunas tienen una fase fija por fecha
(no real). A velocidades altas los giros y las lunas rápidas se limitan
visualmente, y al pausar vuelven a su posición real. El reloj se detiene en
los bordes del rango de validez de las efemérides (1800–2050).

## Enlaces directos

La URL refleja el estado y se puede compartir:

- `?view=galaxy` · `?view=blackHole`
- `?planet=mars` — entra directamente enfocando ese planeta (o luna: `?planet=titan`)
- `?planet=jupiter&date=2030-06-15` — además, arranca en pausa en esa fecha
  (`date` solo aparece en la URL mientras la simulación está pausada)

## Scripts de calidad

| Comando        | Descripción                          |
| -------------- | ------------------------------------ |
| `npm run lint` | ESLint (incluye reglas de React 19)  |
| `npx tsc -b`   | Comprobación de tipos                |
| `npm test`     | Tests (Vitest); `npm run test:watch` |

Los tests cubren la lógica bajo la escena, no el aspecto: efemérides contra
fechas conocidas (equinoccios, oposiciones, eclipses), fases de la Luna y
hora solar de la Tierra, el reloj y sus límites, la máquina de estados de
navegación, los enlaces directos y la integridad de los datos (ids únicos,
texturas que existen en `public/`).

## Estructura

- `src/scenes/solar` — Sol, planetas, lunas, anillos, atmósferas, luces nocturnas y cinturón de asteroides.
- `src/scenes/galaxy` — Vía Láctea de partículas y marcadores de destino.
- `src/scenes/black-hole` — agujero negro raymarched (ajustes en `blackHoleRaymarchShader.ts`).
- `src/simulation` — efemérides (posiciones reales por fecha) y reloj simulado.
- `src/transitions` — cámara (foco, órbita libre, intro) y transición warp entre vistas.
- `src/routing` — estado compartible en la URL.
- `src/tour` — pasos y controlador del tour guiado.
- `src/store/useSolarStore.ts` — máquina de estados (vista, foco, warp). En desarrollo se expone como `window.__solarStore` para depurar desde la consola.
- `src/ui` — pantalla de carga, navegador de vistas y panel de información.

## Créditos de texturas

- Luces nocturnas de la Tierra: NASA Earth Observatory, *Black Marble 2016*
  (dominio público), reducido a 2048 px.
- Lunas (`public/textures/moons`): mosaicos globales del USGS Astrogeology
  Science Center (dominio público) — Ío, Europa, Ganímedes y Calisto
  (Galileo/Voyager), Titán y Encélado (Cassini), Tritón (Voyager 2) y Fobos
  (Mars Express). Reducidos a 1024 px; las zonas sin datos se rellenan con el
  hemisferio opuesto. Los mosaicos en escala de grises se tintan en el
  material (`mapTint`). Deimos y Titania no tienen mapa global y se dibujan
  con color plano.

## Fuentes

Inter y Space Grotesk se sirven desde el propio build
(`@fontsource-variable/*`, licencia OFL): la app no hace peticiones a
terceros.

## Requisitos

- Node.js (versión LTS recomendada)

---

*Proyecto de experimentación / UX — Atlas Espacial.*
