import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App, Button, Card, Input, List, Popconfirm, Space, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { BoldOutlined, EyeOutlined, ItalicOutlined, OrderedListOutlined, SaveOutlined, SendOutlined, UndoOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../../lib/api';
import { mailTemplatesApi, type MailDraftInput, type MailPreview, type MailTemplateDetail, type MailTemplateRevision, type MailTemplateSummary } from '../../lib/mail-templates';
import './mail-templates.css';

function sourceHtml(content: MailTemplateRevision | null): string {
  if (!content) return '';
  if (content.html) return content.html;
  return content.text.split(/\r?\n/).map(line => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');
}

function TemplateEditor({ keyName, onChanged }: { keyName: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [detail, setDetail] = useState<MailTemplateDetail | null>(null);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<MailPreview | null>(null);
  const [tab, setTab] = useState('editor');
  const [unsaved, setUnsaved] = useState(false);
  // Track changes during a pending request. A response can only clear the
  // unsaved indicator if the editor still matches the submitted snapshot.
  const editVersion = useRef(0);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: { attributes: { class: 'clucky-mail-editor', 'aria-label': t('admin:emailTemplates.body') } },
    onUpdate({ editor: current }) {
      editVersion.current += 1;
      setBodyText(current.getText({ blockSeparator: '\n' }));
      setBodyHtml(current.getHTML());
      setUnsaved(true);
    },
  });

  useEffect(() => {
    editor?.setEditable(!pending && !loading);
  }, [editor, pending, loading]);

  const commonVariables = ['{{customerName}}', '{{orderCode}}'];
  const variables = keyName.startsWith('BRANCH_') ? ['{{login}}', '{{roleLabel}}', '{{channelInstruction}}']
    : keyName === 'ORDER_READY' ? [...commonVariables, '{{readyInstruction}}']
      : ['ORDER_CANCELLED', 'REFUND_REJECTED', 'REFUND_WAITING_BANK_DETAILS'].includes(keyName)
        ? [...commonVariables, '{{reason}}']
        : ['PAYMENT_CONFIRMED', 'REFUND_PROCESSED'].includes(keyName)
          ? [...commonVariables, '{{amount}}']
          : keyName === 'PAYMENT_FAILED' ? [...commonVariables, '{{paymentExplanation}}']
            : /^(ORDER_|PAYMENT_|REFUND_)/.test(keyName) ? commonVariables : [];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    mailTemplatesApi.get(keyName, controller.signal)
      .then(next => {
        if (controller.signal.aborted) return;
        setDetail(next);
        const content = next.draft ?? next.published;
        setSubject(content?.subject ?? next.template.subject);
        setBodyText(content?.text ?? '');
        setBodyHtml(content?.html ?? null);
        editor?.commands.setContent(sourceHtml(content));
        setUnsaved(false);
      })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [keyName, editor]);

  const input = (): MailDraftInput => ({
    expectedRevision: detail?.template.latestRevision ?? 0,
    subject: subject.trim(),
    text: bodyText.trim(),
    html: bodyHtml,
  });

  async function perform(task: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError('');
    try { await task(); }
    catch (failure) { setError(getErrorMessage(failure)); }
    finally { setPending(false); }
  }

  const showPreview = (revision?: MailTemplateRevision) => perform(async () => {
    const result = await mailTemplatesApi.preview(keyName, revision
      ? { expectedRevision: detail?.template.latestRevision ?? 0, subject: revision.subject, text: revision.text, html: revision.html }
      : input());
    setPreview(result);
    setTab('preview');
  });

  const saveDraft = () => perform(async () => {
    const submitted = input();
    const submittedVersion = editVersion.current;
    const result = await mailTemplatesApi.saveDraft(keyName, submitted);
    setDetail(result);
    setUnsaved(submittedVersion !== editVersion.current);
    setPreview(null);
    onChanged();
    void message.success(t('admin:emailTemplates.saved'));
  });

  const publish = () => perform(async () => {
    if (!detail?.draft) return;
    const result = await mailTemplatesApi.publish(keyName, detail.draft.id, detail.template.publishedRevisionId ?? 0);
    setDetail(result);
    setUnsaved(false);
    onChanged();
    void message.success(t('admin:emailTemplates.published'));
  });

  const restore = (revisionId: number) => perform(async () => {
    if (!detail) return;
    const result = await mailTemplatesApi.restore(keyName, revisionId, detail.template.latestRevision);
    setDetail(result);
    const restored = result.draft;
    if (restored) {
      setSubject(restored.subject);
      setBodyText(restored.text);
      setBodyHtml(restored.html);
      editor?.commands.setContent(sourceHtml(restored));
      setUnsaved(false);
    }
    setTab('editor');
    onChanged();
    void message.success(t('admin:emailTemplates.restored'));
  });

  return <div className="clucky-mail-workspace">
    <Space className="clucky-mail-workspace-heading" direction="vertical" size={2}>
      <Typography.Text type="secondary">{keyName}</Typography.Text>
      <Typography.Title level={4}>{detail?.template.subject || t('admin:emailTemplates.loading')}</Typography.Title>
      <Typography.Text type="secondary">{t('admin:emailTemplates.help')}</Typography.Text>
    </Space>
    {error && <Alert type="error" showIcon message={error} closable onClose={() => setError('')} />}
    {loading ? <Spin /> : <>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'editor', label: t('admin:emailTemplates.editor') },
        { key: 'preview', label: t('admin:emailTemplates.preview') },
        { key: 'history', label: t('admin:emailTemplates.history') },
      ]} />
      {tab === 'editor' && <div className="clucky-mail-form">
        <label htmlFor="clucky-mail-subject">{t('admin:emailTemplates.subject')}</label>
        <Input id="clucky-mail-subject" value={subject} maxLength={255} onChange={e => { editVersion.current += 1; setSubject(e.target.value); setUnsaved(true); }} disabled={pending} />
        <label>{t('admin:emailTemplates.body')}</label>
        <div className="clucky-mail-toolbar" role="toolbar" aria-label={t('admin:emailTemplates.toolbar')}>
          <Button aria-label={t('admin:emailTemplates.bold')} icon={<BoldOutlined />} onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor || pending} />
          <Button aria-label={t('admin:emailTemplates.italic')} icon={<ItalicOutlined />} onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor || pending} />
          <Button aria-label={t('admin:emailTemplates.heading')} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor || pending}>H2</Button>
          <Button aria-label={t('admin:emailTemplates.bullets')} icon={<UnorderedListOutlined />} onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor || pending} />
          <Button aria-label={t('admin:emailTemplates.numbers')} icon={<OrderedListOutlined />} onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor || pending} />
          <Button aria-label={t('admin:emailTemplates.undo')} icon={<UndoOutlined />} onClick={() => editor?.chain().focus().undo().run()} disabled={!editor || pending} />
        </div>
        <EditorContent editor={editor} />
        <Typography.Text type="secondary">{t('admin:emailTemplates.variablesHint')}</Typography.Text>
        <Space wrap>
          {variables.map(variable =>
            <Button key={variable} size="small" disabled={pending} onClick={() => editor?.chain().focus().insertContent(variable).run()}>{variable}</Button>)}
        </Space>
        <Space wrap>
          <Button icon={<EyeOutlined />} loading={pending} onClick={() => void showPreview()}>{t('admin:emailTemplates.preview')}</Button>
          <Button icon={<SaveOutlined />} loading={pending} onClick={() => void saveDraft()}>{t('admin:emailTemplates.saveDraft')}</Button>
          <Popconfirm title={t('admin:emailTemplates.confirmPublish')} onConfirm={() => void publish()} okText={t('admin:emailTemplates.publish')}>
            <Button type="primary" icon={<SendOutlined />} loading={pending} disabled={!detail?.draft || unsaved}>{t('admin:emailTemplates.publish')}</Button>
          </Popconfirm>
        </Space>
      </div>}
      {tab === 'preview' && <div className="clucky-mail-preview">
        {preview ? <>
          <Typography.Paragraph><strong>{t('admin:emailTemplates.subject')}:</strong> {preview.subject}</Typography.Paragraph>
          <iframe title={t('admin:emailTemplates.preview')} sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html} />
          <Typography.Title level={5}>{t('admin:emailTemplates.textPreview')}</Typography.Title>
          <pre>{preview.text}</pre>
        </> : <Button onClick={() => void showPreview()} loading={pending} icon={<EyeOutlined />}>{t('admin:emailTemplates.preview')}</Button>}
      </div>}
      {tab === 'history' && <Table<MailTemplateRevision> size="small" rowKey="id" pagination={{ pageSize: 8 }}
        dataSource={detail?.history ?? []} columns={[
          { title: t('admin:emailTemplates.version'), dataIndex: 'revision', render: value => `v${value}` },
          { title: t('admin:emailTemplates.subject'), dataIndex: 'subject', ellipsis: true },
          { title: t('admin:emailTemplates.state'), render: (_, row) =>
            <Tag color={row.id === detail?.template.publishedRevisionId ? 'success' : row.publishedAt ? 'default' : 'gold'}>
              {row.id === detail?.template.publishedRevisionId ? t('admin:emailTemplates.current')
                : row.publishedAt ? t('admin:emailTemplates.archived') : t('admin:emailTemplates.draft')}
            </Tag> },
          { title: t('admin:emailTemplates.actor'), dataIndex: 'actorId', render: value => value === 0 ? 'System' : `#${value}` },
          { title: t('admin:emailTemplates.actions'), render: (_, row) => <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => void showPreview(row)}>{t('admin:emailTemplates.preview')}</Button>
            <Popconfirm title={t('admin:emailTemplates.confirmRestore')} onConfirm={() => void restore(row.id)}>
              <Button size="small" disabled={pending}>{t('admin:emailTemplates.restore')}</Button>
            </Popconfirm>
          </Space> },
        ]} />}
    </>}
  </div>;
}

