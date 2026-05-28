import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '@/prisma/prisma.service';
import { openAPI } from 'better-auth/plugins';

export const prisma = new PrismaService();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
  },
  trustedOrigins: ['http://localhost:3000'],
  experimental: { joins: true },
  plugins: [openAPI()],
});
