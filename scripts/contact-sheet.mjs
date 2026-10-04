import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(process.cwd(), 'public', 'media', 'shop');
const files = (await readdir(dir)).filter((f) => f.endsWith('-800.webp')).sort();
const tiles = [];
for (const f of files) {
  const buf = await sharp(path.join(dir, f)).resize(220, 275, { fit: 'cover' }).toBuffer();
  tiles.push({ input: buf, left: (tiles.length % 5) * 220, top: Math.floor(tiles.length / 5) * 275 });
}
await sharp({
  create: { width: 1100, height: Math.ceil(files.length / 5) * 275, channels: 3, background: '#2a0710' },
})
  .composite(tiles)
  .png()
  .toFile('C:/Users/admin/AppData/Local/Temp/opencode/shop-800.png');
console.log(files.join('\n'));