export interface GithubWebhookPayload {
  action: string;
}

export interface GithubPullRequestPayload extends GithubWebhookPayload {
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

export interface GithubInstallationPayload extends GithubWebhookPayload {
  installation: {
    id: number;
    account: {
      login: string;
      type: string;
    };
  };
  repositories?: {
    id: number;
    name: string;
    full_name: string;
  }[];
  sender: {
    id: number;
    login: string;
  };
}

export interface GithubInstallationRepositoriesPayload extends GithubWebhookPayload {
  action: 'added' | 'removed';
  installation: {
    id: number;
    account: {
      login: string;
      type: string;
    };
  };
  repositories_added: {
    id: number;
    name: string;
    full_name: string;
  }[];
  repositories_removed: {
    id: number;
    name: string;
    full_name: string;
  }[];
  sender: {
    id: number;
    login: string;
  };
}

export interface GithubIssuesPayload extends GithubWebhookPayload {
  issue: {
    number: number;
    title: string;
  };
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
