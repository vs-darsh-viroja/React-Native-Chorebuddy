const fs = require('fs');
const path = require('path');

const source = '/Users/developer/iOS/iOS-ChoreBuddy-main/ChoreBuddy/Assets.xcassets';
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets', 'catalog');
const generated = path.join(root, 'src', 'constants', 'assets.ts');

fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(path.dirname(generated), { recursive: true });

const sets = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.imageset')) sets.push(full);
      else walk(full);
    }
  }
}
walk(source);

const records = [];
for (const set of sets.sort()) {
  const key = path.basename(set, '.imageset').replace(/[^A-Za-z0-9_]/g, '_');
  const contents = JSON.parse(fs.readFileSync(path.join(set, 'Contents.json'), 'utf8'));
  const candidates = (contents.images || []).filter(item => item.filename);
  const svg = candidates.find(item => item.filename.toLowerCase().endsWith('.svg'));
  const png = candidates
    .filter(item => item.filename.toLowerCase().endsWith('.png'))
    .sort((a, b) => Number.parseInt(b.scale || '1', 10) - Number.parseInt(a.scale || '1', 10))[0];
  const chosen = svg || png;
  if (!chosen) continue;
  const ext = path.extname(chosen.filename).toLowerCase();
  const destName = `${key}${ext}`;
  fs.copyFileSync(path.join(set, chosen.filename), path.join(output, destName));
  records.push({ key, file: destName, svg: ext === '.svg' });
}

const seen = new Set();
const unique = records.filter(item => !seen.has(item.key) && seen.add(item.key));
const lines = [
  '// Generated from the iOS ChoreBuddy asset catalog. Do not hand-edit.',
  ...unique.filter(x => x.svg).map(x => `import ${x.key}Svg from '../../assets/catalog/${x.file}';`),
  '',
  'export const Images = {',
  ...unique.map(x => `  ${x.key}: ${x.svg ? `${x.key}Svg` : `require('../../assets/catalog/${x.file}')`},`),
  '} as const;',
  ''
];
fs.writeFileSync(generated, lines.join('\n'));
console.log(`Converted ${unique.length}/${sets.length} image sets.`);
