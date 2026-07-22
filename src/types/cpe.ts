export type CpePrimitive = string | number | boolean | null | undefined;
export type CpeRecord = Record<string, unknown>;

export interface CpeDeviceInformation extends CpeRecord {
  spreadname_zh?: string;
  spreadname_en?: string;
  DeviceName?: string;
  Classify?: string;
  uptime?: string;
  SoftwareVersion?: string;
  WebUIVersion?: string;
  HardwareVersion?: string;
  ParameterVersion?: string;
  iniversion?: string;
  workmode?: string;
  supportmode?: string;
  Mccmnc?: string;
  Imei?: string;
  ImeiSvn?: string;
  Imsi?: string;
  Iccid?: string;
  Msisdn?: string;
  SerialNumber?: string;
  MacAddress1?: string;
  MacAddress2?: string;
  WifiMacAddrWl0?: string;
  WifiMacAddrWl1?: string;
  SecondWanIPAddress?: string;
  WanIPAddress?: string;
  SecondWanIPv6Address?: string;
  WanIPv6Address?: string;
  wan_dns_address?: string;
  wan_ipv6_dns_address?: string;
  submask?: string;
}

export interface CpeDeviceCapabilities extends CpeRecord {
  WIFI?: CpePrimitive;
  USB?: CpePrimitive;
  GuestNetwork?: CpePrimitive;
  PowerSave?: CpePrimitive;
  RebootTime?: CpePrimitive;
}

export interface CpeSmartDeviceInfo extends CpeRecord {
  hwAccount?: CpePrimitive;
  prodId?: CpePrimitive;
}

export interface CpeDeviceState extends CpeRecord {
  FriendlyName?: CpePrimitive;
  DeviceIconType?: CpePrimitive;
  ManufacturerOUI?: CpePrimitive;
  WeeklyReportUrl?: CpePrimitive;
  devcap?: CpeDeviceCapabilities;
  SmartDevInfo?: CpeSmartDeviceInfo;
}

export interface CpeOnlineState extends CpeRecord {
  DeviceName?: CpePrimitive;
  CurrentVersion?: CpePrimitive;
  IpAddress?: CpePrimitive;
  URL?: CpePrimitive;
  UpgTimes?: CpePrimitive;
  IsSupportOnlineUpg?: CpePrimitive;
  IsMainDevice?: CpePrimitive;
  UpdateState?: CpePrimitive;
  upgState?: CpePrimitive;
}

export interface CpeNetworkStatus extends CpeRecord {
  ConnectionStatus?: string;
  SignalStrength?: CpePrimitive;
  CurrentNetworkTypeEx?: CpePrimitive;
  CurrentNetworkType?: CpePrimitive;
  ServiceStatus?: CpePrimitive;
  SimStatus?: CpePrimitive;
  RoamingStatus?: CpePrimitive;
  flymode?: CpePrimitive;
  WifiStatus?: CpePrimitive;
  CurrentWifiUser?: CpePrimitive;
  TotalWifiUser?: CpePrimitive;
  SignalIconNr?: CpePrimitive;
  EndcStatus?: CpePrimitive;
}

export interface CpeSignalInfo extends CpeRecord {
  mode?: string;
  plmn?: string;
  bandInfo?: string;
  cell_id?: string;
  pci?: CpePrimitive;
  band?: CpePrimitive;
  nrearfcn?: CpePrimitive;
  nrrsrp?: CpePrimitive;
  rsrp?: CpePrimitive;
  nrrsrq?: CpePrimitive;
  rsrq?: CpePrimitive;
  nrrssi?: CpePrimitive;
  rssi?: CpePrimitive;
  nrsinr?: CpePrimitive;
  sinr?: CpePrimitive;
  tac?: CpePrimitive;
  rrc_status?: CpePrimitive;
  ims?: CpePrimitive;
  nrulbandwidth?: CpePrimitive;
  nrdlbandwidth?: CpePrimitive;
  nrrank?: CpePrimitive;
  nrbler?: CpePrimitive;
  nrdlfreq?: CpePrimitive;
  nrulfreq?: CpePrimitive;
  nrcqi0?: CpePrimitive;
  nrdlmcs?: CpePrimitive;
  nrulmcs?: CpePrimitive;
  nrtxpower?: CpePrimitive;
}

export interface CpeCellInfo extends CpeRecord {
  cellinfo?: string;
  lac?: CpePrimitive;
}

export interface CpePlmnInfo extends CpeRecord {
  FullName?: string;
  ShortName?: string;
  Numeric?: string;
}

export interface CpeNetworkSnapshot extends CpeRecord {
  status: CpeNetworkStatus;
  plmn: CpePlmnInfo;
  cellInfo: CpeCellInfo;
  signal: CpeSignalInfo;
  connectionStatus: string;
  carrier: string;
  plmnCode: string;
  networkType: string;
  cellId: string;
  pci: CpePrimitive;
  band: CpePrimitive;
  nrarfcn: CpePrimitive;
  rsrp: CpePrimitive;
  rsrq: CpePrimitive;
  rssi: CpePrimitive;
  sinr: CpePrimitive;
  signalStrength: number;
}

export interface CpeTrafficStatistics extends CpeRecord {
  CurrentUploadRate?: string | number;
  CurrentDownloadRate?: string | number;
  CurrentUpload?: string | number;
  CurrentDownload?: string | number;
  TotalUpload?: string | number;
  TotalDownload?: string | number;
  CurrentConnectTime?: string | number;
  TotalConnectTime?: string | number;
  CurrentMonthDownload?: string | number;
  CurrentMonthUpload?: string | number;
}

export interface CpeHostRaw extends CpeRecord {
  ActualName?: CpePrimitive;
  HostName?: CpePrimitive;
  IPAddress?: CpePrimitive;
  MACAddress?: CpePrimitive;
  Active?: CpePrimitive;
  TxKBytes?: CpePrimitive;
  RxKBytes?: CpePrimitive;
  UploadBytes?: CpePrimitive;
  DownloadBytes?: CpePrimitive;
  AssociatedTime?: CpePrimitive;
  OnlineDuration?: CpePrimitive;
  InterfaceType?: CpePrimitive;
  Frequency?: CpePrimitive;
  rssi?: CpePrimitive;
  SignalStrength?: CpePrimitive;
}

export interface CpeDevicePageResponse {
  deviceInformation?: CpeDeviceInformation;
  deviceInfo?: CpeDeviceState;
  onlineState?: CpeOnlineState;
  cellInformation?: CpeNetworkSnapshot;
  vendorName?: unknown;
  wlanDbho?: unknown;
  topology?: unknown;
  devCapacity?: unknown;
  portalSettings?: unknown;
  iocDeviceCapacity?: unknown;
}
