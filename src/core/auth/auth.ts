import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '@/core/prisma/prisma.service';
import { openAPI } from 'better-auth/plugins';

export const prisma = new PrismaService();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ['user', 'user:email'],
      callbackUrl: `${process.env.FRONTEND_URL}/dashboard`,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
  },
  trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  experimental: { joins: true },
  plugins: [openAPI()],
});
