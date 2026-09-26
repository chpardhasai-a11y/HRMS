'use client';

export function SkeletonBox({ width = '100%', height = '16px', borderRadius = '6px', className = '' }) {
  return (
    <span
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        display: 'inline-block'
      }}
    />
  );
}

export function SkeletonMetrics({ count = 4 }) {
  return (
    <div className="company-stat-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, gap: 10, marginBottom: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="company-stat" key={i} style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff' }}>
          <SkeletonBox width="60%" height="12px" />
          <SkeletonBox width="40%" height="24px" style={{ marginTop: 6 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <div className="employee-table-wrap" style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBox key={i} width={i === 0 ? '160px' : '100px'} height="14px" />
        ))}
      </div>
      <div style={{ display: 'grid' }}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 16px',
              borderBottom: rowIndex === rows - 1 ? 'none' : '1px solid #f1f5f9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '180px' }}>
              <SkeletonBox width="34px" height="34px" borderRadius="50%" />
              <div style={{ display: 'grid', gap: 4, width: '120px' }}>
                <SkeletonBox width="100%" height="13px" />
                <SkeletonBox width="70%" height="11px" />
              </div>
            </div>
            {Array.from({ length: columns - 1 }).map((_, colIndex) => (
              <div key={colIndex} style={{ flex: 1 }}>
                <SkeletonBox width={colIndex % 2 === 0 ? '80%' : '60%'} height="13px" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardList({ count = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: 18, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <SkeletonBox width="40px" height="40px" borderRadius="50%" />
              <div style={{ display: 'grid', gap: 6 }}>
                <SkeletonBox width="160px" height="15px" />
                <SkeletonBox width="220px" height="12px" />
              </div>
            </div>
            <SkeletonBox width="80px" height="24px" borderRadius="999px" />
          </div>
          <SkeletonBox width="100%" height="42px" borderRadius="6px" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBox width="180px" height="12px" />
            <SkeletonBox width="100px" height="32px" borderRadius="6px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: 20, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <SkeletonBox width="64px" height="64px" borderRadius="50%" />
          <div style={{ display: 'grid', gap: 8 }}>
            <SkeletonBox width="200px" height="20px" />
            <SkeletonBox width="140px" height="14px" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gap: 4 }}>
              <SkeletonBox width="70px" height="11px" />
              <SkeletonBox width="110px" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
