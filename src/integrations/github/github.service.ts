import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, Octokit } from 'octokit';

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
      privateKey: fs.readFileSync(
        path.resolve(process.cwd(), 'keys/merge-lens-private-key.pem'),
        'utf8',
      ),
    });
  }

  getInstallationOctokit(): Promise<Octokit> {
    return this.app.getInstallationOctokit(
      Number(this.config.getOrThrow<string>('GITHUB_INSTALLATION_ID')),
    );
  }

  async getPRDetails(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullRequestDetails> {
    const octokit = await this.getInstallationOctokit();
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
  ): Promise<string> {
    const octokit = await this.getInstallationOctokit();
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
  ): Promise<PullRequestFile[]> {
    const octokit = await this.getInstallationOctokit();
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
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit();
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
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit();
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
