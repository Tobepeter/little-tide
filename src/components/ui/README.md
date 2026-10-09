# UI components

shadcn/ui New York / Radix component patterns, installed manually and adapted for this interface. The registry CLI could not reach ui.shadcn.com in the build environment. Components are kept as editable JavaScript source, use real Radix primitives, shadcn theme/animation CSS, CVA, Tailwind CSS 4, and Lucide React. Licensing: dist/vendor/SHADCN-LICENSE.md.

Configuration: components.json. Official manual setup: https://ui.shadcn.com/docs/installation/manual

The React overlay reads the shared store in dist/ui-store.js; game.js owns the Three.js state and actions. Neither layer edits the other's DOM. npm run build generates dist/ui.js and dist/style.css; npm run check verifies models, animation, input routing, the state bridge, and React/Radix control behavior. The DOM tests use jsdom and do not replace real browser/GPU validation.
