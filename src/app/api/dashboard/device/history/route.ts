import {
  ensureDatabase,
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import {
  findLatestDeviceInfoProfile,
  listDeviceInfoSnapshots,
} from '@/lib/repositories/device-info-repository';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') || 50);
  const snapshots = listDeviceInfoSnapshots(limitParam).map((snapshot) => ({
    id: snapshot.id,
    collectedAt: snapshot.collectedAt,
    source: snapshot.source,
    deviceName: snapshot.deviceName,
    productNameZh: snapshot.productNameZh,
    softwareVersion: snapshot.softwareVersion,
    hardwareVersion: snapshot.hardwareVersion,
    workmode: snapshot.workmode,
    carrier: snapshot.carrier,
    networkType: snapshot.networkType,
    connectionStatus: snapshot.connectionStatus,
    wanIp: snapshot.wanIp,
    serialNumber: snapshot.serialNumber,
  }));
  const profile = findLatestDeviceInfoProfile();

  return jsonOk({
    profile: profile
      ? {
          updatedAt: profile.updatedAt,
          source: profile.source,
          deviceName: profile.deviceName,
          productNameZh: profile.productNameZh,
          softwareVersion: profile.softwareVersion,
          workmode: profile.workmode,
          carrier: profile.carrier,
          networkType: profile.networkType,
        }
      : null,
    snapshots,
  });
}, '获取设备信息历史失败');