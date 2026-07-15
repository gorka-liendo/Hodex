# HODEX — Guía de marca y sistema de diseño

Landing corporativa de **Hodex**. Estética heredada del design system _Valthera_
(private capital, suizo): minimalismo de gama alta, precisión al milímetro,
tipografía fina, mucho aire. Este documento es la fuente de verdad estética —
todo lo que se construya en el repo debe respetarlo.

## Stack

- **React 19 + Vite 8 + TypeScript** (React Compiler activo vía babel).
- **Tailwind CSS v4** (`@tailwindcss/vite`). **No hay `tailwind.config.js`** — toda
  la configuración vive en `frontend/src/index.css` dentro de `@theme`.
- Convención acordada: **solo utilidades Tailwind** en el JSX. No creamos clases de
  componente (`.btn`, `.card`…). La única utilidad propia es `bg-copper-gradient`.

## Reglas de marca — inquebrantables

1. **Solo 4 colores.** Negro y blanco sostienen el ~95%. Cero excepciones.
2. **El cobre aparece UNA vez por pantalla** — en el CTA principal. Nunca como
   decoración, nunca dos cobres visibles a la vez.
3. **Radio de esquina = 0 en TODO.** No existe variante redondeada. Los tokens
   `--radius-*` están forzados a `0px`; `rounded-*` no redondea nada. No añadir
   esquinas redondeadas a ningún componente.
4. **Nunca borders sólidos gruesos.** Las divisiones son _hairlines_ de 1px con
   opacidad (`border-hodex-line` sobre claro, `border-hodex-line-dark` sobre negro).
5. **Tracking ancho (`0.18em`) SOLO en eyebrow labels.** No en headlines ni body.
6. **Pesos display 200/300 siempre** para headlines y wordmark (`font-extralight` /
   `font-light`). Nunca bold en la fuente display.

## Tokens (definidos en `frontend/src/index.css`)

### Color → utilidades `bg-*`, `text-*`, `border-*`

| Token             | Hex / valor            | Utilidad ejemplo         |
| ----------------- | ---------------------- | ------------------------ |
| `hodex-black`     | `#111010`              | `bg-hodex-black`         |
| `hodex-white`     | `#FFFFFF`              | `text-hodex-white`       |
| `hodex-off-white` | `#FAFAFA`              | `bg-hodex-off-white`     |
| `hodex-gray`      | `#6E6E6E`              | `text-hodex-gray` (body/secundario) |
| `hodex-gray-light`| `#A6A6A6`              | `text-hodex-gray-light`  |
| `hodex-copper-1`  | `#892B01`              | `text-hodex-copper-1`    |
| `hodex-copper-2`  | `#B43801`              | —                        |
| `hodex-line`      | `rgba(17,16,16,.14)`   | `border-hodex-line`      |
| `hodex-line-dark` | `rgba(255,255,255,.16)`| `border-hodex-line-dark` |

**Gradiente de cobre** (único gradiente del sistema, 135°): usa la utilidad
`bg-copper-gradient`. Reservada para el CTA principal.

### Tipografía → `font-display`, `font-body`

- `font-display` = Helvetica Neue (sistema, cae a Arial) — headlines, wordmark.
- `font-body` = Onest (Google Fonts, ya importada en `index.css`) — UI, párrafos.

### Escala tipográfica → `text-*`

| Utilidad         | Tamaño                  | line-height |
| ---------------- | ----------------------- | ----------- |
| `text-wordmark`  | `clamp(96px,17vw,260px)`| 1.02 (+ tracking -0.01em) |
| `text-h1`        | 56px                    | 1.02 |
| `text-h2`        | 40px                    | 1.02 |
| `text-h3`        | 28px                    | 1.1  |
| `text-body-lg`   | 18px                    | 1.6  |
| `text-base`      | 16px (body por defecto) | 1.6  |
| `text-small`     | 13px                    | —    |
| `text-eyebrow`   | 12px                    | —    |

### Tracking → `tracking-*`

`tracking-eyebrow` (0.18em) · `tracking-headline` (0.01em) · `tracking-wordmark` (-0.01em).

### Line-height → `leading-*`

