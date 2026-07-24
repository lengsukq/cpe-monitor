'use client';

import { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';

export function DataBackupSection() {
  const [open, setOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = () => {
    const a = document.createElement('a');
    a.href = '/api/system/backup';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCreateBackup = async () => {
    setBackingUp(true);
    setMessage(null);
    try {
      const res = await fetch('/api/system/backup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: '备份已创建到 data/backups 目录' });
      } else {
        setMessage({ type: 'error', text: data.error || '备份失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '备份请求失败' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('确定要恢复数据库吗？当前数据将被覆盖（会自动创建备份）。')) {
      event.target.value = '';
      return;
    }

    setRestoring(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/system/restore', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || '恢复成功，请刷新页面' });
      } else {
        setMessage({ type: 'error', text: data.error || '恢复失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '恢复请求失败' });
    } finally {
      setRestoring(false);
      event.target.value = '';
    }
  };

  return (
    <SettingsAccordionSection
      id="data-backup"
      icon={<DatabaseBackup className="h-4 w-4" />}
      eyebrow="Data safety"
      title="数据备份"
      description="下载或恢复 SQLite 数据库文件。"
      status={<Badge variant="secondary">手动</Badge>}
      summary={[
        { label: '备份格式', value: 'SQLite .db' },
        { label: '恢复安全', value: '自动预备份' },
      ]}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="space-y-4">
        {message && (
          <p className={`rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadBackup}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            下载备份
          </Button>
          <Button variant="outline" size="sm" onClick={handleCreateBackup} disabled={backingUp}>
            {backingUp ? '备份中…' : '创建本地备份'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={restoring}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {restoring ? '恢复中…' : '恢复数据库'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".db"
          className="hidden"
          onChange={handleRestore}
        />

        <p className="text-xs text-muted-foreground">
          提示：恢复数据库前会自动创建备份到 data/backups 目录。恢复后需要刷新页面。
        </p>
      </div>
    </SettingsAccordionSection>
  );
}
