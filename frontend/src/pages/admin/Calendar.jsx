import React, { useEffect, useState } from 'react';
import { bookingsAPI } from '../../services/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const STATUS_DOT = { pending: 'bg-yellow-400', confirmed: 'bg-green-500', cancelled: 'bg-red-400', completed: 'bg-blue-500' };

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    bookingsAPI.list({ limit: 200 }).then(d => setBookings(d.bookings || [])).finally(() => setLoading(false));
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getBookingsForDay = (day) =>
    bookings.filter(b => b.booking_date === format(day, 'yyyy-MM-dd'));

  const selectDay = (day) => {
    setSelected(day);
    setDayBookings(getBookingsForDay(day));
  };

  const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-gray-500 text-sm mt-0.5">View your bookings by date</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeftIcon />
            </button>
            <h2 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRightIcon />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayBks = getBookingsForDay(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = selected && isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => selectDay(day)}
                  className={`relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-sm transition-all ${
                    isSelected ? 'bg-primary-600 text-white' :
                    isToday(day) ? 'bg-primary-50 text-primary-700 font-bold' :
                    isCurrentMonth ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300'
                  }`}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                  {dayBks.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayBks.slice(0, 3).map((b, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : STATUS_DOT[b.status]}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            {Object.entries(STATUS_DOT).map(([s, cls]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cls}`} />
                <span className="text-xs text-gray-500 capitalize">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-5">
          {selected ? (
            <>
              <h3 className="font-semibold mb-4">{format(selected, 'EEEE, MMMM d')}</h3>
              {dayBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">✓</p>
                  <p className="text-sm">No bookings this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayBookings.sort((a,b) => a.start_time.localeCompare(b.start_time)).map(b => (
                    <div key={b.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-500">{b.start_time?.slice(0,5)}</span>
                        <span className={`badge-${b.status}`}>{b.status}</span>
                      </div>
                      <p className="font-medium text-sm">{b.customer_name}</p>
                      <p className="text-xs text-gray-500">{b.service_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">Select a day to see bookings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronLeftIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronRightIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>; }
