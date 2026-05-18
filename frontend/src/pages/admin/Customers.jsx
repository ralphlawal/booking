import React, { useEffect, useState } from 'react';
import { customersAPI } from '../../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { customersAPI.list().then(setCustomers).finally(() => setLoading(false)); }, []);

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{customers.length} total customers</p>
        </div>
        <input
          className="input sm:w-64"
          placeholder="Search name, phone, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p className="font-medium">{search ? 'No matching customers' : 'No customers yet'}</p>
            <p className="text-sm mt-1">Customers are added automatically when they book</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr className="text-left">
                  {['Customer','Contact','Bookings','No-Shows','First Seen'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-400">
                          {c.full_name[0].toUpperCase()}
                        </div>
                        <span className="font-medium dark:text-white">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 dark:text-gray-300">
                      <p>{c.phone || '—'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.email || ''}</p>
                    </td>
                    <td className="px-4 py-3"><span className="font-semibold text-gray-900 dark:text-white">{c.total_bookings}</span></td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${c.no_shows > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{c.no_shows}</span>
                      {c.no_shows >= 2 && <span className="ml-2 text-xs text-red-500 dark:text-red-400 font-medium">⚠ Flagged</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">{c.created_at?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
