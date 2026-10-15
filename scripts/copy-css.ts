import { mkdir } from 'node:fs/promises';

const source = await Bun.file('src/styles.css').text();
await mkdir('dist', { recursive: true });
await Bun.write('dist/styles.css', source);
console.log('Wrote dist/styles.css');
