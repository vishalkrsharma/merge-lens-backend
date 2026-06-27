import { AgentType, Severity } from '@/generated/prisma/enums';

export const PG_BOSS = 'PG_BOSS';
export const REVIEW_QUEUE = 'review-pr';

export interface ReviewJobData {
  reviewId?: string;
  repo: string;
  owner: string;
  pullNumber: number;
  repositoryId: string;
  installationId: number;
  enabledAgents: AgentType[];
  severityThreshold: Severity;
}
