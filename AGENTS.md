<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# rosco

Single-package Next.js App Router app. There is no `src/`: routes live in `app/`, and `@/*` maps to the repo root. The README is untouched `create-next-app` boilerplate; `package.json` and the configs are the source of truth.

## Commands

- `npm run dev` — Turbopack dev server on port 3000.
- `npm run build` — production build; also runs TypeScript and prerender validation.
- `npm run start` — serve the production build.
- `npm run lint` — ESLint 9 flat config.
- `npx tsc --noEmit` — standalone typecheck; there is no `typecheck` script.
- `npx next typegen` — regenerate route types without a full build.
- No test runner, test script, CI, or formatter is configured.
- Verify in order: `npm run lint`, `npx tsc --noEmit`, then `npm run build`.

## Next.js 16 / Cache Components

- `next.config.ts` sets `cacheComponents: true` and `partialPrefetching: true`. They are coupled: `partialPrefetching` without `cacheComponents` fails config validation.
- Cache Components makes data dynamic by default. Cache with `use cache` plus `cacheLife` instead of route segment configs: exported `dynamic`, `revalidate`, `fetchCache`, and `dynamicParams` error. The `runtime` config is unsupported (Node.js only), including `runtime = "nodejs"`.
- Wrap `cookies()`, `headers()`, and `searchParams` access in `<Suspense>` so the rest of the route can prerender. `export const instant = false` only silences development-time instant-navigation validation for a segment.
- `Date.now()`, `Math.random()`, and `crypto.randomUUID()` in a prerendered server component fail the build; move them into a client component or behind `connection()`/`<Suspense>`.
- `PageProps<...>` and `LayoutProps<...>` are generated global types; do not import them. Generated route types live in `.next/types` and `.next/dev/types`.
- `next-env.d.ts` is generated and gitignored; do not edit or commit it.

## Styling

- Tailwind v4 runs through the `@tailwindcss/turbopack` loader configured in `next.config.ts`; there is no PostCSS config. Keep dev/build on Turbopack (the default); `--webpack` will not apply this loader.
- `app/globals.css` imports `@import "tailwindcss"` and defines theme tokens with `@theme inline`.

## Environment

- `.env*` is gitignored; Next.js loads `.env*` by default. No custom env loader or deployment config exists.

## Reglas del proyecto

- Web mobile pensada primero para iPhone Safari (y Android Chrome): graba partidas de rosco de Pasapalabra con cámara y overlay.
- Lo que se ve y se graba es el `<canvas>` de 1920x1080 en horizontal; los botones y overlays HTML no aparecen en el video. La lógica de dibujo vive en `app/lib/`.
- Todo el código de cámara, canvas, audio y grabación es Client Component y se carga con `dynamic` y `ssr: false`.
- Los textos de interfaz van en español rioplatense.
- No instalar dependencias nuevas salvo que se pida explícitamente.
- Los datos pesados (videos) van en IndexedDB, nunca en `localStorage`.
- Si `lint`, `tsc --noEmit` y `build` pasan sin errores, se permite commit y push a la rama actual. Nunca usar `--force`. Si algo falla, frenar y reportar sin improvisar.
- No agregar atribuciones de coautor (`Co-authored-by`) en los commits.
- Trabajar de a un paso por vez y no agregar funcionalidades que no se pidieron.
