import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import { getSchedulerStatus } from '@/lib/scheduler';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (!dbInitialized) {
      initializeDatabase();
      dbInitialized = true;
    }

    let settingsMap: Record<string, string> = {};
    try {
      const settings = db.prepare('SELECT * FROM system_settings').all() as any[];
      settingsMap = Object.fromEntries(settings.map((s: any) => [s.key, s.value]));
    } catch (e) {
      console.warn('Failed to fetch settings:', e);
    }

    const schedulerStatus = {
      enabled: settingsMap['scheduler_enabled'] === 'true',
      interval: parseInt(settingsMap['scheduler_interval'] || '60'),
      running: getSchedulerStatus().running,
    };

    // Try real-time data from CPE
    let currentUpload = 0;
    let currentDownload = 0;
    let connectedDevices = 0;
    let signalStrength = 0;
    let connectionStatus = 'unknown';
    let updateState = 'unknown';
    let networkType = 'unknown';
    let source: 'cpe' | 'database' = 'database';
    let cpeError = '';

    try {
      const client = getOrCreateCpeClient();
      await client.ensureLogin();

      const [trafficStats, onlineState, hostInfo] = await Promise.all([
        client.getTrafficStatistics(),
        client.getOnlineState(),
        client.getHostInfo(),
      ]);

      currentUpload = parseInt(trafficStats?.CurrentUploadRate || '0');
      currentDownload = parseInt(trafficStats?.CurrentDownloadRate || '0');
      connectedDevices = hostInfo?.devices?.length || 0;
      connectionStatus = onlineState?.ConnectionStatus || 'unknown';
      updateState = onlineState?.UpdateState || onlineState?.upgState || 'unknown';
      networkType = onlineState?.CellData?.Rat || onlineState?.cellularWanRadioAccessTechnology || 'unknown';
      source = 'cpe';

      if (onlineState?.CellData) {
        signalStrength = parseInt(onlineState.CellData.SignalStrength || '0');
      }
    } catch (e: any) {
      cpeError = e.message || 'CPE 登录失败，请检查设备地址、网络连接和密码。';
      // Fallback to database
      try {
        const latestTraffic = db.prepare('SELECT * FROM traffic_data ORDER BY timestamp DESC LIMIT 1').all() as any[];
        if (latestTraffic[0]) {
          currentUpload = latestTraffic[0].upload_bytes || 0;
          currentDownload = latestTraffic[0].download_bytes || 0;
          connectedDevices = latestTraffic[0].connected_devices || 0;
          signalStrength = latestTraffic[0].signal_strength || 0;
        }
      } catch {}
    }

    return NextResponse.json({
      currentUpload,
      currentDownload,
      connectedDevices,
      signalStrength,
      connectionStatus,
      updateState,
      networkType,
      source,
      cpeError,
      schedulerStatus,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json({
      currentUpload: 0,
      currentDownload: 0,
      connectedDevices: 0,
      signalStrength: 0,
      connectionStatus: 'unknown',
      updateState: 'unknown',
      networkType: 'unknown',
      source: 'database',
      cpeError: error instanceof Error ? error.message : 'CPE 状态获取失败',
      schedulerStatus: { enabled: false, interval: 60, running: false },
    });
  }
}
