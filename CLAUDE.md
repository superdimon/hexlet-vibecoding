# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

Отвечай в чате на русском языке. Описания коммитов также пиши на русском языке.

## Project overview

Калькулятор калорий (Calorie Calculator) — a single-page vanilla JS web app for calculating daily calorie needs and tracking a food diary. No build step, no framework, no dependencies. Plain HTML, CSS, and ES modules. UI text and content are in Russian.

## Commands

Run the app locally (must be served over HTTP because of ES modules — `file://` won't work):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Run tests (Node 18+, uses the built-in `node --test` runner, no test framework dependency):

```bash
npm test
```

Run a single test file directly:

```bash
node --test tests/calories.test.js
```

There is no linter, formatter, or build/bundle step configured in this repo.

## Architecture

- `index.html` — page markup and empty containers (`<select>`, tables, result panels) that `js/app.js` populates at runtime.
- `js/calories.js` — pure calculation logic, framework/DOM-free. Exports BMR/TDEE/target-calorie/macro calculations plus food-diary math (`portionNutrients`, `totalNutrients`). This is the only module covered by tests and the only one imported by both the browser and the test runner.
- `js/products.js` — static product database (`PRODUCTS`, per-100g nutrition) and `findProduct(id)` lookup.
- `js/app.js` — glue layer: reads/writes `localStorage` (key `calorie-calculator-state`), wires DOM event listeners, populates `<select>` options from `calories.js` constants (`ACTIVITY_LEVELS`, `GOALS`) and `products.js`, and re-renders the diary table/progress bar on every state change.
- `css/style.css` — all styling, no preprocessor.
- `tests/calories.test.js` — unit tests for `js/calories.js` only; `js/app.js` (DOM wiring) and `js/products.js` (data) are untested.

### Data flow

1. Profile form submit → `calculateProfile()` in `calories.js` → renders BMR/TDEE/target/macros → `state.target` saved to `localStorage`.
2. Diary form submit → `findProduct()` + `portionNutrients()` → appended to `state.entries` → saved to `localStorage` → `renderDiary()` re-renders the table, totals (`totalNutrients()`), and the progress bar against `state.target`.
3. On page load, `loadState()` restores `state` from `localStorage` before the initial `renderDiary()` call.

### Conventions

- Keep calculation/business logic in `js/calories.js` free of DOM/browser APIs so it stays testable via `node --test` and importable from both `index.html` and `tests/`.
- All calculated numeric outputs are rounded (`Math.round`, or rounded to 1 decimal for macros) before being stored or displayed — follow the existing rounding pattern (kcal to whole numbers, protein/fat/carbs to 1 decimal) when adding new fields.
- Validation errors in `calories.js` are raised as `throw new Error('message in Russian')` and caught by the calling form handler in `app.js`, which displays `e.message` in the `#form-error` element — follow this pattern rather than returning error codes.
