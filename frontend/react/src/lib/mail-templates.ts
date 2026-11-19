import { api } from './api';

export interface MailTemplateSummary {
  key: string;
  subject: string;
  active: boolean;
  updatedAt: string;
  publishedRevisionId: number | null;
  latestRevision: number;
}

export interface MailTemplateRevision {
  id: number;
  revision: number;
  subject: string;
  text: string;
  html: string | null;
  actorId: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface MailTemplateDetail {
  template: MailTemplateSummary;
  published: MailTemplateRevision | null;
  draft: MailTemplateRevision | null;
  history: MailTemplateRevision[];
}

export interface MailPreview { subject: string; text: string; html: string }

export interface MailDraftInput {
  expectedRevision: number;
  subject: string;
  text: string;
  html: string | null;
}

const path = (key: string) => `/api/notifications/email-templates/${encodeURIComponent(key)}`;

export const mailTemplatesApi = {
  list: (signal?: AbortSignal) => api.get<MailTemplateSummary[]>('/api/notifications/email-templates', { signal }).then(r => r.data),
  get: (key: string, signal?: AbortSignal) => api.get<MailTemplateDetail>(path(key), { signal }).then(r => r.data),
  preview: (key: string, body: MailDraftInput) => api.post<MailPreview>(`${path(key)}/preview`, body).then(r => r.data),
  saveDraft: (key: string, body: MailDraftInput) => api.post<MailTemplateDetail>(`${path(key)}/drafts`, body).then(r => r.data),
  publish: (key: string, revisionId: number, expectedPublishedRevisionId: number) =>
    api.post<MailTemplateDetail>(`${path(key)}/publish`, { revisionId, expectedPublishedRevisionId }).then(r => r.data),
  restore: (key: string, revisionId: number, expectedRevision: number) =>
    api.post<MailTemplateDetail>(`${path(key)}/restore`, { revisionId, expectedRevision }).then(r => r.data),
};