`leading-tight` (1.02, headlines/wordmark) · `leading-body` (1.6).

### Espaciado (base 8px)

El scale por defecto de Tailwind (4px base) ya cubre el sistema:
`2`=8 · `3`=12 · `4`=16 · `6`=24 · `8`=32 · `12`=48 · `16`=64 · `24`=96px.
Extra de marca: `9` = **140px** (`p-9`, `gap-9`, `mt-9`…).

## Recetas de componentes (solo utilidades)

Referencia 1:1 del design system original, en Tailwind puro.

**Eyebrow label** (label + línea que se extiende, abre cada sección):

```jsx
<div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
  Details
  <span className="h-px flex-1 max-w-[220px] bg-hodex-line" />
</div>
```

Sobre fondo negro: `text-hodex-white/55` y `bg-hodex-line-dark` en la línea.

**Índice numerado en caja:**

```jsx
<span className="inline-flex h-8 w-10 items-center justify-center text-small border border-hodex-line">
  01/
</span>
```

**Wordmark a sangre completa** (hero / footer):

```jsx
<div className="whitespace-nowrap font-display font-extralight text-wordmark tracking-wordmark">
  HODEX
</div>
```

Variante sobre negro con degradado metálico:
`bg-[linear-gradient(180deg,#f5f5f5,#9a9a9a)] bg-clip-text text-transparent`.

**Lead paragraph** (primera frase bold negro, resto gris):

```jsx
<p className="max-w-[640px] text-body-lg leading-body">
  <b className="font-semibold text-hodex-black">Solo cuatro colores, cero excepciones.</b>{' '}
  <span className="text-hodex-gray">Negro y blanco sostienen el 95% del sistema…</span>
</p>
```

**CTA de cobre** (máximo uno por pantalla):

```jsx
<button className="bg-copper-gradient text-hodex-white font-body font-semibold text-small
                   uppercase tracking-[0.04em] px-7 py-4">
  Schedule Private Consultation
</button>
```

Botón secundario blanco: `bg-hodex-white text-hodex-black border border-hodex-black`.
Botón outline sobre negro: `bg-transparent text-hodex-white border border-hodex-line-dark`.

**Input solo-línea-inferior** (formularios, fondo oscuro):

```jsx
<input placeholder="Email"
  className="w-full bg-transparent border-0 border-b border-hodex-line-dark
             text-hodex-white placeholder:text-hodex-white/40 py-4 font-body
             focus:outline-none focus:border-hodex-white" />
```

**Acordeón claro** — sin caja, solo hairlines (`border-t/b border-hodex-line`) y una
flecha `↳` que rota `rotate-90` al abrir.

**Acordeón oscuro** — caja `border border-hodex-line-dark bg-hodex-white/[0.02] p-6`, con
badge de índice absoluto arriba a la derecha (`text-[11px] border border-hodex-line-dark px-2 py-0.5`).

## Componentes construidos

**`src/components/Header.tsx`** — header flotante. Barra despegada del borde,
**esquinas a 90° (radius 0)**, fondo `bg-hodex-white` translúcido con `backdrop-blur`
y hairline `border-hodex-line`. Animaciones: entrada al montar (translate + fade),
elevación/compactado al hacer scroll (>16px), underline animado en hover (`scale-x`),
hamburguesa que se transforma en X, y panel móvil que despliega con stagger.
Su CTA **"Let's talk" va en NEGRO, nunca cobre** (el header es persistente → el cobre
se reserva para el CTA principal de cada sección, regla "cobre 1× por pantalla").
Breakpoint: nav + CTA desde `md`; hamburguesa por debajo.

## Estructura del repo

- `frontend/` — app Vite/React. `src/index.css` = tokens; `src/components/` =
  componentes; `src/App.tsx` = landing (shell on-brand con hero + secciones
  placeholder, pendiente de contenido real).
- Secciones previstas de la landing: hero (wordmark), proyectos, empresas/partners,
  feedback de clientes, contacto + formulario.

## Comandos

```bash
cd frontend
npm run dev      # servidor de desarrollo
npm run build    # tsc -b && vite build
npm run lint
```
