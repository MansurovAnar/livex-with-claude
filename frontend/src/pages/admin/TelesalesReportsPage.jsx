import React, { useEffect, useState } from 'react';
import { getTelesalesReport } from '../../api/telesalesLeads.api';
import { useLanguage } from '../../i18n/LanguageContext';

// Report days follow Baku time (same as the API)
const TZ = 'Asia/Baku';
const bakuToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const presetRange = (preset) => {
  const today = bakuToday();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'month') {
    const first = `${today.slice(0, 8)}01`;
    return { from: first, to: addDays(addDays(first, 32).slice(0, 8) + '01', -1) };
  }
  // This week, Monday–Sunday
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekday);
  return { from: monday, to: addDays(monday, 6) };
};

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
];

/**
 * Admin › Telesales › Reporting. Calls per agent, answer breakdown, leads added, invalid-number
 * marks and callbacks for a date range, optionally for one agent. Admin only.
 */
export default function TelesalesReportsPage() {
  const { t, tError } = useLanguage();
  const [preset, setPreset] = useState('week');
  const [range, setRange] = useState(() => presetRange('week'));
  const [agentId, setAgentId] = useState('');
  const [group, setGroup] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (r = range, agent = agentId, g = group) => {
    if (!r.from || !r.to) return;
    setLoading(true);
    const params = { from: r.from, to: r.to };
    if (agent) params.agent_id = agent;
    if (g) params.group = g;
    getTelesalesReport(params)
      .then(res => { setData(res.data.data); setError(''); })
      .catch(err => setError(tError(err, 'Failed to load report')))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const choosePreset = (key) => {
    setPreset(key);
    if (key === 'custom') return;
    const r = presetRange(key);
    setRange(r);
    load(r);
  };
  const changeDate = (field, value) => {
    const r = { ...range, [field]: value };
    setRange(r);
    if (r.from && r.to && r.from <= r.to) load(r);
  };
  const changeAgent = (value) => { setAgentId(value); load(range, value); };
  const changeGroup = (value) => { setGroup(value); load(range, agentId, value); };

  const agentName = (row) => row.agent_name
    ? <>{row.agent_name}{row.role && row.role !== 'telesales' && <span style={roleBadge}>{t(row.role)}</span>}</>
    : <span style={{ color: '#94a3b8' }}>{t('Deleted user')}</span>;

  const s = data?.summary;
  const answers = data?.answers || [];
  const perAgent = data?.per_agent || [];

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('Telesales reporting')}</h2>

      <div className="report-toolbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.75rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <div>
          <span style={labelStyle}>{t('Period')}</span>
          <div className="report-presets" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => choosePreset(p.key)} style={tabBtn(preset === p.key)}>{t(p.label)}</button>
            ))}
          </div>
        </div>
        {preset === 'custom' ? (
          <>
            <label>
              <span style={labelStyle}>{t('From')}</span>
              <input type="date" value={range.from} max={range.to || undefined} onChange={e => changeDate('from', e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>{t('To')}</span>
              <input type="date" value={range.to} min={range.from || undefined} onChange={e => changeDate('to', e.target.value)} style={inputStyle} />
            </label>
          </>
        ) : (
          <div style={{ fontSize: '0.875rem', color: '#475569', paddingBottom: '0.5rem' }}>{fmtDate(range.from)} – {fmtDate(range.to)}</div>
        )}
        <label>
          <span style={labelStyle}>{t('Agent')}</span>
          <select value={agentId} onChange={e => changeAgent(e.target.value)} style={inputStyle}>
            <option value="">{t('All agents')}</option>
            {(data?.agents || []).map(a => (
              <option key={a.id} value={a.id}>{a.full_name}{a.role !== 'telesales' ? ` (${t(a.role)})` : ''}{!a.is_active ? ` — ${t('inactive')}` : ''}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>{t('Calls by')}</span>
          <select value={group} onChange={e => changeGroup(e.target.value)} style={inputStyle}>
            <option value="">{t('Whole period')}</option>
            <option value="day">{t('Day')}</option>
            <option value="week">{t('Week')}</option>
          </select>
        </label>
      </div>

      {error && <div className="wrap-text" style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>{error}</div>}

      {loading && !data ? <p style={{ color: '#94a3b8' }}>{t('Loading...')}</p> : data && (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Stat label={t('Calls')} value={s.calls} sub={t('{n} leads reached', { n: s.leads_called })} />
            <Stat label={t('Leads added')} value={s.leads_added} />
            <Stat label={t('Marked invalid')} value={s.marked_invalid} sub={t('{n} restored · {m} invalid now', { n: s.restored, m: s.invalid_now })} />
            <Stat label={t('Callbacks')} value={s.callbacks_scheduled} sub={t('{n} completed · {m} still open', { n: s.callbacks_completed, m: s.callbacks_still_open })} />
            <Stat label={t('Overdue')} value={s.callbacks_overdue} color={s.callbacks_overdue ? '#b91c1c' : undefined} sub={t('open callbacks, now')} />
            <Stat label={t('Due today')} value={s.callbacks_due_today} color={s.callbacks_due_today ? '#c2410c' : undefined} sub={t('open callbacks, now')} />
            <Stat label={t('Upcoming')} value={s.callbacks_upcoming} sub={t('open callbacks, now')} />
            <Stat label={t('Answers used')} value={answers.length} />
          </div>

          <Section title={t('Calls per agent')}>
            <div className="table-scroll" style={tableBox}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headRow}>
                    <th style={th}>{t('Agent')}</th>
                    <th style={thNum}>{t('Calls')}</th>
                    <th style={thNum}>{t('Leads called')}</th>
                    <th style={thNum} className="hide-mobile">{t('Days active')}</th>
                    <th style={thNum}>{t('Avg / day')}</th>
                  </tr>
                </thead>
                <tbody>
                  {perAgent.length === 0 && <EmptyRow cols={5} text={t('No agents yet.')} />}
                  {perAgent.map(r => (
                    <tr key={r.agent_id || 'deleted'} style={bodyRow}>
                      <td style={td} className="wrap-text">{agentName(r)}</td>
                      <td style={tdNum}><b>{r.calls}</b></td>
                      <td style={tdNum}>{r.leads_called}</td>
                      <td style={tdNum} className="hide-mobile">{r.days_active}</td>
                      <td style={tdNum}>{r.avg_per_day}</td>
                    </tr>
                  ))}
                  {perAgent.length > 1 && (
                    <tr style={totalRow}>
                      <td style={td}>{t('Total')}</td>
                      <td style={tdNum}>{s.calls}</td>
                      <td style={tdNum}>{s.leads_called}</td>
                      <td style={tdNum} className="hide-mobile">{s.days_active}</td>
                      <td style={tdNum}>{s.days_active ? Math.round((s.calls / s.days_active) * 10) / 10 : 0}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t('Answer breakdown')}>
            {answers.length === 0 ? <p style={emptyText}>{t('No calls in this period.')}</p> : (
              <>
                <div className="table-scroll" style={{ ...tableBox, marginBottom: '1rem' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={headRow}>
                        <th style={th}>{t('Answer')}</th>
                        <th style={thNum}>{t('Calls')}</th>
                        <th style={thNum}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answers.map(a => (
                        <tr key={a.id} style={bodyRow}>
                          <td style={td} className="wrap-text">{t(a.label)}</td>
                          <td style={tdNum}>{a.count}</td>
                          <td style={tdNum}>
                            <span className="report-bar" style={{ display: 'inline-block', width: 60, height: 6, background: '#f1f5f9', borderRadius: 3, marginRight: 8, verticalAlign: 'middle' }}>
                              <span style={{ display: 'block', width: `${a.pct}%`, height: '100%', background: '#c2410c', borderRadius: 3 }} />
                            </span>
                            {a.pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!agentId && <AnswerMatrix title={t('Answers per agent')} rows={perAgent.filter(r => r.calls > 0)} answers={answers} first={r => agentName(r)} firstLabel={t('Agent')} t={t} />}
              </>
            )}
          </Section>

          {group && (
            <Section title={group === 'day' ? t('Calls per day') : t('Calls per week')}>
              {data.periods.length === 0 ? <p style={emptyText}>{t('No calls in this period.')}</p> : (
                <AnswerMatrix rows={data.periods} answers={answers} t={t}
                  firstLabel={group === 'day' ? t('Day') : t('Week of')}
                  first={p => <>{fmtDate(p.period_start)}{!agentId && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{agentName(p)}</div>}</>} />
              )}
            </Section>
          )}

          <Section title={t('Leads and invalid numbers')} note={t('Marks and restores made before reporting was added are not counted. Leads in "Phone numbers are invalid" right now: {n}.', { n: s.invalid_now })}>
            <div className="table-scroll" style={tableBox}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headRow}>
                    <th style={th}>{t('Agent')}</th>
                    <th style={thNum}>{t('Leads added')}</th>
                    <th style={thNum}>{t('Marked invalid')}</th>
                    <th style={thNum}>{t('Restored')}</th>
                  </tr>
                </thead>
                <tbody>
                  {perAgent.length === 0 && <EmptyRow cols={4} text={t('No agents yet.')} />}
                  {perAgent.map(r => (
                    <tr key={r.agent_id || 'deleted'} style={bodyRow}>
                      <td style={td} className="wrap-text">{agentName(r)}</td>
                      <td style={tdNum}>{r.leads_added}</td>
                      <td style={tdNum}>{r.marked_invalid}</td>
                      <td style={tdNum}>{r.restored}</td>
                    </tr>
                  ))}
                  {perAgent.length > 1 && (
                    <tr style={totalRow}>
                      <td style={td}>{t('Total')}</td>
                      <td style={tdNum}>{s.leads_added}</td>
                      <td style={tdNum}>{s.marked_invalid}</td>
                      <td style={tdNum}>{s.restored}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t('Callbacks')} note={t('Overdue / Due today / Upcoming are the open callbacks right now. Scheduled / Completed / Still open count callbacks scheduled in the chosen period.')}>
            <div className="table-scroll" style={tableBox}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headRow}>
                    <th style={th}>{t('Scheduled by')}</th>
                    <th style={thNum}>{t('Overdue')}</th>
                    <th style={thNum}>{t('Due today')}</th>
                    <th style={thNum}>{t('Upcoming')}</th>
                    <th style={{ ...thNum, borderLeft: '1px solid #e2e8f0' }}>{t('Scheduled')}</th>
                    <th style={thNum}>{t('Completed')}</th>
                    <th style={thNum}>{t('Still open')}</th>
                  </tr>
                </thead>
                <tbody>
                  {perAgent.length === 0 && <EmptyRow cols={7} text={t('No agents yet.')} />}
                  {perAgent.map(r => (
                    <tr key={r.agent_id || 'deleted'} style={bodyRow}>
                      <td style={td} className="wrap-text">{agentName(r)}</td>
                      <td style={{ ...tdNum, color: r.callbacks_overdue ? '#b91c1c' : undefined, fontWeight: r.callbacks_overdue ? 700 : undefined }}>{r.callbacks_overdue}</td>
                      <td style={{ ...tdNum, color: r.callbacks_due_today ? '#c2410c' : undefined }}>{r.callbacks_due_today}</td>
                      <td style={tdNum}>{r.callbacks_upcoming}</td>
                      <td style={{ ...tdNum, borderLeft: '1px solid #f1f5f9' }}>{r.callbacks_scheduled}</td>
                      <td style={tdNum}>{r.callbacks_completed}</td>
                      <td style={tdNum}>{r.callbacks_still_open}</td>
                    </tr>
                  ))}
                  {perAgent.length > 1 && (
                    <tr style={totalRow}>
                      <td style={td}>{t('Total')}</td>
                      <td style={tdNum}>{s.callbacks_overdue}</td>
                      <td style={tdNum}>{s.callbacks_due_today}</td>
                      <td style={tdNum}>{s.callbacks_upcoming}</td>
                      <td style={{ ...tdNum, borderLeft: '1px solid #f1f5f9' }}>{s.callbacks_scheduled}</td>
                      <td style={tdNum}>{s.callbacks_completed}</td>
                      <td style={tdNum}>{s.callbacks_still_open}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// Rows × answer options, with a total column; used for agents and for day/week periods
function AnswerMatrix({ title, rows, answers, first, firstLabel, t }) {
  if (!rows.length) return null;
  return (
    <>
      {title && <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#334155' }}>{title}</h4>}
      <div className="table-scroll" style={tableBox}>
        <table style={tableStyle}>
          <thead>
            <tr style={headRow}>
              <th style={th}>{firstLabel}</th>
              <th style={thNum}>{t('Calls')}</th>
              {answers.map(a => <th key={a.id} style={{ ...thNum, textTransform: 'none' }}>{t(a.label)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.period_start || ''}|${r.agent_id || i}`} style={bodyRow}>
                <td style={td} className="wrap-text">{first(r)}</td>
                <td style={tdNum}><b>{r.calls}</b></td>
                {answers.map(a => <td key={a.id} style={{ ...tdNum, color: r.answers[a.id] ? '#1e293b' : '#cbd5e1' }}>{r.answers[a.id] || 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem 1rem', minWidth: 0 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: color || '#1e293b', lineHeight: 1.3 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{sub}</div>}
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section style={{ marginBottom: '1.75rem' }}>
      <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem', color: '#1e293b' }}>{title}</h3>
      {note && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.5rem' }}>{note}</p>}
      {children}
    </section>
  );
}

function EmptyRow({ cols, text }) {
  return <tr><td colSpan={cols} style={{ ...td, color: '#94a3b8', textAlign: 'center', padding: '1.5rem' }}>{text}</td></tr>;
}

const fmtDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' }) : '');

const labelStyle = { display: 'block', fontWeight: 500, fontSize: '0.8rem', marginBottom: '0.3rem', color: '#374151' };
const inputStyle = { padding: '0.45rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', background: '#fff' };
const tableBox = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const headRow = { borderBottom: '2px solid #e2e8f0', background: '#f8fafc' };
const bodyRow = { borderBottom: '1px solid #f1f5f9' };
const totalRow = { borderTop: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 };
const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
const thNum = { ...th, textAlign: 'right' };
const td = { padding: '0.6rem 1rem', fontSize: '0.875rem', color: '#1e293b', verticalAlign: 'top' };
const tdNum = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const emptyText = { color: '#94a3b8', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.5rem', textAlign: 'center', margin: 0 };
const roleBadge = { marginLeft: '0.4rem', background: '#e2e8f0', color: '#334155', padding: '0.05rem 0.45rem', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 };
const tabBtn = (active) => ({
  padding: '0.45rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
  border: `1px solid ${active ? '#c2410c' : '#cbd5e1'}`, background: active ? '#c2410c' : '#fff', color: active ? '#fff' : '#334155',
});
