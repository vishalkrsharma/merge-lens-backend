import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '@/core/prisma/prisma.service';
import { openAPI } from 'better-auth/plugins';

export const prisma = new PrismaService();

export const auth = betterAuth({
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
      scope: ['user', 'user:email', 'repo'],
      callbackUrl: `${process.env.FRONTEND_URL}/dashboard`,
    },
  },
  trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  experimental: { joins: true },
  plugins: [openAPI()],
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== 'github') return;

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
