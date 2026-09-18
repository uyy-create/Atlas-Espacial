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

## Scripts de calidad

| Comando        | Descripción                          |
| -------------- | ------------------------------------ |
| `npm run lint` | ESLint (incluye reglas de React 19)  |
| `npx tsc -b`   | Comprobación de tipos                |

## Estructura

- `src/scenes/solar` — Sol, planetas, lunas, anillos y atmósferas.
- `src/scenes/galaxy` — Vía Láctea de partículas y marcadores de destino.
- `src/scenes/black-hole` — agujero negro raymarched (ajustes en `blackHoleRaymarchShader.ts`).
- `src/transitions` — cámara y transición warp entre vistas.
- `src/store/useSolarStore.ts` — máquina de estados (vista, foco, warp). En desarrollo se expone como `window.__solarStore` para depurar desde la consola.
- `src/ui` — pantalla de carga, navegador de vistas y panel de información.

## Requisitos

- Node.js (versión LTS recomendada)

---

*Proyecto de experimentación / UX — Atlas Espacial.*
