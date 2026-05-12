/**
 * Fix dual @types/react resolution in bun's content-addressable store.
 *
 * Bun stores packages in node_modules/.bun/ with nested node_modules.
 * This causes TypeScript to resolve @types/react from two different paths,
 * making identical types incompatible (e.g., ForwardRefExoticComponent
 * doesn't satisfy the ElementType constraint).
 *
 * This script symlinks the .bun/ copies to the project's @types/react,
 * forcing TypeScript to resolve from a single physical location.
 */
const fs = require('fs');
const path = require('path');

// Find the monorepo root (where node_modules/.bun lives)
let root = process.cwd();
for (let i = 0; i < 5; i++) {
  if (fs.existsSync(path.join(root, 'node_modules', '.bun'))) break;
  root = path.dirname(root);
}

const bunDir = path.join(root, 'node_modules', '.bun');
if (!fs.existsSync(bunDir)) {
  console.log('fix-types-dedup: No .bun directory found, skipping');
  process.exit(0);
}

let fixed = 0;
const typesToFix = ['@types+react', '@types+react-dom'];

try {
  const entries = fs.readdirSync(bunDir);
  for (const entry of entries) {
    const matchesType = typesToFix.some(t => entry.startsWith(t + '@'));
    if (!matchesType) continue;

    // The .bun entry has: node_modules/.bun/@types+react@19.x.x/node_modules/@types/react/
    const typesDir = path.join(bunDir, entry, 'node_modules', '@types');
    if (!fs.existsSync(typesDir)) continue;

    const subEntries = fs.readdirSync(typesDir);
    for (const sub of subEntries) {
      const targetDir = path.join(typesDir, sub);
      // Walk up to find the project-level @types copy
      // From: root/node_modules/.bun/@types+react@19.x.x/node_modules/@types/react
      // To:   root/node_modules/@types/react
      const sourceDir = path.join(root, 'node_modules', '@types', sub);

      if (fs.existsSync(sourceDir) && fs.existsSync(targetDir)) {
        try {
          fs.rmSync(targetDir, { recursive: true, force: true });
          fs.symlinkSync(sourceDir, targetDir, 'junction');
          fixed++;
          console.log(`fix-types-dedup: symlinked ${entry}/${sub} -> project @types/${sub}`);
        } catch (err) {
          console.warn(`fix-types-dedup: failed to symlink ${targetDir}: ${err.message}`);
        }
      }
    }
  }
} catch (err) {
  console.warn(`fix-types-dedup: error: ${err.message}`);
}

console.log(`fix-types-dedup: fixed ${fixed} type resolution(s)`);
