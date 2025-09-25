import { $ } from 'bun';
import { watch } from 'node:fs';
import path from 'node:path';


const directories = ['src/components', 'src/hooks'];

// Add the main index file to the build
const indexFiles = ['src/index.ts', 'src/registry.ts'];

const files = await Promise.all(directories.flatMap((dir) => {
  const glob = new Bun.Glob(`${dir}/**/*.{ts,tsx}`);
  return Array.fromAsync(glob.scan({ cwd: '.' }));
})).then((files) => files.flat());

// Combine all files including the main entry points
const allFiles = [...indexFiles, ...files];

const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
  entrypoints: allFiles,
  outdir: 'dist',
  root: './src',
  target: 'browser',
  minify: !watchMode,
  format: 'esm',
  splitting: !watchMode,
  sourcemap: 'external',
  external: ['react', 'react-dom'],
  define: {
    'process.env.NODE_ENV': watchMode ? '"development"' : '"production"',
  },
});

if (!build.success) {
  for (const log of build.logs) {
    console.log('[@ecopages/radiant]', log);
  }
}

if (process.argv.includes('--watch')) {
  console.log('Watching for changes...');
  const watcher = watch(path.resolve(__dirname, 'src'), { recursive: true }, async () => {
    await $`bun run build:lib`;
  });

  process.on('SIGINT', () => {
    console.log('Closing watcher...');
    watcher.close();
    process.exit(0);
  });
}