'use client';

import { RadioTower } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import { SaveButton } from '@/components/settings/SaveButton';
import FieldGroup from '@/components/forms/FieldGroup';
import { Callout } from '@/components/Callout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CpeConfigForm, TestResultState } from '@/features/settings/types';

interface CpeConnectionSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cpeConfig: CpeConfigForm;
  setCpeConfig: (value: CpeConfigForm) => void;
  loading: boolean;
  testing: boolean;
  testResult: TestResultState | null;
  onSave: () => void;
  onTest: () => void;
}

export function CpeConnectionSection({
  open,
  onOpenChange,
  cpeConfig,
  setCpeConfig,
  loading,
  testing,
  testResult,
  onSave,
  onTest,
}: CpeConnectionSectionProps) {
  return (
    <SettingsAccordionSection
      id="connection"
      icon={<RadioTower className="h-3.5 w-3.5" />}
      eyebrow="Device gateway"
      title="CPE 设备连接"
      description="用于读取设备状态、流量、短信与在线终端。"
      open={open}
      onOpenChange={onOpenChange}
      summary={[
        { label: 'CPE 地址', value: cpeConfig.cpeUrl || '—' },
        { label: '用户名', value: cpeConfig.cpeUsername || '—' },
        { label: '密码', value: '已保存（修改时再填写）' },
        {
          label: '连接测试',
          value: testResult
            ? (testResult.success ? `成功 · ${testResult.latency || ''}` : testResult.message)
            : '尚未测试',
        },
      ]}
    >
      <div className="fluid-card-grid gap-3 [--fluid-card-min:16rem]">
        <FieldGroup label="CPE 地址" hint="本地管理地址或可访问的内网地址。">
          <Input
            className="h-9 rounded-lg bg-background/60"
            value={cpeConfig.cpeUrl}
            onChange={(event) => setCpeConfig({ ...cpeConfig, cpeUrl: event.target.value })}
            placeholder="http://192.168.31.1"
          />
        </FieldGroup>
        <FieldGroup label="用户名">
          <Input
            className="h-9 rounded-lg bg-background/60"
            value={cpeConfig.cpeUsername}
            onChange={(event) => setCpeConfig({ ...cpeConfig, cpeUsername: event.target.value })}
          />
        </FieldGroup>
      </div>
      <FieldGroup label="密码" hint="留空可保持现有密码不变。">
        <Input
          className="h-9 rounded-lg bg-background/60"
          type="password"
          value={cpeConfig.cpePassword}
          onChange={(event) => setCpeConfig({ ...cpeConfig, cpePassword: event.target.value })}
          placeholder="留空则不修改"
        />
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <SaveButton saving={loading} onClick={onSave} label="保存连接配置" />
        <Button size="sm" variant="outline" onClick={onTest} disabled={testing}>
          <RadioTower className="mr-1.5 h-3.5 w-3.5" />
          {testing ? '正在测试…' : '测试连接'}
        </Button>
      </div>
      {testResult ? (
        <Callout tone={testResult.success ? 'success' : 'danger'} title={testResult.message}>
          {testResult.latency ? `响应时间：${testResult.latency}` : null}
        </Callout>
      ) : null}
    </SettingsAccordionSection>
  );
}

export default CpeConnectionSection;
