// Packs the built app (dist/) into ONE self-contained HTML file that opens by double-click,
// with no server and no internet: dist/science-iq-offline.html. Run after `npm run build`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = 'dist/assets/';
const files = readdirSync(dir);
const js = readFileSync(dir + files.find((f) => f.endsWith('.js')), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(dir + files.find((f) => f.endsWith('.css')), 'utf8');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0b1020">
<title>SCIENCE IQ</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>
`;
writeFileSync('dist/science-iq-offline.html', html);
console.log(`✓ dist/science-iq-offline.html (${Math.round(html.length / 1024)} KB)`);
