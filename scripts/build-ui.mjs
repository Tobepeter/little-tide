import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
await build({entryPoints:['src/main.jsx'],bundle:true,minify:true,format:'esm',
  target:['es2022'],jsx:'automatic',outfile:'dist/ui.js',external:['./ui-store.js'],
  alias:{'@':'./src'},define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
execFileSync(process.execPath,['node_modules/@tailwindcss/cli/dist/index.mjs','-i','src/styles.css','-o','dist/style.css','--minify'],{stdio:'inherit'});
