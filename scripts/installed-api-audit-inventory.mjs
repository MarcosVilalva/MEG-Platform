import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

const apiWorkspaces = ['apps/api', 'packages/database'];
const excludedPackages = new Set(['picomatch', 'vite']);

/** Inventory the packages actually present after the isolated, lockfile-based npm ci. */
export function installedApiLockEntries(root, packages) {
  const inventory = Object.fromEntries(apiWorkspaces.map(path => [path, packages[path]]));

  function visitModules(directory) {
    const fullPath = join(root, directory);
    if (!existsSync(fullPath)) return;
    for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = directory + '/' + entry.name;
      if (entry.name.startsWith('@') && entry.isDirectory()) {
        visitModules(path);
        continue;
      }
      const locked = packages[path];
      if (!locked) throw new Error('Installed dependency not in lockfile: ' + path);
      if (entry.isSymbolicLink()) {
        const workspace = locked.resolved;
        if (!locked.link || !apiWorkspaces.includes(workspace)
          || realpathSync(join(root, path)) !== realpathSync(resolve(root, workspace))) {
          throw new Error('Unexpected dependency link: ' + path);
        }
        continue;
      }
      const manifest = JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8'));
      const expectedName = locked.name ?? path.split('node_modules/').at(-1);
      if (manifest.name !== expectedName || !locked.version || manifest.version !== locked.version) {
        throw new Error('Installed dependency differs from lockfile: ' + path);
      }
      if (excludedPackages.has(manifest.name)) {
        throw new Error('Web tool found in API installation: ' + manifest.name);
      }
      inventory[path] = { ...locked, name: manifest.name };
      visitModules(path + '/node_modules');
    }
  }

  visitModules('node_modules');
  for (const workspace of apiWorkspaces) visitModules(workspace + '/node_modules');
  for (const workspace of Object.keys(packages)) {
    if (!workspace || workspace.includes('node_modules/') || apiWorkspaces.includes(workspace)) continue;
    const directory = join(root, workspace, 'node_modules');
    if (existsSync(directory) && readdirSync(directory).length > 0) {
      throw new Error('Unexpected dependency directory for unrelated workspace: ' + workspace);
    }
  }
  return inventory;
}
