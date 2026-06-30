import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '@/core/prisma/prisma.service';
import { openAPI, organization } from 'better-auth/plugins';

export const prisma = new PrismaService();

const frontendUrls = process.env.FRONTEND_URLS?.split(',').map((o) =>
  o.trim(),
) ?? ['http://localhost:3000'];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureOrgForUser(userId: string): Promise<void> {
  const existing = await prisma.member.findFirst({ where: { userId } });
  if (existing) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const base = toSlug(user.name || user.email.split('@')[0] || 'workspace');
  let slug = base;
  let n = 2;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const org = await prisma.organization.create({
    data: { name: user.name || slug, slug },
  });
  await prisma.member.create({
    data: { organizationId: org.id, userId, role: 'owner' },
  });
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      hasGithubApp: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ['user', 'user:email', 'repo', 'write:org'],
    },
  },
  trustedOrigins: [
    ...frontendUrls,
    // Allow any *.localhost subdomain in dev for org subdomain routing
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://*.localhost:3000']
      : []),
  ],
  account: {
    // Skips the redundant signed-cookie check in the DB state strategy.
    // That cookie has a 5-min TTL while the DB state has a 10-min TTL, so
    // any GitHub auth flow that takes >5 min raises a false state_mismatch.
    skipStateCookieCheck: true,
  },
  onAPIError: {
    // Redirect auth errors to the frontend instead of the backend root.
    errorURL: frontendUrls[0],
  },
  advanced: {
    useSecureCookies: true,
    cookies: {
      session_token: {
        attributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    },
  },
  experimental: { joins: true },
  plugins: [openAPI(), organization()],
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== 'github') return;

          // Auto-create org for new users (idempotent — skips if org already exists)
          await ensureOrgForUser(account.userId);

          const pending = await prisma.pendingInstallation.findUnique({
            where: { githubAccountId: account.accountId },
          });

          if (!pending) return;

          await prisma.user.update({
            where: { id: account.userId },
            data: { hasGithubApp: true },
          });

          if (Array.isArray(pending.repositories)) {
            const repos = pending.repositories as {
              name: string;
              full_name: string;
            }[];
            for (const entry of repos) {
              const [owner, repo] = entry.full_name.split('/');
              await prisma.repository.upsert({
                where: {
                  owner_repo_userId: { owner, repo, userId: account.userId },
                },
                create: {
                  owner,
                  repo,
                  installationId: pending.installationId,
                  userId: account.userId,
                  enabledAgents: [],
                },
                update: { installationId: pending.installationId },
              });
            }
          }

          await prisma.pendingInstallation.delete({
            where: { id: pending.id },
          });
        },
      },
    },
  },
});
