import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, X, Trash2, Loader2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getShiftClass, getShiftLabel, getInitials, durationHours, formatHM } from '../utils/siteColor';

interface ShiftRow {
  id: string;
  employee_id: string;
  site_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  position: string | null;
  notes: string | null;
}

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours?: number | null;
}

interface TimeEntryRow {
  employee_id: string;
  total_hours: number | null;
}

type LocalShiftEdit = Partial<Pick<ShiftRow, 'start_time' | 'end_time' | 'notes'>>;

interface SiteRow {
  site_id: string;
  name: string;
}

export interface WeekPlannerGridProps {
  weekDays: Date[];
  shifts: ShiftRow[];
  employees: EmployeeRow[];
  loading: boolean;
  siteId: string;
  onRefresh: () => void;
  employeeSites?: Record<string, string[]>;
  sites?: SiteRow[];
  timeEntries?: TimeEntryRow[];
  empSearch?: string;
  compactView?: boolean;
}

const SHOWN_KEY = 'bp_planner_shown_ids';
const ORDER_KEY = 'bp_planner_emp_order';

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const timeHM = (t: string) => t.slice(0, 5);

const WeekPlannerGrid = ({
  weekDays,
  shifts,
  employees,
  loading,
  siteId,
  onRefresh,
  employeeSites = {},
  sites = [],
  timeEntries = [],
  empSearch = '',
  compactView = false,
}: WeekPlannerGridProps) => {

  const currentSiteName = useMemo(
    () => sites.find(s => s.site_id === siteId)?.name,
    [sites, siteId],
  );
  const shiftClass = getShiftClass(currentSiteName);
  const shiftLabelText = getShiftLabel(currentSiteName);

  const [shownIds, setShownIds] = useState<string[] | null>(() =>
    loadJson<string[] | null>(SHOWN_KEY, null),
  );
  const [addEmpOpen, setAddEmpOpen] = useState(false);

  const [empOrder, setEmpOrder] = useState<string[]>(() => loadJson<string[]>(ORDER_KEY, []));
  const dragEmpRef = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const [popupShift, setPopupShift] = useState<ShiftRow | null>(null);
  const [popupStart, setPopupStart] = useState('');
  const [popupEnd, setPopupEnd] = useState('');
  const [popupNote, setPopupNote] = useState('');
  const [popupSaving, setPopupSaving] = useState(false);

  const [localShiftEdits, setLocalShiftEdits] = useState<Record<string, LocalShiftEdit>>({});
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    setLocalShiftEdits(prev => {
      let changed = false;
      const next = { ...prev };
      shifts.forEach(shift => {
        const local = next[shift.id];
        if (!local) return;
        const startMatches = !local.start_time || local.start_time === shift.start_time;
        const endMatches = !local.end_time || local.end_time === shift.end_time;
        const notesMatches = !('notes' in local) || local.notes === shift.notes;
        if (startMatches && endMatches && notesMatches) { delete next[shift.id]; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [shifts]);

  const createShift = useCallback(async (empId: string, dateStr: string, dayShifts: ShiftRow[]) => {
    if (!siteId) return;
    const key = empId + dateStr;
    if (creating === key) return;
    setCreating(key);
    const lastEnd = dayShifts.reduce((max, s) => {
      const [h, m] = s.end_time.split(':').map(Number);
      const mins = h * 60 + m;
      return mins > max ? mins : max;
    }, 10 * 60);
    const startMins = Math.min(lastEnd, 22 * 60);
    const endMins = Math.min(startMins + 180, 23 * 60 + 59);
    const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
    const { error } = await supabase.from('shifts').insert({
      employee_id: empId,
      site_id: siteId,
      shift_date: dateStr,
      start_time: toTime(startMins),
      end_time: toTime(endMins),
      break_minutes: 0,
      position: null,
      notes: null,
    });
    if (error) toast.error('Erreur création shift');
    else onRefresh();
    setCreating(null);
  }, [siteId, creating, onRefresh]);

  const visibleEmployees = useMemo(() => {
    let base = shownIds ? employees.filter(e => shownIds.includes(e.id)) : employees;
    const q = empSearch.trim().toLowerCase();
    if (q) {
      base = base.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q),
      );
    }
    if (empOrder.length === 0) return base;
    const ordered = [...base].sort((a, b) => {
      const ia = empOrder.indexOf(a.id);
      const ib = empOrder.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return ordered;
  }, [employees, shownIds, empOrder, empSearch]);

  const notShownEmployees = useMemo(
    () => (shownIds ? employees.filter(e => !shownIds.includes(e.id)) : []),
    [employees, shownIds],
  );

  const addEmployee = (empId: string) => {
    const base = shownIds ?? employees.map(e => e.id);
    const next = [...base, empId];
    setShownIds(next);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(next));
    setAddEmpOpen(false);
  };

  const removeEmployee = (empId: string) => {
    const base = shownIds ?? employees.map(e => e.id);
    const next = base.filter(id => id !== empId);
    setShownIds(next);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(next));
  };

  const statsFor = useCallback((empId: string) => {
    const empShifts = shifts.filter(s => s.employee_id === empId);
    const planned = empShifts.reduce((sum, s) => sum + durationHours(s.start_time, s.end_time, s.break_minutes || 0), 0);
    const clocked = timeEntries
      .filter(t => t.employee_id === empId)
      .reduce((sum, t) => sum + (Number(t.total_hours) || 0), 0);
    const emp = employees.find(e => e.id === empId);
    const contractual = emp?.weekly_hours || 35;
    const diff = planned - contractual;
    return { contractual, planned, clocked, diff };
  }, [shifts, employees, timeEntries]);

  const openPopup = (shift: ShiftRow) => {
    const local = localShiftEdits[shift.id];
    setPopupShift(shift);
    setPopupStart(timeHM(local?.start_time ?? shift.start_time));
    setPopupEnd(timeHM(local?.end_time ?? shift.end_time));
    setPopupNote((local?.notes ?? shift.notes) ?? '');
  };

  const savePopup = async () => {
    if (!popupShift) return;
    setPopupSaving(true);
    const { error } = await supabase
      .from('shifts')
      .update({ start_time: popupStart + ':00', end_time: popupEnd + ':00', notes: popupNote.trim() || null })
      .eq('id', popupShift.id);
    if (error) {
      toast.error('Erreur sauvegarde shift');
    } else {
      setLocalShiftEdits(prev => ({
        ...prev,
        [popupShift.id]: { start_time: popupStart + ':00', end_time: popupEnd + ':00', notes: popupNote.trim() || null },
      }));
      setPopupShift(null);
    }
    setPopupSaving(false);
  };

  const deleteShiftById = async (id: string) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) toast.error('Erreur suppression');
    else { toast.success('Shift supprimé'); setPopupShift(null); onRefresh(); }
  };

  const dragShiftRef = useRef<ShiftRow | null>(null);

  const moveShiftToDay = async (shift: ShiftRow, newDateStr: string) => {
    if (shift.shift_date === newDateStr) return;
    const { error } = await supabase.from('shifts').update({ shift_date: newDateStr }).eq('id', shift.id);
    if (error) toast.error('Erreur déplacement shift');
    else onRefresh();
  };

  if (loading) {
    return (
      <div className="combo-card p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[hsl(var(--muted-foreground))]" />
      </div>
    );
  }

  const colTemplate = '220px repeat(7, minmax(140px, 1fr))';

  return (
    <>
      <div className="combo-card overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 220 + 7 * 140 }}>

            <div
              className="grid border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40"
              style={{ gridTemplateColumns: colTemplate }}
            >
              <div className="p-3 flex items-center border-r border-[hsl(var(--border))]">
                <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Équipe</span>
              </div>
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, new Date());
                return (
                  <div
                    key={i}
                    className={cn('border-l border-[hsl(var(--border))] py-2 text-center', isToday && 'combo-day-today')}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      {format(d, 'EEE', { locale: fr })}
                    </p>
                    <p className={cn('text-sm font-bold', isToday ? 'text-[hsl(var(--combo-green))]' : 'text-[hsl(var(--foreground))]')}>
                      {format(d, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {visibleEmployees.length === 0 ? (
              <div className="py-14 text-center text-[hsl(var(--muted-foreground))]">
                <p className="mb-3 text-sm">Aucun employé dans la vue.</p>
                <button
                  onClick={() => setAddEmpOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm hover:underline"
                  style={{ color: 'hsl(var(--combo-green))' }}
                >
                  <Plus className="w-4 h-4" /> Ajouter un employé
                </button>
              </div>
            ) : (
              visibleEmployees.map(emp => {
                const stats = statsFor(emp.id);
                const isDraggedOver = dragOver === emp.id && dragEmpRef.current !== emp.id;
                return (
                  <div
                    key={emp.id}
                    draggable
                    onDragStart={() => { dragEmpRef.current = emp.id; }}
                    onDragOver={e => { e.preventDefault(); setDragOver(emp.id); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => {
                      const from = dragEmpRef.current;
                      dragEmpRef.current = null;
                      setDragOver(null);
                      if (!from || from === emp.id) return;
                      const ids = visibleEmployees.map(e => e.id);
                      const fromIdx = ids.indexOf(from);
                      const toIdx = ids.indexOf(emp.id);
                      if (fromIdx === -1 || toIdx === -1) return;
                      const next = [...ids];
                      next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, from);
                      setEmpOrder(next);
                      localStorage.setItem(ORDER_KEY, JSON.stringify(next));
                    }}
                    onDragEnd={() => { dragEmpRef.current = null; setDragOver(null); }}
                    className={cn(
                      'grid border-b border-[hsl(var(--border))] group/emprow hover:bg-[hsl(var(--muted))]/10 transition-colors',
                      isDraggedOver && 'border-t-2 border-t-[hsl(var(--combo-green))]',
                    )}
                    style={{ gridTemplateColumns: colTemplate }}
                  >
                    <div className="p-2.5 flex flex-col justify-center gap-1 border-r border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(var(--muted-foreground))]/40 cursor-grab active:cursor-grabbing opacity-0 group-hover/emprow:opacity-100 transition-opacity" />
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: 'hsl(var(--combo-green-light))', color: 'hsl(var(--combo-green))' }}
                        >
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <p
                          className="text-[12px] font-bold truncate flex-1 select-none underline decoration-transparent hover:decoration-inherit cursor-default"
                          style={{ color: 'hsl(var(--combo-ink))' }}
                        >
                          {emp.first_name} {emp.last_name}
                        </p>
                        <button
                          onClick={() => removeEmployee(emp.id)}
                          className="opacity-0 group-hover/emprow:opacity-100 p-0.5 rounded hover:bg-[hsl(var(--muted))] transition-all"
                          title="Retirer de la vue"
                        >
                          <X className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap pl-9 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                        <span>{formatHM(stats.contractual)}</span>
                        <span>|</span>
                        <span>{formatHM(stats.planned)}</span>
                        <span>|</span>
                        <span>{formatHM(stats.clocked)}</span>
                        <span>|</span>
                        <span className={stats.diff < 0 ? 'text-red-600' : stats.diff > 0 ? 'text-emerald-600' : ''}>
                          {stats.diff >= 0 ? '+' : ''}{formatHM(stats.diff)}
                        </span>
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded-full text-[9px]"
                          style={{ backgroundColor: 'hsl(var(--muted))' }}
                        >
                          RC 0h
                        </span>
                      </div>
                    </div>

                    {weekDays.map((day, di) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = shifts.filter(s => s.employee_id === emp.id && s.shift_date === dateStr);

                      return (
                        <div
                          key={di}
                          className="border-l border-[hsl(var(--border))] relative group/cell p-1 flex flex-col gap-1"
                          style={{ minHeight: compactView ? 40 : 72 }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => {
                            const s = dragShiftRef.current;
                            dragShiftRef.current = null;
                            if (s) moveShiftToDay(s, dateStr);
                          }}
                        >
                          {dayShifts.map(shift => {
                            const local = localShiftEdits[shift.id];
                            const displayStart = timeHM(local?.start_time ?? shift.start_time);
                            const displayEnd = timeHM(local?.end_time ?? shift.end_time);

                            return (
                              <div
                                key={shift.id}
                                draggable
                                onDragStart={() => { dragShiftRef.current = shift; }}
                                onClick={() => openPopup(shift)}
                                className={cn(
                                  'rounded-md px-2 py-1 cursor-pointer shadow-sm hover:shadow-md transition-shadow select-none',
                                  shiftClass,
                                )}
                              >
                                <p className="combo-shift-label text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded mb-0.5 truncate">
                                  {shiftLabelText}
                                </p>
                                <p className="text-[10px] font-semibold leading-tight">
                                  {displayStart} - {displayEnd}
                                </p>
                              </div>
                            );
                          })}

                          <button
                            onClick={() => createShift(emp.id, dateStr, dayShifts)}
                            disabled={creating === emp.id + dateStr}
                            className="mt-auto flex items-center justify-center gap-1 py-1 rounded-md opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-[hsl(var(--muted))] disabled:opacity-30"
                            title="Ajouter un shift"
                          >
                            {creating === emp.id + dateStr
                              ? <Loader2 className="w-3 h-3 animate-spin text-[hsl(var(--muted-foreground))]" />
                              : <Plus className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            <div
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[hsl(var(--muted))]/30 transition-colors border-t border-dashed border-[hsl(var(--border))]"
              onClick={() => setAddEmpOpen(true)}
            >
              <div className="w-5 h-5 rounded-full border-dashed border-2 border-[hsl(var(--muted-foreground))]/40 flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
              </div>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Ajouter un employé à la vue</span>
            </div>

          </div>
        </div>
      </div>

      {popupShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setPopupShift(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-[hsl(var(--border))] p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className={cn('h-1.5 rounded-full mb-4', shiftClass)} />
            <div className="mb-4">
              <h3 className="font-semibold text-sm">Modifier le shift</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                {employees.find(e => e.id === popupShift.employee_id)?.first_name}{' '}
                {employees.find(e => e.id === popupShift.employee_id)?.last_name}
              </p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Début</label>
                  <input type="time" value={popupStart} onChange={e => setPopupStart(e.target.value)}
                    className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--combo-green))]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Fin</label>
                  <input type="time" value={popupEnd} onChange={e => setPopupEnd(e.target.value)}
                    className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--combo-green))]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] mb-1 block">Note</label>
                <textarea value={popupNote} onChange={e => setPopupNote(e.target.value)}
                  placeholder="Note courte…" rows={2}
                  className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--combo-green))]" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => deleteShiftById(popupShift.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-black hover:bg-red-50 text-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
              <div className="flex-1" />
              <button onClick={() => setPopupShift(null)}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-[hsl(var(--muted))] transition-colors">
                Annuler
              </button>
              <button onClick={savePopup} disabled={popupSaving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-black border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--muted))] flex items-center gap-1.5 disabled:opacity-60">
                {popupSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {addEmpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setAddEmpOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-[hsl(var(--border))] p-4 w-72 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3">Ajouter un employé à la vue</h3>
            <div className="overflow-y-auto flex-1 space-y-1 -mx-1 px-1">
              {(shownIds === null ? employees : notShownEmployees).length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">
                  Tous les employés sont déjà dans la vue.
                </p>
              ) : (
                (shownIds === null ? employees : notShownEmployees).map(emp => (
                  <button key={emp.id} onClick={() => addEmployee(emp.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-left">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: 'hsl(var(--combo-green-light))', color: 'hsl(var(--combo-green))' }}>
                      {getInitials(emp.first_name, emp.last_name)}
                    </div>
                    <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setAddEmpOpen(false)}
              className="mt-3 w-full py-2 rounded-lg border text-sm hover:bg-[hsl(var(--muted))] transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WeekPlannerGrid;
