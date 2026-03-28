import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ORT_SRC = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const ORT_DST = path.join(ROOT, 'public', 'ort');

const WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd.wasm',
  'ort-wasm-simd.jsep.wasm',
  'ort-wasm-threaded.wasm',
  'ort-wasm.wasm',
  'ort-wasm.jsep.wasm',
];

const copyIfExists = async (srcFile, dstFile) => {
  try {
    await fs.copyFile(srcFile, dstFile);
    return true;
  } catch {
    return false;
  }
};

const run = async () => {
  await fs.mkdir(ORT_DST, { recursive: true });
  let copied = 0;

  for (const file of WASM_FILES) {
    const ok = await copyIfExists(path.join(ORT_SRC, file), path.join(ORT_DST, file));
    if (ok) copied += 1;
  }

  console.log(`[offline-ai] Copied ${copied} ONNX runtime wasm file(s) to public/ort`);
};

run().catch((error) => {
  console.error('[offline-ai] Asset sync failed:', error);
  process.exitCode = 1;
});
