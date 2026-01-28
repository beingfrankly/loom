import { readFileSync, writeFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;

// Update CLAUDE.md
const claudeMdPath = 'CLAUDE.md';
const claudeMd = readFileSync(claudeMdPath, 'utf8');
const updated = claudeMd.replace(
  /- \*\*Plugin Version\*\*: .+/,
  `- **Plugin Version**: ${version}`
);
writeFileSync(claudeMdPath, updated);

console.log(`✓ Synced version ${version} to CLAUDE.md`);
