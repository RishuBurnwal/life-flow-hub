import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MUSIC_DIR = path.join(ROOT, 'public', 'music');
const MANIFEST_PATH = path.join(MUSIC_DIR, 'manifest.json');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);

const isAudioFile = (name) => AUDIO_EXTENSIONS.has(path.extname(name).toLowerCase());

const run = async () => {
  await fs.mkdir(MUSIC_DIR, { recursive: true });

  const entries = await fs.readdir(MUSIC_DIR, { withFileTypes: true });
  const tracks = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name !== 'manifest.json')
    .filter(isAudioFile)
    .sort((a, b) => a.localeCompare(b));

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(tracks, null, 2) + '\n', 'utf8');
  console.log(`[music-manifest] ${tracks.length} track(s) written to public/music/manifest.json`);
};

run().catch((error) => {
  console.error('[music-manifest] Failed to generate manifest:', error);
  process.exitCode = 1;
});
