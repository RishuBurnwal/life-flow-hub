import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const REPO_ID = 'Xenova/phi-2';
const API_URL = `https://huggingface.co/api/models/${REPO_ID}`;
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

const fetchModelSiblings = async () => {
  const res = await fetch(API_URL, { headers: buildHeaders() });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Failed to fetch model metadata: 401 Unauthorized. Set HF_TOKEN environment variable and retry.');
    }
    throw new Error(`Failed to fetch model metadata: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const siblings = Array.isArray(json?.siblings) ? json.siblings : [];
  return siblings
    .map((entry) => entry?.rfilename)
    .filter((name) => typeof name === 'string' && name.length > 0);
};

const pickExisting = (candidates, availableSet) => candidates.find((file) => availableSet.has(file));

const run = async () => {
  const availableFiles = await fetchModelSiblings();
  const availableSet = new Set(availableFiles);

  const chosenOnnx = pickExisting(ONNX_PREFERENCE, availableSet);
  if (!chosenOnnx) {
    throw new Error('No supported ONNX weight file found in model repository.');
  }

  const requiredPresent = REQUIRED_BASE.filter((file) => availableSet.has(file));
  const requiredMissing = REQUIRED_BASE.filter((file) => !availableSet.has(file));

  if (requiredMissing.includes('config.json') || requiredMissing.includes('tokenizer.json')) {
    throw new Error(`Required files missing from repository: ${requiredMissing.join(', ')}`);
  }

  const optionalPresent = OPTIONAL_TOKENIZER.filter((file) => availableSet.has(file));

  const selectedFiles = Array.from(new Set([...requiredPresent, chosenOnnx, ...optionalPresent]));

  console.log(`[ai-download] Downloading ${selectedFiles.length} file(s) for ${REPO_ID}`);
  console.log(`[ai-download] Destination: ${DEST_ROOT}`);

  const downloaded = [];
  for (const filePath of selectedFiles) {
    const res = await fetch(FILE_URL(filePath), { headers: buildHeaders() });
    if (!res.ok || !res.body) {
      if (res.status === 401) {
        throw new Error(`Failed to download ${filePath}: 401 Unauthorized. Set HF_TOKEN environment variable and retry.`);
      }
      throw new Error(`Failed to download ${filePath}: ${res.status} ${res.statusText}`);
    }
    const destPath = path.join(DEST_ROOT, ...filePath.split('/'));
    await streamToFile(res, destPath);
    downloaded.push(filePath);
    console.log(`[ai-download] Saved ${filePath}`);
  }

  console.log('\n[ai-download] Completed successfully.');
  console.log(`[ai-download] ONNX selected: ${chosenOnnx}`);
  console.log(`[ai-download] Total downloaded: ${downloaded.length}`);
};

run().catch((error) => {
  console.error('[ai-download] Failed:', error.message || error);
  process.exitCode = 1;
});
