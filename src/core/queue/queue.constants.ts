import { AgentType, Severity } from '@/generated/prisma/enums';

export const REVIEW_QUEUE = 'review-pr';

export interface ReviewJobData {
  repo: string;
  owner: string;
  pullNumber: number;
  repositoryId: string;
  installationId: number;
  enabledAgents: AgentType[];
  severityThreshold: Severity;
}
