import React, { useEffect } from 'react';

/**
 * Printable exam entry ticket (1/3 A4 = 210mm × 99mm).
 * data: { studentName, studentNumber, examTitle, examDate, examLocation, roomNumber, seatNumber }
 */
export default function StudentTicket({ data, onClose }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'ticket-print-style';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #ticket-printable, #ticket-printable * { visibility: visible !important; }
        #ticket-printable {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 210mm !important;
          height: 99mm !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: 1px solid #000 !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById('ticket-print-style')?.remove();
  }, []);

  const dateStr = data.examDate
    ? new Date(data.examDate).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : '';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 100,
      }}>

      {/* Ticket */}
      <div
        id="ticket-printable"
        style={{
          width: '210mm', height: '99mm',
          background: '#fff',
          border: '1.5px solid #1e293b',
          borderRadius: 8,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          overflow: 'hidden',
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}>

        {/* Left accent stripe */}
        <div style={{ width: 10, background: '#00bcd4', flexShrink: 0 }} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '5mm 8mm 5mm 8mm' }}>

          {/* Logo — centered at top */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3mm' }}>
            <img
              src="/logo.png"
              alt="Hədəf Kursları Balakən"
              style={{ height: '26mm', objectFit: 'contain' }}
            />
          </div>

          {/* Student name + number */}
          <div style={{ marginBottom: '3mm' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {data.studentName}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
              <span style={{ fontWeight: 700 }}>Student number:</span> {data.studentNumber}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: '3mm' }} />

          {/* Exam details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm 6mm', flex: 1 }}>
            <Field label="Exam" value={data.examTitle} />
            <Field label="Date & Time" value={dateStr} />
            <Field label="Location" value={data.examLocation} />
            <div style={{ display: 'flex', gap: '6mm' }}>
              {data.roomNumber && <Field label="Room" value={data.roomNumber} />}
              {data.seatNumber && <Field label="Seat" value={data.seatNumber} />}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2mm', marginTop: '2mm' }}>
            {/* Center: org name */}
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#00bcd4', marginBottom: '1.5mm', letterSpacing: '0.03em' }}>
              Hədəf Kursları Balakən
            </div>
            {/* Contact row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8mm', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', lineHeight: 1.6 }}>
                <div>☎ 010-524-23-46</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <InstagramIcon size={11} />
                  <span>hedef_kurslari_balaken</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons (hidden when printing) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '0.6rem 1.75rem', background: '#00bcd4', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}>
          🖨 Print
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '0.6rem 1.25rem', background: '#f1f5f9',
            border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#475569',
          }}>
          Close
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 1 }}>
        {value || '—'}
      </div>
    </div>
  );
}

function InstagramIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
