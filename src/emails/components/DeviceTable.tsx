import { Section, Text, Row, Column } from '@react-email/components';
import type { DeviceRanking } from '@/types';
import { formatBytes } from '@/lib/format';

interface DeviceTableProps {
  devices: DeviceRanking[];
}

export default function DeviceTable({ devices }: DeviceTableProps) {
  return (
    <Section>
      <Row className="bg-gray-200 py-2 px-4 rounded-t-lg">
        <Column className="w-8">
          <Text className="text-gray-600 text-xs font-bold m-0">#</Text>
        </Column>
        <Column>
          <Text className="text-gray-600 text-xs font-bold m-0">设备名称</Text>
        </Column>
        <Column>
          <Text className="text-gray-600 text-xs font-bold m-0">IP 地址</Text>
        </Column>
        <Column className="text-right">
          <Text className="text-gray-600 text-xs font-bold m-0">下载</Text>
        </Column>
        <Column className="text-right">
          <Text className="text-gray-600 text-xs font-bold m-0">上传</Text>
        </Column>
      </Row>
      {devices.slice(0, 10).map((device, index) => (
        <Row
          key={device.mac}
          className={`py-2 px-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
        >
          <Column className="w-8">
            <Text className="text-gray-900 text-sm m-0">{index + 1}</Text>
          </Column>
          <Column>
            <Text className="text-gray-900 text-sm m-0">{device.name}</Text>
          </Column>
          <Column>
            <Text className="text-gray-500 text-sm m-0">{device.ip}</Text>
          </Column>
          <Column className="text-right">
            <Text className="text-gray-900 text-sm m-0">{formatBytes(device.downloadBytes)}</Text>
          </Column>
          <Column className="text-right">
            <Text className="text-gray-900 text-sm m-0">{formatBytes(device.uploadBytes)}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

