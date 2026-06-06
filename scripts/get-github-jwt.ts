import { createAppAuth } from '@octokit/auth-app';
import * as fs from 'fs';
import * as path from 'path';

const appId = process.env.GITHUB_APP_ID;
if (!appId) {
  console.error('GITHUB_APP_ID env var is not set');
  process.exit(1);
}

const keyPath = path.resolve(__dirname, '../keys/merge-lens-private-key.pem');
const privateKey = fs.readFileSync(keyPath, 'utf-8');

const auth = createAppAuth({ appId, privateKey });

void auth({ type: 'app' })
  .then(({ token }) => {
    console.log(token);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
