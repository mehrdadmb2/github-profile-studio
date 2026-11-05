import fs from 'node:fs/promises';
import path from 'node:path';

const username = process.argv[2] || process.env.GITHUB_REPOSITORY_OWNER;
if (!username || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
  throw new Error('Pass a valid GitHub username or set GITHUB_REPOSITORY_OWNER.');
}

const safeUsername = username.toLowerCase();
const endpoint = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(safeUsername)}?y=last`;
const response = await fetch(endpoint, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`Contribution source returned HTTP ${response.status}.`);

const payload = await response.json();
const contributions = Array.isArray(payload.contributions) ? payload.contributions : [];
const days = contributions.slice(-371);
const cells = days.map((item, index) => {
  const column = Math.floor(index / 7);
  const row = index % 7;
  const count = Number(item.count) || 0;
  const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
  const opacity = level === 0 ? 0.09 : 0.3 + level * 0.16;
  const x = 30 + column * 16;
  const y = 48 + row * 15;
  const date = String(item.date || '').replace(/[&<>"']/g, '');
  return `<rect x="${x}" y="${y}" width="11" height="11" rx="2" fill="#8b7cff" opacity="${opacity.toFixed(2)}"><title>${count} contributions · ${date}</title></rect>`;
}).join('');

const total = days.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="920" height="180" viewBox="0 0 920 180" role="img" aria-label="Contribution activity for ${safeUsername}">
  <rect width="920" height="180" rx="18" fill="#0b1220"/>
  <text x="30" y="28" fill="#39d9c7" font-family="Arial,sans-serif" font-size="13" font-weight="700">CONTRIBUTION ACTIVITY · ${safeUsername}</text>
  <text x="890" y="28" text-anchor="end" fill="#9aa9c4" font-family="Arial,sans-serif" font-size="11">${total.toLocaleString('en-US')} CONTRIBUTIONS</text>
  ${cells}
  <text x="30" y="168" fill="#9aa9c4" font-family="Arial,sans-serif" font-size="10">LESS</text>
  <rect x="67" y="157" width="10" height="10" rx="2" fill="#8b7cff" opacity=".09"/>
  <rect x="83" y="157" width="10" height="10" rx="2" fill="#8b7cff" opacity=".46"/>
  <rect x="99" y="157" width="10" height="10" rx="2" fill="#8b7cff" opacity=".78"/>
  <rect x="115" y="157" width="10" height="10" rx="2" fill="#39d9c7"/>
  <text x="135" y="168" fill="#9aa9c4" font-family="Arial,sans-serif" font-size="10">MORE</text>
</svg>`;

const output = path.join(process.cwd(), 'assets', `${safeUsername}-heatmap.svg`);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, svg, 'utf8');
console.log(`Updated ${output}; ${days.length} calendar days / ${total} contributions.`);
console.log('README.md was intentionally left untouched.');
