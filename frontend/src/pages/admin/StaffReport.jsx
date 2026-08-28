import React, { useEffect, useState, useCallback } from 'react';
import { staffAPI } from '../../services/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { shareCsvFile } from '../../services/nativeBridge';

const today = new Date();
const DEFAULT_FROM = format(startOfMonth(today), 'yyyy-MM-dd');
const DEFAULT_TO   = format(endOfMonth(today),   'yyyy-MM-dd');

export default function StaffReport() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom]     = useState(DEFAULT_FROM);
  const [to, setTo]         = useState(DEFAULT_TO);
  const [editId, setEditId] = useState(null);
  const [commissionEdit, setCommissionEdit] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    staffAPI.report({ from, to })
      .then(setRows)
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue    = rows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
  const totalCommission = rows.reduce((s, r) => s + parseFloat(r.commission || 0), 0);
  const totalBookings   = rows.reduce((s, r) => s + parseInt(r.completed_bookings || 0), 0);

  const openEdit = (row) => {
    setEditId(row.id);
    setCommissionEdit({ commission_type: row.commission_type || 'none', commission_value: row.commission_value || 0 });
  };
  const saveCommission = async (staffId) => {
    setSaving(true);
    try {
      await staffAPI.update(staffId, commissionEdit);
      toast.success('Commission rate saved');
      setEditId(null);
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const exportCSV = async () => {
    const header = 'Name,Role,Completed Bookings,Revenue (£),Commission Type,Commission Rate,Commission Owed (£)';
    const lines = rows.map(r =>
      `"${r.name}","${r.role||''}",${r.completed_bookings},${parseFloat(r.revenue).toFixed(2)},${r.commission_type},${r.commission_value},${parseFloat(r.commission).toFixed(2)}`
    );
    try {
      await shareCsvFile({
        filename: `staff-report-${from}-${to}.csv`,
        contents: [header, ...lines].join('\n'),
        title: 'BookAm staff report',
      });
      toast.success('Your export is ready to share or save');
    } catch (err) {
      toast.error(err.message || 'Could not export the staff report');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Staff Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">Revenue and commission by team member</p>
        </div>
        <button onClick={exportCSV} disabled={rows.length === 0} className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50">
          <DownloadIcon /> Export CSV
        </button>
      </div>

      {/* Date range filter */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs">From</label>
          <input className="input text-sm" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input className="input text-sm" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[
            { label: 'This month', from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') },
            { label: 'Last 30d',   from: format(new Date(today - 30*86400000), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') },
            { label: 'This year',  from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` },
          ].map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${from === p.from && to === p.to ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-400'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Revenue', value: `£${totalRevenue.toFixed(2)}`, sub: `${totalBookings} completed bookings`, color: 'text-primary-700' },
          { label: 'Commission owed', value: `£${totalCommission.toFixed(2)}`, sub: 'across all staff', color: 'text-amber-600' },
          { label: 'Active staff', value: rows.length, sub: 'with completed bookings tracked', color: 'text-gray-900' },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-staff table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold text-gray-700">No staff data</p>
          <p className="text-sm text-gray-400 mt-1">Add staff members and assign them to bookings to see this report.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Staff member', 'Bookings', 'Revenue', 'Commission rate', 'Commission owed', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map(row => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
                        {row.role && <p className="text-xs text-gray-400">{row.role}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{row.completed_bookings}</p>
                        {parseInt(row.cancelled_bookings) > 0 && (
                          <p className="text-xs text-gray-400">{row.cancelled_bookings} cancelled</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-primary-700 dark:text-primary-400">
                        £{parseFloat(row.revenue).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {editId === row.id ? (
                          <div className="flex items-center gap-2">
                            <select className="input text-xs py-1" value={commissionEdit.commission_type}
                              onChange={e => setCommissionEdit(p => ({ ...p, commission_type: e.target.value }))}>
                              <option value="none">None</option>
                              <option value="percent">% of revenue</option>
                              <option value="flat">Flat per booking</option>
                            </select>
                            {commissionEdit.commission_type !== 'none' && (
                              <input className="input text-xs py-1 w-20" type="number" min="0" step="0.01"
                                value={commissionEdit.commission_value}
                                onChange={e => setCommissionEdit(p => ({ ...p, commission_value: e.target.value }))} />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">
                            {row.commission_type === 'percent' && `${row.commission_value}%`}
                            {row.commission_type === 'flat' && `£${parseFloat(row.commission_value).toFixed(2)}/booking`}
                            {row.commission_type === 'none' && <span className="text-gray-400">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parseFloat(row.commission) > 0
                          ? <span className="font-bold text-amber-600">£{parseFloat(row.commission).toFixed(2)}</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editId === row.id ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                            <button onClick={() => saveCommission(row.id)} disabled={saving} className="btn-primary text-xs py-1 px-3">
                              {saving ? '…' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => openEdit(row)} className="text-xs text-primary-600 hover:underline font-semibold">
                            Set rate
                          </button>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300" colSpan={2}>Total</td>
                  <td className="px-4 py-3 font-bold text-primary-700 dark:text-primary-400">£{totalRevenue.toFixed(2)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-bold text-amber-600">
                    {totalCommission > 0 ? `£${totalCommission.toFixed(2)}` : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
