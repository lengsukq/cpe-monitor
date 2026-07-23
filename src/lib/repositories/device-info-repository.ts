import { db, ensureDatabaseReady, toSqliteTimestamp } from '@/lib/db';
import type {
  CpeDeviceInformation,
  CpeDevicePageResponse,
  CpeDeviceState,
  CpeNetworkSnapshot,
  CpeOnlineState,
} from '@/types/cpe';

export interface DeviceInfoSnapshotFields {
  deviceName: string | null;
  friendlyName: string | null;
  productNameZh: string | null;
  productNameEn: string | null;
  softwareVersion: string | null;
  hardwareVersion: string | null;
  webuiVersion: string | null;
  workmode: string | null;
  supportmode: string | null;
  imei: string | null;
  imsi: string | null;
  iccid: string | null;
  msisdn: string | null;
  serialNumber: string | null;
  mccmnc: string | null;
  macAddress1: string | null;
  wanIp: string | null;
  wanIpv6: string | null;
  uptimeSeconds: number | null;
  carrier: string | null;
  plmnCode: string | null;
  networkType: string | null;
  connectionStatus: string | null;
  simStatus: string | null;
}

export interface DeviceInfoSnapshotRecord extends DeviceInfoSnapshotFields {
  id: number;
  collectedAt: string;
  source: string;
  payloadJson: string;
}

export interface DeviceInfoProfileRecord extends DeviceInfoSnapshotFields {
  updatedAt: string;
  source: string;
  payloadJson: string;
}

interface DeviceInfoSnapshotRow {
  id: number;
  collected_at: string;
  source: string;
  device_name: string | null;
  friendly_name: string | null;
  product_name_zh: string | null;
  product_name_en: string | null;
  software_version: string | null;
  hardware_version: string | null;
  webui_version: string | null;
  workmode: string | null;
  supportmode: string | null;
  imei: string | null;
  imsi: string | null;
  iccid: string | null;
  msisdn: string | null;
  serial_number: string | null;
  mccmnc: string | null;
  mac_address1: string | null;
  wan_ip: string | null;
  wan_ipv6: string | null;
  uptime_seconds: number | null;
  carrier: string | null;
  plmn_code: string | null;
  network_type: string | null;
  connection_status: string | null;
  sim_status: string | null;
  payload_json: string;
}

interface DeviceInfoProfileRow {
  updated_at: string;
  source: string;
  device_name: string | null;
  friendly_name: string | null;
  product_name_zh: string | null;
  product_name_en: string | null;
  software_version: string | null;
  hardware_version: string | null;
  webui_version: string | null;
  workmode: string | null;
  supportmode: string | null;
  imei: string | null;
  imsi: string | null;
  iccid: string | null;
  msisdn: string | null;
  serial_number: string | null;
  mccmnc: string | null;
  mac_address1: string | null;
  wan_ip: string | null;
  wan_ipv6: string | null;
  uptime_seconds: number | null;
  carrier: string | null;
  plmn_code: string | null;
  network_type: string | null;
  connection_status: string | null;
  sim_status: string | null;
  payload_json: string;
}

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function nullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapSnapshotRow(row: DeviceInfoSnapshotRow): DeviceInfoSnapshotRecord {
  return {
    id: row.id,
    collectedAt: row.collected_at,
    source: row.source,
    deviceName: row.device_name,
    friendlyName: row.friendly_name,
    productNameZh: row.product_name_zh,
    productNameEn: row.product_name_en,
    softwareVersion: row.software_version,
    hardwareVersion: row.hardware_version,
    webuiVersion: row.webui_version,
    workmode: row.workmode,
    supportmode: row.supportmode,
    imei: row.imei,
    imsi: row.imsi,
    iccid: row.iccid,
    msisdn: row.msisdn,
    serialNumber: row.serial_number,
    mccmnc: row.mccmnc,
    macAddress1: row.mac_address1,
    wanIp: row.wan_ip,
    wanIpv6: row.wan_ipv6,
    uptimeSeconds: row.uptime_seconds,
    carrier: row.carrier,
    plmnCode: row.plmn_code,
    networkType: row.network_type,
    connectionStatus: row.connection_status,
    simStatus: row.sim_status,
    payloadJson: row.payload_json,
  };
}

