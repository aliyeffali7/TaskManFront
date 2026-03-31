import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { getCalendarTasks } from '../api/tasks';
import { STATUS_CONFIG } from '../utils/statusConfig';
import type { Task, TaskStatus } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_CHIP: Record<TaskStatus, string> = {
  todo:        'border-l-2 border-zinc-400 bg-zinc-100 text-zinc-600',
  blocked:     'border-l-2 border-red-400 bg-red-50 text-red-600',
  in_progress: 'border-l-2 border-blue-500 bg-blue-50 text-blue-700',
  in_review:   'border-l-2 border-amber-500 bg-amber-50 text-amber-700',
  done:        'border-l-2 border-green-500 bg-green-50 text-green-700',
};

function buildCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;

  const cells: Date[] = [];
  for (let i = startOffset; i > 0; i--) cells.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d));
  let next = 1;
  while (cells.length < 42) cells.push(new Date(year, month + 1, next++));
  return cells;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['calendar-tasks', year, month],
    queryFn: () => getCalendarTasks(year, month),
  });

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.due_date) (acc[t.due_date] ??= []).push(t);
    return acc;
  }, {});

  const cells = buildCells(year, month);

  const prev = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  // Tasks sorted by date for the right panel
  const sortedDays = Object.entries(tasksByDate).sort(([a], [b]) => a.localeCompare(b));
  const panelTasks = selectedDate
    ? (tasksByDate[selectedDate] ?? [])
    : tasks.filter((t) => t.due_date).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

  return (
    <div className="p-6 flex gap-5 h-full">
      {/* Left: Calendar */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-zinc-800 w-36 text-center">
              {format(new Date(year, month), 'MMMM yyyy')}
            </span>
            <button onClick={next} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={goToday} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors">
            Today
          </button>
        </div>

        {/* Grid */}
        <div className={`bg-white rounded-xl border border-zinc-300 shadow-sm overflow-hidden transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-7 border-b border-zinc-300 bg-zinc-50">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((date, idx) => {
              const key = format(date, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[key] ?? [];
              const isCurrentMonth = date.getMonth() === month;
              const isTodayCell = isToday(date);
              const isSelected = selectedDate === key;
              const visible = dayTasks.slice(0, 2);
              const overflow = dayTasks.length - 2;
              const isLastCol = idx % 7 === 6;
              const isLastRow = idx >= 35;

              return (
                <div
                  key={idx}
                  onClick={() => isCurrentMonth && setSelectedDate(isSelected ? null : key)}
                  className={`min-h-[90px] p-1.5 ${!isLastCol ? 'border-r' : ''} ${!isLastRow ? 'border-b' : ''} border-zinc-200 transition-colors ${
                    !isCurrentMonth ? 'opacity-25 bg-zinc-50/50' : isSelected ? 'bg-blue-50/60 cursor-pointer' : dayTasks.length > 0 ? 'cursor-pointer hover:bg-zinc-50' : ''
                  }`}
                >
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isTodayCell ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {visible.map((task) => (
                      <div
                        key={task.id}
                        className={`block truncate text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_CHIP[task.status]}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <p className="text-[10px] text-zinc-400 px-1.5">+{overflow} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-1 flex-wrap">
          {(Object.entries(STATUS_CHIP) as [TaskStatus, string][]).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-6 h-2.5 rounded-sm ${cls}`} />
              <span className="text-[11px] text-zinc-400">{STATUS_CONFIG[status].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Task panel */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700">
            {selectedDate
              ? format(new Date(selectedDate + 'T00:00:00'), 'MMMM d')
              : 'This month'}
          </h3>
          {selectedDate && (
            <button onClick={() => setSelectedDate(null)} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              Show all
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-300 shadow-sm flex-1 overflow-y-auto">
          {panelTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CalendarDays size={28} className="text-zinc-300 mb-2" />
              <p className="text-xs text-zinc-400">No tasks due {selectedDate ? 'on this day' : 'this month'}</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {panelTasks.map((task) => {
                const config = STATUS_CONFIG[task.status];
                return (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        {task.due_date && !selectedDate && (
                          <span className="text-[10px] text-zinc-400">
                            {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
                          </span>
                        )}
                      </div>
                      {task.assigned_to && (
                        <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{task.assigned_to.full_name}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
