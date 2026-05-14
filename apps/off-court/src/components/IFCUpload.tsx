import React from 'react';

type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface IFCUploadRecord {
  id: string;
  building_name: string;
  file_name: string;
  file_size_bytes: number;
  upload_status: UploadStatus;
  element_count: number;
  floor_count: number;
  room_count: number;
  error_message?: string | null;
  created_at: string;
}

interface StatusBadgeProps {
  status: UploadStatus;
}

const STATUS_STYLES: Record<UploadStatus, React.CSSProperties> = {
  pending: { backgroundColor: '#4A4A5A', color: '#C4C4D4' },
  processing: { backgroundColor: '#2D4A6B', color: '#7BB3E0' },
  completed: { backgroundColor: '#1E4030', color: '#4DB87A' },
  failed: { backgroundColor: '#4A1E1E', color: '#E07070' },
};

function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  return (
    <span
      style={{
        ...STATUS_STYLES[status],
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      {status}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function ProcessingBar(): React.ReactElement {
  return (
    <div
      style={{
        height: 3,
        backgroundColor: '#1E1E2E',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: '100%',
          width: '60%',
          backgroundColor: '#7B1E3C',
          borderRadius: 2,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}

interface UploadCardProps {
  upload: IFCUploadRecord;
}

function UploadCard({ upload }: UploadCardProps): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: '#16161E',
        border: '1px solid #2A2A3A',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <div
            style={{
              color: '#E8E8F0',
              fontSize: 14,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {upload.building_name}
          </div>
          <div
            style={{
              color: '#7A7A8A',
              fontSize: 11,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {upload.file_name} · {formatBytes(upload.file_size_bytes)}
          </div>
        </div>
        <StatusBadge status={upload.upload_status} />
      </div>

      {upload.upload_status === 'processing' && <ProcessingBar />}

      {upload.upload_status === 'completed' && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #1E1E2E',
          }}
        >
          {[
            { label: 'Elements', value: upload.element_count },
            { label: 'Floors', value: upload.floor_count },
            { label: 'Rooms', value: upload.room_count },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ color: '#7B1E3C', fontSize: 16, fontWeight: 700 }}>{value}</div>
              <div style={{ color: '#6A6A7A', fontSize: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {upload.upload_status === 'failed' && upload.error_message && (
        <div
          style={{
            marginTop: 6,
            color: '#E07070',
            fontSize: 11,
            backgroundColor: '#1E1010',
            padding: '4px 8px',
            borderRadius: 4,
          }}
        >
          {upload.error_message}
        </div>
      )}

      <div style={{ color: '#4A4A5A', fontSize: 10, marginTop: 6 }}>
        {new Date(upload.created_at).toLocaleString()}
      </div>
    </div>
  );
}

interface IFCUploadProps {
  uploads?: IFCUploadRecord[];
  loading?: boolean;
}

export default function IFCUpload({ uploads = [], loading = false }: IFCUploadProps): React.ReactElement {
  return (
    <div
      style={{
        backgroundColor: '#0D0D14',
        minHeight: '100vh',
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* CTA banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7B1E3C 0%, #4A0E22 100%)',
          borderRadius: 10,
          padding: '16px',
          marginBottom: 20,
          border: '1px solid #9B2E4C',
        }}
      >
        <div style={{ color: '#F0D0DA', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          Unlock Your 3D Digital Twin
        </div>
        <div style={{ color: '#C08090', fontSize: 12, lineHeight: 1.5 }}>
          Upload your building's IFC file to generate a live spatial model. Map rooms, floors,
          and equipment automatically — enabling predictive maintenance, wayfinding, and
          real-time occupancy overlays across your entire venue.
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            flexWrap: 'wrap' as const,
          }}
        >
          {['Room Mapping', 'Floor Analytics', 'IoT Overlay', 'Wayfinding'].map((tag) => (
            <span
              key={tag}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#F0D0DA',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ color: '#E8E8F0', fontSize: 16, fontWeight: 700 }}>IFC Uploads</div>
        <div style={{ color: '#6A6A7A', fontSize: 12 }}>
          {uploads.length} {uploads.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#4A4A5A', fontSize: 13, padding: '40px 0' }}>
          Loading uploads…
        </div>
      )}

      {!loading && uploads.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: '#4A4A5A',
            fontSize: 13,
            padding: '40px 0',
            border: '1px dashed #2A2A3A',
            borderRadius: 8,
          }}
        >
          No IFC uploads yet.{'\n'}Upload an IFC file to get started.
        </div>
      )}

      {!loading && uploads.map((upload) => (
        <UploadCard key={upload.id} upload={upload} />
      ))}
    </div>
  );
}