function mapProfileRow(row: DeviceInfoProfileRow): DeviceInfoProfileRecord {
  return {
    updatedAt: row.updated_at,
    source: row.source,
    deviceName: row.device_name,
    friendlyName: row.friendly_name,
    productNameZh: row.product_name_zh,
    productNameEn: row.product_name_en,
    softwareVersion: row.software_version,
    hardwareVersion: row.hardware_version,
    webuiVersion: row.webui_version,
    workmode: row.workmode,
    supportmode: row.supportmode,
    imei: row.imei,
    imsi: row.imsi,
    iccid: row.iccid,
    msisdn: row.msisdn,
    serialNumber: row.serial_number,
    mccmnc: row.mccmnc,
    macAddress1: row.mac_address1,
    wanIp: row.wan_ip,
    wanIpv6: row.wan_ipv6,
    uptimeSeconds: row.uptime_seconds,
    carrier: row.carrier,
    plmnCode: row.plmn_code,
    networkType: row.network_type,
    connectionStatus: row.connection_status,
    simStatus: row.sim_status,
    payloadJson: row.payload_json,
  };
}

export function buildDeviceInfoSnapshotFields(input: {
  deviceInformation: CpeDeviceInformation;
  deviceInfo: CpeDeviceState;
  onlineState: CpeOnlineState;
  networkSnapshot: CpeNetworkSnapshot | null;
}): DeviceInfoSnapshotFields {
  const information = input.deviceInformation;
  const deviceState = input.deviceInfo;
  const network = input.networkSnapshot;

  return {
    deviceName: nullableText(
      information.DeviceName || input.onlineState.DeviceName || deviceState.FriendlyName,
    ),
    friendlyName: nullableText(deviceState.FriendlyName),
    productNameZh: nullableText(information.spreadname_zh),
    productNameEn: nullableText(information.spreadname_en),
    softwareVersion: nullableText(information.SoftwareVersion),
    hardwareVersion: nullableText(information.HardwareVersion),
    webuiVersion: nullableText(information.WebUIVersion),
    workmode: nullableText(information.workmode),
    supportmode: nullableText(information.supportmode),
    imei: nullableText(information.Imei),
    imsi: nullableText(information.Imsi),
    iccid: nullableText(information.Iccid),
    msisdn: nullableText(information.Msisdn),
    serialNumber: nullableText(information.SerialNumber),
    mccmnc: nullableText(information.Mccmnc),
    macAddress1: nullableText(information.MacAddress1),
    wanIp: nullableText(information.WanIPAddress),
    wanIpv6: nullableText(information.WanIPv6Address),
    uptimeSeconds: nullableInteger(information.uptime),
    carrier: nullableText(network?.carrier),
    plmnCode: nullableText(network?.plmnCode),
    networkType: nullableText(network?.networkType),
    connectionStatus: nullableText(network?.connectionStatus),
    simStatus: nullableText(network?.status?.SimStatus),
  };
}

