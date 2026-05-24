export const REVIEW_QUEUE = 'review-pr';

export interface ReviewJobData {
  repo: string;
  owner: string;
  pullNumber: number;
}