export function EmailTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<MailTemplateSummary[]>([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    mailTemplatesApi.list(controller.signal)
      .then(rows => {
        if (controller.signal.aborted) return;
        setTemplates(rows);
        setSelected(current => current || rows[0]?.key || '');
      })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  const visible = useMemo(() => templates.filter(row => `${row.key} ${row.subject}`.toLowerCase().includes(search.trim().toLowerCase())), [templates, search]);

  return <div className="clucky-mail-page">
    <Typography.Title level={2}>{t('admin:emailTemplates.title')}</Typography.Title>
    <Typography.Paragraph type="secondary">{t('admin:emailTemplates.description')}</Typography.Paragraph>
    {error && <Alert type="error" message={error} showIcon />}
    <div className="clucky-mail-columns">
      <Card className="clucky-mail-directory" title={t('admin:emailTemplates.list')} extra={<Tag>{templates.length}</Tag>}>
        <Input.Search allowClear value={search} onChange={event => setSearch(event.target.value)} placeholder={t('admin:emailTemplates.search')} />
        {loading ? <Spin /> : <List dataSource={visible} renderItem={row => <List.Item>
          <button type="button" onClick={() => setSelected(row.key)} aria-current={selected === row.key ? 'page' : undefined}
            className={`clucky-mail-selector${row.key === selected ? ' selected' : ''}`}>
            <strong>{row.key}</strong><span>{row.subject}</span>
          </button>
        </List.Item>} />}
      </Card>
      <Card className="clucky-mail-editor-card">
        {selected ? <TemplateEditor key={selected} keyName={selected} onChanged={() => setRevision(value => value + 1)} />
          : <Typography.Text type="secondary">{t('admin:emailTemplates.choose')}</Typography.Text>}
      </Card>
    </div>
  </div>;
}
