import * as fs from 'fs';
import * as path from 'path';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { Client } from 'pg';

async function main() {
  const login = process.argv[2] ?? process.env.TEST_GITHUB_ACCOUNT_LOGIN;

  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    console.error('GITHUB_APP_ID env var is not set');
    process.exit(1);
  }

  const keyPath = path.resolve(__dirname, '../keys/merge-lens-private-key.pem');
  const privateKey = fs.readFileSync(keyPath, 'utf-8');

  const auth = createAppAuth({ appId, privateKey });
  const { token } = await auth({ type: 'app' });
  const octokit = new Octokit({ auth: token });

  const { data: installations } = await octokit.rest.apps.listInstallations();

  const targets = login
    ? installations.filter(
        (i) => i.account && 'login' in i.account && i.account.login === login,
      )
    : installations;

  if (targets.length === 0) {
    console.log(
      login
        ? `No installation found for account: ${login}`
        : 'No installations found.',
    );
  } else {
    for (const installation of targets) {
      try {
        await octokit.rest.apps.deleteInstallation({
          installation_id: installation.id,
        });
        console.log(
          `✅ Uninstalled installation ${installation.id} (${(installation.account as any)?.login})`,
        );
      } catch (err: any) {
        if (err.status === 404) {
          console.log(`⚠️  Installation ${installation.id} already removed`);
        } else {
          console.error(
            `❌ Failed to delete installation ${installation.id}: ${err.message}`,
          );
        }
      }
    }
  }

  // Reset DB state — safe to run even if tables were already cleared by db:reset
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();

  if (login) {
    await client.query(
      'DELETE FROM repository WHERE "userId" = (SELECT id FROM "user" WHERE email = $1)',
      [process.env.TEST_GITHUB_ACCOUNT_EMAIL ?? login],
    );
    await client.query(
      'UPDATE "user" SET has_github_app = false WHERE email = $1',
      [process.env.TEST_GITHUB_ACCOUNT_EMAIL ?? login],
    );
  } else {
    await client.query('DELETE FROM repository');
    await client.query('DELETE FROM pending_installation');
    await client.query('UPDATE "user" SET has_github_app = false');
  }

  console.log('✅ DB reset complete');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
