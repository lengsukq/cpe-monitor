import { ApiError, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { parseDateTime } from '@/lib/date-time';
import {
  buildPeriodBreakdownForKey,
  generatePeriodReportByScope,
  resolvePeriodDateRange,
} from '@/lib/report-generator';
import {
  findPeriodReportById,
  findPeriodReportByKey,
  listPeriodReports,
  type PeriodReportRow,
  upsertPeriodReport,
} from '@/lib/repositories/report-repository';
import type { DeviceRanking } from '@/types';

function parseTopDevices(raw: string | null): DeviceRanking[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DeviceRanking[]) : [];
  } catch {
    return [];
  }
}

function serializePeriodSummary(row: PeriodReportRow) {
  const periodType: 'weekly' | 'monthly' = row.period_type === 'monthly' ? 'monthly' : 'weekly';
  const range = resolvePeriodDateRange(periodType, row.report_date);
  return {
    id: row.id,
    periodKey: row.report_date,
    periodType,
    startDate: range?.startDate ?? null,
    endDate: range?.endDate ?? null,
    totalUpload: row.total_upload ?? 0,
    totalDownload: row.total_download ?? 0,
    topDevices: parseTopDevices(row.top_devices),
    avgSignal: row.avg_signal,
    networkQuality: row.network_quality,
    createdAt: parseDateTime(row.created_at)?.toISOString() ?? null,
  };
}

function serializePeriodDetail(row: PeriodReportRow) {
  const base = serializePeriodSummary(row);
  const breakdown = buildPeriodBreakdownForKey(base.periodType, base.periodKey);
  const divisor = breakdown
    ? Math.max(1, breakdown.dayCount > 0 ? breakdown.dayCount : breakdown.totalDays)
    : (base.periodType === 'weekly' ? 7 : 30);

  return {
    ...base,
    startDate: breakdown?.startDate ?? base.startDate,
    endDate: breakdown?.endDate ?? base.endDate,
    dailyAvgUpload: Math.round(base.totalUpload / divisor),
    dailyAvgDownload: Math.round(base.totalDownload / divisor),
    peakDay: breakdown?.peakDay ?? null,
    peakDayTraffic: breakdown?.peakDayTraffic ?? 0,
    dayCount: breakdown?.dayCount ?? 0,
    totalDays: breakdown?.totalDays ?? (base.periodType === 'weekly' ? 7 : 30),
    dailyBreakdown: breakdown?.dailyBreakdown ?? [],
  };
}

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const idParam = url.searchParams.get('id');

  if (idParam !== null) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError('无效的周期报告 ID', 400);
    }
    const row = findPeriodReportById(id);
    if (!row) {
      throw new ApiError('未找到对应的周期报告', 404);
    }
    return jsonOk({ report: serializePeriodDetail(row) });
  }

  const type = url.searchParams.get('type'); // 'weekly' | 'monthly'
  const limit = Math.min(52, Math.max(1, Number(url.searchParams.get('limit')) || 20));

  if (type !== 'weekly' && type !== 'monthly') {
    return jsonOk({ reports: [] });
  }

  const rows = listPeriodReports(type, limit);
  return jsonOk({ reports: rows.map(serializePeriodSummary) });
}, '获取周期报告失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  let body: { type?: unknown; scope?: unknown } = {};
  try {
    body = (await request.json()) as { type?: unknown; scope?: unknown };
  } catch {
    throw new ApiError('请求参数格式无效', 400);
  }

  const type = body.type;
  if (type !== 'weekly' && type !== 'monthly') {
    throw new ApiError('请指定有效的报告类型 (weekly 或 monthly)', 400);
  }
  const scope = body.scope === 'previous' ? 'previous' : 'current';

  const generated = generatePeriodReportByScope(type, scope);
  upsertPeriodReport(generated);
  const saved = findPeriodReportByKey(type, generated.periodKey);

  return jsonOk({
    report: {
      id: saved?.id ?? 0,
      periodKey: generated.periodKey,
      periodType: generated.periodType,
      startDate: generated.startDate,
      endDate: generated.endDate,
      totalUpload: generated.totalUpload,
      totalDownload: generated.totalDownload,
      dailyAvgUpload: generated.dailyAvgUpload,
      dailyAvgDownload: generated.dailyAvgDownload,
      peakDay: generated.peakDay,
      peakDayTraffic: generated.peakDayTraffic,
      dayCount: generated.dayCount,
      totalDays: generated.totalDays,
      topDevices: generated.topDevices,
      avgSignal: generated.avgSignal,
      networkQuality: generated.networkQuality,
      dailyBreakdown: generated.dailyBreakdown,
      createdAt: parseDateTime(saved?.created_at)?.toISOString() ?? generated.generatedAt,
    },
  });
}, '生成周期报告失败');
