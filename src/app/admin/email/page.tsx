'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Recipient {
  name: string;
  email: string;
  selected: boolean;
}

export default function EmailPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const allTabs = ['send', 'templates', 'smtp'] as const;
  const tabs = role === 'VIEWER' ? allTabs.filter((t) => t !== 'smtp') : allTabs;
  const [tab, setTab] = useState<'send' | 'templates' | 'smtp'>('send');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Email System</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === t ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t === 'smtp' ? 'SMTP Settings' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'send' && <SendEmailTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'smtp' && <SmtpTab />}
    </div>
  );
}

function SendEmailTab() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [selectAll, setSelectAll] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/email?type=recipients').then((r) => r.json()),
      fetch('/api/email?type=templates').then((r) => r.json()),
    ]).then(([recipientsData, templatesData]) => {
      setRecipients(recipientsData.map((r: any) => ({ ...r, selected: true })));
      setTemplates(templatesData);
    });
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const toggleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    setRecipients(recipients.map((r) => ({ ...r, selected: newVal })));
  };

  const handleSend = async () => {
    const selectedRecipients = recipients.filter((r) => r.selected);
    if (selectedRecipients.length === 0) {
      setMessage('No recipients selected');
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedRecipients.map((r) => ({ name: r.name, email: r.email })),
          subject,
          body,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Send failed');
      }

      const data = await res.json();
      setMessage(`Email sent to ${data.sent} recipient(s)!`);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="input-field"
            >
              <option value="">Custom Email</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Input id="emailSubject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field resize-none"
              rows={10}
            />
            <p className="text-xs text-gray-500">
              Variables: {'{{name}}'}, {'{{email}}'}, {'{{squares}}'}, {'{{amountDue}}'}, {'{{commissioner}}'}, {'{{eventName}}'}, {'{{gameUrl}}'}, {'{{graceHours}}'}, {'{{paymentInstructions}}'}, {'{{paymentMethods}}'}, {'{{winners}}'}, {'{{rulesText}}'}
            </p>
          </div>

          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              message.includes('sent') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
            }`}>
              {message}
            </div>
          )}

          <Button onClick={handleSend} loading={sending} className="w-full">
            Send Email
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recipients</h3>
          <button onClick={toggleSelectAll} className="text-xs text-primary-400 hover:text-primary-300">
            {selectAll ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {recipients.map((r, idx) => (
            <label key={idx} className="flex items-center gap-2 text-sm hover:bg-gray-800 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={r.selected}
                onChange={() => {
                  const updated = [...recipients];
                  updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                  setRecipients(updated);
                }}
                className="rounded"
              />
              <span>{r.name}</span>
              <span className="text-gray-500 text-xs truncate">{r.email}</span>
            </label>
          ))}
          {recipients.length === 0 && (
            <p className="text-gray-500 text-sm">No recipients found</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/email?type=templates')
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  const startEdit = (tmpl: EmailTemplate | null) => {
    setEditing(tmpl);
    setName(tmpl?.name || '');
    setSubject(tmpl?.subject || '');
    setBody(tmpl?.body || '');
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template',
          id: editing?.id,
          name,
          subject,
          templateBody: body,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      setMessage('Template saved!');
      setEditing(null);

      const updated = await fetch('/api/email?type=templates').then((r) => r.json());
      setTemplates(updated);
    } catch {
      setMessage('Failed to save template');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Templates</h3>
          <Button size="sm" variant="secondary" onClick={() => startEdit(null)}>
            + New
          </Button>
        </div>
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
            >
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.subject}</p>
              </div>
              <button
                onClick={() => startEdit(t)}
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {(editing !== undefined && (editing !== null || name || subject || body)) && (
        <div className="card space-y-4">
          <h3 className="font-semibold">{editing ? 'Edit Template' : 'New Template'}</h3>

          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              message.includes('saved') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
            }`}>
              {message}
            </div>
          )}

          <Input id="tmplName" label="Template Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input id="tmplSubject" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input-field resize-none"
              rows={8}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setEditing(null); setName(''); setSubject(''); setBody(''); }} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">Save Template</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SmtpTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  useEffect(() => {
    fetch('/api/email?type=smtp')
      .then((r) => r.json())
      .then((data) => {
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(String(data.smtpPort || 587));
        setSmtpUser(data.smtpUser || '');
        setSmtpPass(data.smtpPass || '');
        setFromEmail(data.fromEmail || '');
        setFromName(data.fromName || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'smtp',
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpUser,
          smtpPass,
          fromEmail,
          fromName,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      setMessage('SMTP settings saved!');
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="card max-w-lg space-y-4">
      <h3 className="font-semibold text-lg">SMTP Configuration</h3>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          message.includes('saved') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message}
        </div>
      )}

      <Input id="smtpHost" label="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
      <Input id="smtpPort" label="SMTP Port" type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
      <p className="text-xs text-gray-500 -mt-2">
        Port 587 = STARTTLS (most common). Port 465 = direct SSL. SSL is auto-detected from port.
      </p>
      <Input id="smtpUser" label="SMTP Username" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
      <Input id="smtpPass" label="SMTP Password" type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
      <Input id="fromEmail" label="From Email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@example.com" />
      <Input id="fromName" label="From Name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Super Bowl Squares" />

      <Button onClick={handleSave} loading={saving} className="w-full">
        Save SMTP Settings
      </Button>

      <div className="border-t border-gray-700 pt-4 mt-4 space-y-3">
        <h4 className="font-medium text-sm text-gray-300">Test Connection</h4>
        <Input
          id="testEmail"
          label="Send test email to"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="your@email.com"
        />
        <Button
          variant="secondary"
          loading={testing}
          className="w-full"
          onClick={async () => {
            if (!testEmail) { setMessage('Enter a test email address'); return; }
            setTesting(true);
            setMessage('');
            try {
              const res = await fetch('/api/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: testEmail }),
              });
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Test failed');
              }
              setMessage('Test email sent successfully!');
            } catch (err: any) {
              setMessage(err.message || 'Test failed');
            } finally {
              setTesting(false);
            }
          }}
        >
          Send Test Email
        </Button>
      </div>
    </div>
  );
}
