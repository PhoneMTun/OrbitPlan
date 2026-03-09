export type JiraIntegrationStatus = {
  configured: boolean;
  connected: boolean;
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

export type JiraCreateFieldOption = {
  id: string;
  label: string;
  children?: JiraCreateFieldOption[];
};

export type JiraCreateFieldMeta = {
  key: string;
  name: string;
  required: boolean;
  schemaType?: string;
  itemsType?: string;
  custom?: string;
  allowedValues?: JiraCreateFieldOption[];
};

export type JiraIssueTypeCreateMeta = {
  id: string;
  name: string;
  description?: string;
  fields: JiraCreateFieldMeta[];
};

export type JiraLookupItem = {
  id: string;
  label: string;
  secondary?: string;
};

export type JiraExportResult = {
  createdCount: number;
  issues: Array<{
    actionId: string;
    key: string;
    url: string;
  }>;
};

export type JiraScanItem = {
  actionId: string;
  description: string;
  status: "ready" | "blocked";
  reasons: string[];
};

export type JiraScanResult = {
  readyCount: number;
  blockedCount: number;
  items: JiraScanItem[];
};
