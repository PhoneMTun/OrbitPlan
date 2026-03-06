export type JiraOAuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope?: string;
};

export type JiraSite = {
  id: string;
  name: string;
  url: string;
};

export type JiraProject = {
  id: string;
  key: string;
  name: string;
};

export type JiraExportResult = {
  createdCount: number;
  issues: Array<{
    actionId: string;
    key: string;
    url: string;
  }>;
};
