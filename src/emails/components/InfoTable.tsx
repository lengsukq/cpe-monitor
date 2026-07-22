import { emailTheme } from './Layout';

export interface InfoTableRow {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  emphasis?: boolean;
}

interface InfoTableProps {
  rows: InfoTableRow[];
}

export default function InfoTable({ rows }: InfoTableProps) {
  return (
    <table
      role="presentation"
      style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        overflow: 'hidden',
        backgroundColor: emailTheme.surfaceMuted,
        border: `1px solid ${emailTheme.borderSoft}`,
        borderRadius: '12px',
      }}
    >
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.label}-${index}`}>
            <td
              style={{
                width: '42%',
                padding: '10px 14px',
                borderTop: index === 0 ? undefined : `1px solid ${emailTheme.borderSoft}`,
                color: emailTheme.muted,
                fontSize: '12px',
                lineHeight: '1.45',
                verticalAlign: 'top',
              }}
            >
              {row.label}
            </td>
            <td
              style={{
                padding: '10px 14px',
                borderTop: index === 0 ? undefined : `1px solid ${emailTheme.borderSoft}`,
                color: row.emphasis ? emailTheme.brandDark : emailTheme.text,
                fontFamily: row.mono ? 'SFMono-Regular,Consolas,"Liberation Mono",monospace' : undefined,
                fontSize: '12px',
                fontWeight: row.emphasis ? 700 : 600,
                lineHeight: '1.45',
                textAlign: 'right',
                verticalAlign: 'top',
                wordBreak: 'break-word',
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
