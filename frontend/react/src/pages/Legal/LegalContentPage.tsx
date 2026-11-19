import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Alert, Button, Card, Col, Input, Modal, Popconfirm, Row, Segmented, Space, Table, Tag, Typography } from 'antd';
import { CheckOutlined, EyeOutlined, FileTextOutlined, HistoryOutlined, ReloadOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons';
import { api, getErrorMessage } from '../../lib/api';
import legalTemplates from './legal-templates.json' with { type: 'json' };
import { LegalRequestScope } from './legal-request-scope';
import './legal-content.css';

type LegalType = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY';
type Language = 'vi' | 'en';
interface Revision {
  id: number;
  type: LegalType;
  version: number;
  titleVi: string;
  titleEn: string;
  htmlVi: string;
  htmlEn: string;
  createdAt: string;
  createdBy: number;
  publishedAt: string | null;
}
interface Overview {
  type: LegalType;
  latestRevision: number;
  draftVersion: number | null;
  publishedVersion: number | null;
  draft: Revision | null;
  published: Revision | null;
}
type Editing = Pick<Revision, 'titleVi' | 'titleEn' | 'htmlVi' | 'htmlEn'>;
const empty: Editing = { titleVi: '', titleEn: '', htmlVi: '<p></p>', htmlEn: '<p></p>' };

const outlines: Record<LegalType, Editing> = legalTemplates;

function RichEditor({ initial, onUpdate, language, disabled }: {
  initial: string; onUpdate: (value: string) => void; language: Language; disabled: boolean;
}) {
  const { t } = useTranslation('legal');
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } } })],
    content: initial,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => onUpdate(instance.getHTML()),
    editorProps: { attributes: { 'aria-label': t('editor'), lang: language } },
  });
  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  if (!editor) return null;
  const link = () => {
    const address = window.prompt(t('linkPrompt'), editor.getAttributes('link').href || 'https://');
    if (address === null) return;
    if (!/^https?:\/\/[^\s]+$/i.test(address)) return;
    editor.chain().focus().setLink({ href: address }).run();
  };
  return <div className="legal-rich-editor">
    <div className="legal-editor-toolbar">
      <Button size="small" disabled={disabled} type={editor.isActive('bold') ? 'primary' : 'default'} aria-label={t('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Button>
      <Button size="small" disabled={disabled} type={editor.isActive('italic') ? 'primary' : 'default'} aria-label={t('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Button>
      <Button size="small" disabled={disabled} type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'} aria-label={t('heading2')}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
      <Button size="small" disabled={disabled} type={editor.isActive('bulletList') ? 'primary' : 'default'} aria-label={t('bullet')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>•</Button>
      <Button size="small" disabled={disabled} aria-label={t('link')} onClick={link}>{t('link')}</Button>
    </div>
    <EditorContent editor={editor} />
  </div>;
}

export function LegalContentPage() {
  const { t } = useTranslation('legal');
  const [type, setType] = useState<LegalType>('TERMS_OF_SERVICE');
  const [language, setLanguage] = useState<Language>('vi');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [history, setHistory] = useState<Revision[]>([]);
  const [editing, setEditing] = useState<Editing>(empty);
  const [baseline, setBaseline] = useState<Editing>(empty);
  const [editorRevision, setEditorRevision] = useState(0);
  const [preview, setPreview] = useState<Revision | 'editing' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const requestsRef = useRef<LegalRequestScope | null>(null);
  if (!requestsRef.current) requestsRef.current = new LegalRequestScope(type);
  const requests = requestsRef.current;
  // Synchronous invalidation on render (before passive effect cleanup).
  requests.activate(type);
  const base = `/api/legal/admin/${type}`;
  const dirty = useMemo(() => JSON.stringify(editing) !== JSON.stringify(baseline), [editing, baseline]);

  const refresh = useCallback(async () => {
    const token = requests.start(type);
    const [doc, revisions] = await Promise.all([
      api.get<Overview>(`/api/legal/admin/${type}`),
      api.get<Revision[]>(`/api/legal/admin/${type}/history`),
    ]);
    if (!requests.current(token, type) || doc.data.type !== type) return false;
    setOverview(doc.data);
    setHistory(revisions.data);
    const latest = doc.data.draft || doc.data.published;
    const content = latest ? {
      titleVi: latest.titleVi, titleEn: latest.titleEn, htmlVi: latest.htmlVi, htmlEn: latest.htmlEn,
    } : empty;
    setEditing(content);
    setBaseline(content);
    setEditorRevision(n => n + 1);
    return true;
  }, [type, requests]);

  useEffect(() => {
    let live = true;
    setOverview(null); setHistory([]); setEditing(empty); setBaseline(empty); setPreview(null);
    setLoading(true); setError(''); setNotice('');
    void refresh().catch(failure => { if (live && requests.isType(type)) setError(getErrorMessage(failure)); })
      .finally(() => { if (live && requests.isType(type)) setLoading(false); });
    return () => { live = false; requests.invalidate(); };
  }, [refresh, requests, type]);

  async function perform(task: () => Promise<Revision>, kind: 'save' | 'publish' | 'restore') {
    if (busy || !overview || overview.type !== type || loading) return;
    const activeType = type;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await task();
      const applied = await refresh();
      if (!applied || !requests.isType(activeType)) return;
      setNotice(t(kind === 'save' ? 'saveSuccess' : kind === 'publish' ? 'publishSuccess' : 'restoreSuccess',
        { version: result.version }));
    } catch (failure) {
      if (requests.isType(activeType)) setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const updateHtml = (next: string) => setEditing(previous => ({
    ...previous, [language === 'vi' ? 'htmlVi' : 'htmlEn']: next,
  }));
  const html = (revision: Revision | 'editing', selected: Language) => revision === 'editing'
    ? editing[selected === 'vi' ? 'htmlVi' : 'htmlEn']
    : revision[selected === 'vi' ? 'htmlVi' : 'htmlEn'];

  return <div className="legal-admin-page">
    <div className="legal-page-heading">
      <div><Typography.Title level={2}>{t('heading')}</Typography.Title><Typography.Paragraph type="secondary">{t('subtitle')}</Typography.Paragraph></div>
      <Button icon={<ReloadOutlined />} loading={loading} disabled={busy || dirty}
        onClick={() => void refresh().catch(failure => setError(getErrorMessage(failure)))}>{t('reload')}</Button>
    </div>
    <Segmented<LegalType> block value={type} disabled={busy}
      options={[{ label: t('terms'), value: 'TERMS_OF_SERVICE' }, { label: t('privacy'), value: 'PRIVACY_POLICY' }]}
      onChange={next => {
        if (next === type) return;
        if (dirty) Modal.confirm({ title: t('dirty'), onOk: () => setType(next) });
        else setType(next);
      }} />
    {error && <Alert type="error" showIcon message={error} />}
    {notice && <Alert type="success" showIcon message={notice} />}
    {!loading && !overview?.published && <Alert showIcon type="warning" message={t('initialNotice')} />}
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={16}>
        <Card loading={loading} title={<Space><FileTextOutlined /> {t('editor')}</Space>}
          extra={<Space>{overview?.draftVersion ? <Tag color="warning">{t('draft')} #{overview.draftVersion}</Tag> : <Tag>{t('noDraft')}</Tag>}
            {overview?.publishedVersion ? <Tag color="success">{t('published')} #{overview.publishedVersion}</Tag>
              : <Tag color="default">{t('notPublished')}</Tag>}</Space>}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={12}>
              <Col xs={24} md={12}><Typography.Text strong>{t('titleVi')}</Typography.Text>
                <Input disabled={busy || loading} value={editing.titleVi} maxLength={160} onChange={e => setEditing(value => ({ ...value, titleVi: e.target.value }))} /></Col>
              <Col xs={24} md={12}><Typography.Text strong>{t('titleEn')}</Typography.Text>
                <Input disabled={busy || loading} value={editing.titleEn} maxLength={160} onChange={e => setEditing(value => ({ ...value, titleEn: e.target.value }))} /></Col>
            </Row>
            <Segmented<Language> block value={language} disabled={busy || loading} onChange={setLanguage}
              options={[{ label: t('languageVi'), value: 'vi' }, { label: t('languageEn'), value: 'en' }]} />
            <RichEditor key={`${type}:${language}:${editorRevision}`} language={language} disabled={busy || loading}
              initial={editing[language === 'vi' ? 'htmlVi' : 'htmlEn']} onUpdate={updateHtml} />
            <Typography.Paragraph type="secondary">{t('editorHint')}</Typography.Paragraph>
            {dirty && <Alert showIcon type="info" message={t('dirty')} />}
            <Space wrap>
              <Button icon={<EyeOutlined />} disabled={busy || loading} onClick={() => setPreview('editing')}>{t('preview')}</Button>
              <Popconfirm title={t('templateConfirm')} onConfirm={() => {
                setEditing(outlines[type]); setEditorRevision(n => n + 1);
              }}><Button disabled={busy || loading}>{t('template')}</Button></Popconfirm>
              <Button type="primary" icon={<SaveOutlined />} disabled={busy || loading || !dirty || overview?.type !== type}
                onClick={() => void perform(() => api.post<Revision>(`${base}/draft`, {
                  ...editing, expectedDraftVersion: overview?.draftVersion,
                  expectedRevision: overview?.latestRevision,
                }).then(res => res.data), 'save')}>
                {t('saveDraft')}</Button>
              <Popconfirm title={t('confirmPublish')} onConfirm={() => {
                if (overview?.draftVersion) void perform(
                  () => api.post<Revision>(`${base}/publish`, { version: overview.draftVersion }).then(res => res.data), 'publish');
              }}>
                <Button icon={<CheckOutlined />} disabled={busy || loading || dirty || overview?.type !== type || !overview?.draftVersion}>{t('publish')}</Button>
              </Popconfirm>
            </Space>
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card title={<Space><HistoryOutlined /> {t('history')}</Space>}>
          <Table<Revision> rowKey="id" size="small" pagination={{ pageSize: 6 }}
            loading={loading} dataSource={history} locale={{ emptyText: t('empty') }}
            columns={[
              { title: '#', dataIndex: 'version', render: (_, revision) =>
                <Space direction="vertical"><strong>v{revision.version}</strong>
                  {revision.version === overview?.publishedVersion && <Tag color="success">{t('published')}</Tag>}
                  {revision.version === overview?.draftVersion && <Tag color="warning">{t('draft')}</Tag>}
                </Space> },
              { title: t('actions'), render: (_, revision) => <Space direction="vertical">
                <Button size="small" icon={<EyeOutlined />} onClick={() => setPreview(revision)}>{t('preview')}</Button>
                <Popconfirm title={t('confirmRestore')} onConfirm={() => void perform(
                  () => api.post<Revision>(`${base}/restore/${revision.version}`, {
                    expectedDraftVersion: overview?.draftVersion, expectedRevision: overview?.latestRevision,
                  }).then(res => res.data), 'restore')}>
                  <Button size="small" icon={<RollbackOutlined />} disabled={busy || loading || dirty || overview?.type !== type}>{t('restore')}</Button>
                </Popconfirm>
              </Space> },
            ]} />
        </Card>
      </Col>
    </Row>
    <Modal open={preview != null} onCancel={() => setPreview(null)} footer={null}
      title={<Space><EyeOutlined /> {t('previewTitle')}{typeof preview === 'object' && preview && ` #${preview.version}`}</Space>}
      width={900}>
      <Typography.Paragraph type="secondary">{t('previewHint')}</Typography.Paragraph>
      <Segmented<Language> value={language} onChange={setLanguage}
        options={[{ label: t('languageVi'), value: 'vi' }, { label: t('languageEn'), value: 'en' }]} />
      {preview && <iframe title={t('previewTitle')} className="legal-preview-frame" sandbox=""
        referrerPolicy="no-referrer" srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font:16px/1.7 system-ui;color:#16100D;padding:16px}a{color:#8F1216}</style></head><body>${html(preview, language)}</body></html>`} />}
    </Modal>
  </div>;
}
