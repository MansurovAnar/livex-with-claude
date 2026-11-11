import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

// Number of exam papers per (detail,) class, sector and language for one exam (Monitor page).
export default function ExamPapersTable({ breakdown }) {
  const { t } = useLanguage();
  const { rows, has_extra_details: showDetail } = breakdown;
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const dash = <span style={{ color: '#cbd5e1' }}>—</span>;
  const cols = showDetail ? 5 : 4;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3>{t('Exam papers')}</h3>
      <div className="table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {showDetail && <th style={th}>{t('Detail')}</th>}
              <th style={th}>{t('Class')}</th>
              <th style={th}>{t('Sector')}</th>
              <th style={th}>{t('Language')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('Number of exam papers')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={cols} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>{t('No registered students yet.')}</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                {showDetail && <td className="wrap-text" style={td}>{r.extra_detail || dash}</td>}
                <td style={td}>{r.class_level ?? dash}</td>
                <td style={td}>{r.sector ? t(r.sector) : dash}</td>
                <td style={td}>{r.language ? t(r.language) : dash}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <td colSpan={cols - 1} style={{ ...td, fontWeight: 700 }}>{t('Total')}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{total}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

const th = { padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const td = { padding: '0.55rem 1rem', fontSize: '0.875rem', color: '#1e293b' };
