export interface GithubPullRequestPayload {
  action: string;
  number: number;
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  installation?: {
    id: number;
  };
}
