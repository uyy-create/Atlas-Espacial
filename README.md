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

Las posiciones de los planetas son reales para la fecha simulada
(elementos orbitales medios del JPL); los radios de las órbitas y los
tamaños no están a escala.

## Enlaces directos

La URL refleja el estado y se puede compartir:

- `?view=galaxy` · `?view=blackHole`
- `?planet=mars` — entra directamente enfocando ese planeta
- `?planet=jupiter&date=2030-06-15` — además, arranca en pausa en esa fecha
  (`date` solo aparece en la URL mientras la simulación está pausada)

## Scripts de calidad

| Comando        | Descripción                          |
| -------------- | ------------------------------------ |
| `npm run lint` | ESLint (incluye reglas de React 19)  |
| `npx tsc -b`   | Comprobación de tipos                |

## Estructura

- `src/scenes/solar` — Sol, planetas, lunas, anillos y atmósferas.
- `src/scenes/galaxy` — Vía Láctea de partículas y marcadores de destino.
- `src/scenes/black-hole` — agujero negro raymarched (ajustes en `blackHoleRaymarchShader.ts`).
- `src/simulation` — efemérides (posiciones reales por fecha) y reloj simulado.
- `src/transitions` — cámara (foco, órbita libre, intro) y transición warp entre vistas.
- `src/routing` — estado compartible en la URL.
- `src/store/useSolarStore.ts` — máquina de estados (vista, foco, warp). En desarrollo se expone como `window.__solarStore` para depurar desde la consola.
- `src/ui` — pantalla de carga, navegador de vistas y panel de información.

## Requisitos

- Node.js (versión LTS recomendada)

---

*Proyecto de experimentación / UX — Atlas Espacial.*
