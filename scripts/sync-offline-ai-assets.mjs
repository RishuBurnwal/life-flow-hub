import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ORT_SRC = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const ORT_DST = path.join(ROOT, 'public', 'ort');
const ROOT_PUBLIC = path.join(ROOT, 'public');
const SQLJS_WASM_SRC = path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const SQLJS_WASM_DST = path.join(ROOT, 'public', 'sqljs', 'sql-wasm.wasm');

const WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm',
  'ort-wasm.wasm',
  'ort-wasm-threaded.js',
  'ort-wasm-threaded.worker.js',
];

const WASM_ALIASES = [
  { from: 'ort-wasm-simd-threaded.wasm', to: 'ort-wasm-simd-threaded.jsep.wasm' },
  { from: 'ort-wasm-simd.wasm', to: 'ort-wasm-simd.jsep.wasm' },
  { from: 'ort-wasm.wasm', to: 'ort-wasm.jsep.wasm' },
];

const ROOT_ALIASES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd.wasm',
  'ort-wasm-simd.jsep.wasm',
  'ort-wasm-threaded.wasm',
  'ort-wasm.wasm',
  'ort-wasm.jsep.wasm',
  'ort-wasm-threaded.js',
  'ort-wasm-threaded.worker.js',
  'sql-wasm.wasm',
];

const copyIfExists = async (srcFile, dstFile) => {
  try {
    await fs.mkdir(path.dirname(dstFile), { recursive: true });
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

  for (const alias of WASM_ALIASES) {
    const src = path.join(ORT_DST, alias.from);
    const dst = path.join(ORT_DST, alias.to);
    const ok = await copyIfExists(src, dst);
    if (ok) copied += 1;
  }

  console.log(`[offline-ai] Copied ${copied} ONNX runtime wasm file(s) to public/ort`);

  const sqlWasmCopied = await copyIfExists(SQLJS_WASM_SRC, SQLJS_WASM_DST);
  if (sqlWasmCopied) {
    console.log('[offline-ai] Copied sql.js wasm to public/sqljs/sql-wasm.wasm');
  } else {
    console.log('[offline-ai] sql.js wasm not found; SQLite runtime may fail to initialize');
  }

  for (const name of ROOT_ALIASES) {
    const src = name === 'sql-wasm.wasm' ? SQLJS_WASM_DST : path.join(ORT_DST, name);
    const dst = path.join(ROOT_PUBLIC, name);
    await copyIfExists(src, dst);
  }
  console.log('[offline-ai] Wrote root-level compatibility aliases for wasm/js runtime assets');
};

run().catch((error) => {
  console.error('[offline-ai] Asset sync failed:', error);
  process.exitCode = 1;
});
