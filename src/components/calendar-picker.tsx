'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string, month: string) => void;
  dueCutoffDay?: number; // default: 10
}

export default function CalendarPicker({
  selectedDate,
  onDateChange,
  dueCutoffDay = 10,
}: CalendarPickerProps) {
  // Parsing selected date or default to current date
  const initialDate = useMemo(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Days count in current viewing month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // First day of week offset for 1st of month
  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Select day
  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    const monthStr = `${currentYear}-${formattedMonth}`;
    onDateChange(dateStr, monthStr);
  };

  // Quick preset: Today
  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setCurrentYear(y);
    setCurrentMonth(m);
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    onDateChange(dateStr, monthStr);
  };

  // Quick preset: This Month
  const handleSetThisMonth = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    setCurrentYear(y);
    setCurrentMonth(m);
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    onDateChange(dateStr, monthStr);
  };

  // Quick preset: Last Month
  const handleSetLastMonth = () => {
    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    const y = today.getFullYear();
    const m = today.getMonth();
    setCurrentYear(y);
    setCurrentMonth(m);
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    onDateChange(dateStr, monthStr);
  };

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const selectedDayNumber = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (y === currentYear && m === currentMonth + 1) {
      return d;
    }
    return null;
  }, [selectedDate, currentYear, currentMonth]);

  const isAfterCutoff = selectedDayNumber !== null && selectedDayNumber > dueCutoffDay;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-zinc-800 shadow-xl bg-zinc-900/90 select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <p className="text-[10px] text-zinc-400">
              Selected: <span className="font-semibold text-emerald-400">{selectedDate}</span>
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center space-x-1.5 mb-3">
        <button
          type="button"
          onClick={handleSetToday}
          className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-zinc-800/90 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/50 transition-all cursor-pointer text-center"
        >
          Today
        </button>
        <button
          type="button"
          onClick={handleSetThisMonth}
          className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-zinc-800/90 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/50 transition-all cursor-pointer text-center"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={handleSetLastMonth}
          className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-zinc-800/90 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/50 transition-all cursor-pointer text-center"
        >
          Last Month
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {daysOfWeek.map((day, idx) => (
          <div 
            key={day} 
            className={`text-[10px] font-bold py-1 ${
              idx === 5 || idx === 6 ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Empty padding cells for first day offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const formattedMonth = String(currentMonth + 1).padStart(2, '0');
          const formattedDay = String(day).padStart(2, '0');
          const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

          const isSelected = selectedDayNumber === day;
          const isToday = dateStr === todayStr;
          const isCutoff = day === dueCutoffDay;
          const isPastCutoff = day > dueCutoffDay;

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`h-8 w-full rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50 scale-105 z-10'
                  : isToday
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 hover:bg-zinc-750 font-bold'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <span>{day}</span>
              
              {/* Cutoff / Late fine marker */}
              {isCutoff && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-amber-400 absolute bottom-1" title="Late Fine Cutoff (10th)" />
              )}
              {isToday && !isSelected && !isCutoff && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend / Late Fine notice */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400/80 inline-block" />
          <span>Cutoff: 10th</span>
        </div>
        <div className="flex items-center space-x-1">
          {isAfterCutoff ? (
            <span className="text-amber-400 flex items-center space-x-1 font-semibold">
              <AlertCircle className="w-3 h-3" />
              <span>Late Fine: 50 TK applied</span>
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">Regular Fee Period</span>
          )}
        </div>
      </div>
    </div>
  );
}
