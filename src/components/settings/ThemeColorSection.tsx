'use client';

import { Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useThemeColor } from '@/hooks/useThemeColor';
import { HUE_SLIDER_GRADIENT, THEME_PRESETS } from '@/lib/theme-colors';
import { cn } from '@/lib/utils';

export function ThemeColorSection() {
  const { hue, setHue, preset, isDefault, reset } = useThemeColor();

  return (
    <Card id="theme-color" className="scroll-mt-32 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Palette className="h-4 w-4" />
            </span>
            Appearance / theme color
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">主题色</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            选择预设色板或拖动滑杆自定义品牌色，即时生效并保存在本地浏览器。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-colors"
            style={{ backgroundColor: `oklch(0.6 0.16 ${hue})` }}
          >
            <span className="size-2.5 rounded-full bg-white/80" />
            {preset ? preset.name : `Hue ${hue}°`}
          </span>
          {!isDefault ? (
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              恢复默认
            </Button>
          ) : null}
        </div>
      </div>

      <CardContent className="space-y-6 px-5 py-5 sm:px-6">
        {/* Preset swatches */}
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground">预设色板</p>
          <div className="flex flex-wrap gap-3">
            {THEME_PRESETS.map((item) => {
              const isActive = hue === item.hue;
              return (
                <button
                  key={item.hue}
                  type="button"
                  title={item.name}
                  aria-label={`主题色：${item.name}`}
                  aria-pressed={isActive}
                  onClick={() => setHue(item.hue)}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition-all duration-200',
                    isActive ? 'bg-muted/60' : 'hover:bg-muted/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full shadow-inner transition-all duration-200 group-hover:scale-110',
                      isActive && 'scale-110 ring-2 ring-foreground/60 ring-offset-2 ring-offset-card',
                    )}
                    style={{ backgroundColor: `oklch(0.6 0.16 ${item.hue})` }}
                  >
                    {isActive ? (
                      <svg viewBox="0 0 16 16" className="size-4 text-white" fill="none" aria-hidden>
                        <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                  <span className={cn(
                    'text-[10px] font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom hue slider */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">自定义色相</p>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {hue}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={hue}
            onChange={(event) => setHue(Number(event.target.value))}
            aria-label="自定义色相滑杆"
            className="hue-slider w-full"
            style={{ ['--hue-track' as string]: HUE_SLIDER_GRADIENT }}
          />
        </div>

        {/* Live preview strip */}
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground">实时预览</p>
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-lg transition-colors duration-300"
              style={{ backgroundColor: `oklch(0.6 0.14 ${hue})` }}
            >
              C
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex gap-1.5">
                {[0, -26, 19, 9].map((offset) => (
                  <span
                    key={offset}
                    className="h-2 flex-1 rounded-full transition-colors duration-300"
                    style={{ backgroundColor: `oklch(0.62 0.14 ${((hue + offset) % 360 + 360) % 360})` }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                品牌色会应用到按钮、图表、导航高亮和卡片阴影等所有界面元素
              </p>
            </div>
            <span
              className="hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors duration-300 sm:block"
              style={{ backgroundColor: `oklch(0.5 0.16 ${hue})` }}
            >
              示例按钮
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ThemeColorSection;
