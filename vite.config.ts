import { readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";

// Every .html file in the repo is a page and a build entry, so a multi-page
// hand-written site needs no build config: add pages, link them, ship.
// (Vite's default would build only the root index.html and silently drop the
// rest from dist/ — fine locally, 404s deployed.)
const SKIP = new Set(["node_modules", "dist", "spec", "scripts", "reflections"]);

function htmlEntries(dir = "."): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || SKIP.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlEntries(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

// `base: "./"` makes built asset URLs relative, so the site works under any
// GitHub Pages path (username.github.io/your-repo/) without further config.
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: htmlEntries(),
    },
  },
  // The generator's property tests walk 200 seeds x 3 waves and take ~2.7s on
  // this machine -- under vitest's 5s default, but not under it on a shared CI
  // runner, where both timed out. Nothing about them hangs; they are simply
  // large, and the default budget was never sized for them. Raising the ceiling
  // leaves every assertion untouched, which is the difference between waiting
  // longer for a slow guard and weakening one.
  test: { testTimeout: 30_000 },
});
