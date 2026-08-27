import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeTestConfig } from '../../scripts/vitest-node-config.ts';

export default nodeTestConfig(path.dirname(fileURLToPath(import.meta.url)));