export function persistDeviceInfoSnapshot(input: {
  source: 'scheduler' | 'manual';
  fields: DeviceInfoSnapshotFields;
  payload: CpeDevicePageResponse;
  collectedAt?: Date;
}): { snapshotId: number } {
  ensureDatabaseReady();
  const collectedAt = input.collectedAt || new Date();
  const collectedAtText = toSqliteTimestamp(collectedAt);
  const payloadJson = JSON.stringify(input.payload);
  const fields = input.fields;

  const insertSnapshot = db.prepare(
    `INSERT INTO cpe_device_snapshots (
      collected_at, source,
      device_name, friendly_name, product_name_zh, product_name_en,
      software_version, hardware_version, webui_version, workmode, supportmode,
      imei, imsi, iccid, msisdn, serial_number, mccmnc,
      mac_address1, wan_ip, wan_ipv6, uptime_seconds,
      carrier, plmn_code, network_type, connection_status, sim_status,
      payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const upsertProfile = db.prepare(
    `INSERT INTO cpe_device_profile (
      id, updated_at, source,
      device_name, friendly_name, product_name_zh, product_name_en,
      software_version, hardware_version, webui_version, workmode, supportmode,
      imei, imsi, iccid, msisdn, serial_number, mccmnc,
      mac_address1, wan_ip, wan_ipv6, uptime_seconds,
      carrier, plmn_code, network_type, connection_status, sim_status,
      payload_json
    ) VALUES (
      1, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?
    )
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      source = excluded.source,
      device_name = excluded.device_name,
      friendly_name = excluded.friendly_name,
      product_name_zh = excluded.product_name_zh,
      product_name_en = excluded.product_name_en,
      software_version = excluded.software_version,
      hardware_version = excluded.hardware_version,
      webui_version = excluded.webui_version,
      workmode = excluded.workmode,
      supportmode = excluded.supportmode,
      imei = excluded.imei,
      imsi = excluded.imsi,
      iccid = excluded.iccid,
      msisdn = excluded.msisdn,
      serial_number = excluded.serial_number,
      mccmnc = excluded.mccmnc,
      mac_address1 = excluded.mac_address1,
      wan_ip = excluded.wan_ip,
      wan_ipv6 = excluded.wan_ipv6,
      uptime_seconds = excluded.uptime_seconds,
      carrier = excluded.carrier,
      plmn_code = excluded.plmn_code,
      network_type = excluded.network_type,
      connection_status = excluded.connection_status,
      sim_status = excluded.sim_status,
      payload_json = excluded.payload_json`,
  );

  const persist = db.transaction(() => {
    const result = insertSnapshot.run(
      collectedAtText,
      input.source,
      fields.deviceName,
      fields.friendlyName,
      fields.productNameZh,
      fields.productNameEn,
      fields.softwareVersion,
      fields.hardwareVersion,
      fields.webuiVersion,
      fields.workmode,
      fields.supportmode,
      fields.imei,
      fields.imsi,
      fields.iccid,
      fields.msisdn,
      fields.serialNumber,
      fields.mccmnc,
      fields.macAddress1,
      fields.wanIp,
      fields.wanIpv6,
      fields.uptimeSeconds,
      fields.carrier,
      fields.plmnCode,
      fields.networkType,
      fields.connectionStatus,
      fields.simStatus,
      payloadJson,
    );

    upsertProfile.run(
      collectedAtText,
      input.source,
      fields.deviceName,
      fields.friendlyName,
      fields.productNameZh,
      fields.productNameEn,
      fields.softwareVersion,
      fields.hardwareVersion,
      fields.webuiVersion,
      fields.workmode,
      fields.supportmode,
      fields.imei,
      fields.imsi,
      fields.iccid,
      fields.msisdn,
      fields.serialNumber,
      fields.mccmnc,
      fields.macAddress1,
      fields.wanIp,
      fields.wanIpv6,
      fields.uptimeSeconds,
      fields.carrier,
      fields.plmnCode,
      fields.networkType,
      fields.connectionStatus,
      fields.simStatus,
      payloadJson,
    );

    return Number(result.lastInsertRowid);
  });

  return { snapshotId: persist() };
}

export function findLatestDeviceInfoProfile(): DeviceInfoProfileRecord | null {
  ensureDatabaseReady();
  const row = db.prepare(
    `SELECT updated_at, source,
      device_name, friendly_name, product_name_zh, product_name_en,
      software_version, hardware_version, webui_version, workmode, supportmode,
      imei, imsi, iccid, msisdn, serial_number, mccmnc,
      mac_address1, wan_ip, wan_ipv6, uptime_seconds,
      carrier, plmn_code, network_type, connection_status, sim_status,
      payload_json
     FROM cpe_device_profile
     WHERE id = 1`,
  ).get() as DeviceInfoProfileRow | undefined;
  return row ? mapProfileRow(row) : null;
}

export function listDeviceInfoSnapshots(limit = 50): DeviceInfoSnapshotRecord[] {
  ensureDatabaseReady();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const rows = db.prepare(
    `SELECT id, collected_at, source,
      device_name, friendly_name, product_name_zh, product_name_en,
      software_version, hardware_version, webui_version, workmode, supportmode,
      imei, imsi, iccid, msisdn, serial_number, mccmnc,
      mac_address1, wan_ip, wan_ipv6, uptime_seconds,
      carrier, plmn_code, network_type, connection_status, sim_status,
      payload_json
     FROM cpe_device_snapshots
     ORDER BY collected_at DESC, id DESC
     LIMIT ?`,
  ).all(safeLimit) as DeviceInfoSnapshotRow[];
  return rows.map(mapSnapshotRow);
}

export function parseDeviceInfoPayload(payloadJson: string): CpeDevicePageResponse | null {
  try {
    const parsed = JSON.parse(payloadJson) as CpeDevicePageResponse;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deleteDeviceInfoSnapshotsBefore(cutoffTimestamp: string): number {
  ensureDatabaseReady();
  const result = db.prepare(
    'DELETE FROM cpe_device_snapshots WHERE collected_at < ?',
  ).run(cutoffTimestamp);
  return Number(result.changes || 0);
}
