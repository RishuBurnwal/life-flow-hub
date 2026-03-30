import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const REPO_ID = process.env.HF_MODEL_ID?.trim() || 'Xenova/Phi-3-mini-4k-instruct';
const FILE_URL = (filePath) => `https://huggingface.co/${REPO_ID}/resolve/main/${filePath}`;
const HF_TOKEN = process.env.HF_TOKEN?.trim();

const ROOT = process.cwd();
const DEST_ROOT = path.join(ROOT, 'public', 'ai', 'models', REPO_ID);

const REQUIRED_BASE = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'special_tokens_map.json',
  'generation_config.json',
];

const OPTIONAL_TOKENIZER = [
  'vocab.json',
  'merges.txt',
  'tokenizer.model',
];

const ONNX_PREFERENCE = [
  'onnx/model_q4.onnx',
  'onnx/model_quantized.onnx',
  'onnx/model_q8.onnx',
  'onnx/model.onnx',
  'model_q4.onnx',
  'model_quantized.onnx',
  'model_q8.onnx',
  'model.onnx',
];

const streamToFile = async (response, targetPath) => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const out = createWriteStream(targetPath);
  await new Promise((resolve, reject) => {
    const readable = Readable.fromWeb(response.body);
    readable.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
    readable.pipe(out);
  });
};

const buildHeaders = () => {
  if (!HF_TOKEN) return { Accept: 'application/json' };
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${HF_TOKEN}`,
  };
};

const tryDownloadFile = async (filePath, { required = false } = {}) => {
  const res = await fetch(FILE_URL(filePath), { headers: buildHeaders() });

  if (!res.ok || !res.body) {
    if (required) {
      if (res.status === 401) {
        throw new Error(`Failed to download ${filePath}: 401 Unauthorized. If this model is gated, set HF_TOKEN and retry.`);
      }
      throw new Error(`Failed to download required file ${filePath}: ${res.status} ${res.statusText}`);
    }
    return false;
  }

  const destPath = path.join(DEST_ROOT, ...filePath.split('/'));
  await streamToFile(res, destPath);
  console.log(`[ai-download] Saved ${filePath}`);
  return true;
};

const run = async () => {
  console.log(`[ai-download] Downloading offline files for ${REPO_ID}`);
  console.log(`[ai-download] Destination: ${DEST_ROOT}`);

  await fs.mkdir(DEST_ROOT, { recursive: true });

  const downloaded = new Set();
  for (const filePath of REQUIRED_BASE) {
    const ok = await tryDownloadFile(filePath, { required: true });
    if (ok) downloaded.add(filePath);
  }

  let chosenOnnx = null;
  for (const filePath of ONNX_PREFERENCE) {
    const ok = await tryDownloadFile(filePath);
    if (ok) {
      chosenOnnx = filePath;
      downloaded.add(filePath);
      break;
    }
  }

  if (!chosenOnnx) {
    throw new Error('No supported ONNX weight file found in model repository.');
  }

  for (const filePath of OPTIONAL_TOKENIZER) {
    const ok = await tryDownloadFile(filePath);
    if (ok) downloaded.add(filePath);
  }

  console.log('\n[ai-download] Completed successfully.');
  console.log(`[ai-download] ONNX selected: ${chosenOnnx}`);
  console.log(`[ai-download] Total downloaded: ${downloaded.size}`);
};

run().catch((error) => {
  console.error('[ai-download] Failed:', error.message || error);
  process.exitCode = 1;
});
