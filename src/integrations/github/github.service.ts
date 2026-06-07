import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, Octokit } from 'octokit';

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
}

export interface PullRequestFile {
  filename: string;
  patch?: string;
}

export interface PullRequestDetails {
  title: string;
  description: string;
}

@Injectable()
export class GithubService {
  private readonly app: App;

  constructor(private readonly config: ConfigService) {
    this.app = new App({
      appId: this.config.getOrThrow<string>('GITHUB_APP_ID'),
      privateKey: this.resolvePrivateKey(),
    });
  }

  private resolvePrivateKey(): string {
    const envKey = this.config.get<string>('GITHUB_PRIVATE_KEY');
    if (envKey) return envKey.replace(/\\n/g, '\n');
    return fs.readFileSync(
      path.resolve(process.cwd(), 'keys/merge-lens-private-key.pem'),
      'utf8',
    );
  }

  getInstallationOctokit(installationId: number): Promise<Octokit> {
    return this.app.getInstallationOctokit(installationId);
  }

  private getUserOctokit(accessToken: string): Octokit {
    return new Octokit({ auth: accessToken });
  }

  async listUserRepos(accessToken: string): Promise<GithubRepo[]> {
    const octokit = this.getUserOctokit(accessToken);
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      type: 'owner',
      sort: 'updated',
      per_page: 100,
    });
    return response.data.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      description: r.description ?? null,
    }));
  }

  async getAppInstallationId(accessToken: string): Promise<number | null> {
    const octokit = this.getUserOctokit(accessToken);
    const appId = parseInt(this.config.getOrThrow<string>('GITHUB_APP_ID'), 10);
    const response =
      await octokit.rest.apps.listInstallationsForAuthenticatedUser({
        per_page: 100,
      });
    const installation = response.data.installations.find(
      (i) => i.app_id === appId,
    );
    return installation?.id ?? null;
  }

  async addRepoToInstallation(
    accessToken: string,
    installationId: number,
    repositoryId: number,
  ): Promise<void> {
    const octokit = this.getUserOctokit(accessToken);
    await octokit.rest.apps.addRepoToInstallationForAuthenticatedUser({
      installation_id: installationId,
      repository_id: repositoryId,
    });
  }

  async listInstallationRepos(
    installationId: number,
  ): Promise<{ owner: string; repo: string }[]> {
    const octokit = await this.getInstallationOctokit(installationId);
    const response = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });
    return response.data.repositories.map((r) => {
      const [owner, repo] = r.full_name.split('/');
      return { owner, repo };
    });
  }

  async getPRDetails(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
  ): Promise<PullRequestDetails> {
    const octokit = await this.getInstallationOctokit(installationId);
    const pr = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return {
      title: pr.data.title,
      description: pr.data.body ?? '',
    };
  }

  async getHeadSha(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
  ): Promise<string> {
    const octokit = await this.getInstallationOctokit(installationId);
    const pr = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return pr.data.head.sha;
  }

  async getChangedFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number,
  ): Promise<PullRequestFile[]> {
    const octokit = await this.getInstallationOctokit(installationId);
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return response.data;
  }

  async postIssueComment(
    owner: string,
    repo: string,
    pullNumber: number,
    body: string,
    installationId: number,
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit(installationId);
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    });
  }

  async postReviewComment(
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    filePath: string,
    line: number,
    body: string,
    installationId: number,
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit(installationId);
    await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      body,
      commit_id: commitId,
      path: filePath,
      line,
    });
  }
}
