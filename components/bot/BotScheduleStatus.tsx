/**
 * BotScheduleStatus Component
 *
 * Displays bot execution schedule information:
 * - Last execution time
 * - Next scheduled run time
 * - Bot active status
 *
 * Schedule rules (EST/EDT timezone):
 * - SHORT_TERM: Every 30 minutes (9 AM - 4:30 PM, Mon-Fri)
 * - SWING: 3 times daily (9 AM, 1 PM, 5 PM, Mon-Fri)
 * - LONG_TERM: Once daily (9 AM, Mon-Fri)
 */

'use client';

import { useState, useEffect } from 'react';

interface BotScheduleStatusProps {
  lastExecutedAt: string | null;
  timeHorizon: 'SHORT_TERM' | 'SWING' | 'LONG_TERM';
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ERROR';
}

// Schedule configurations
const SCHEDULES = {
  SHORT_TERM: {
    label: 'Short-Term',
    frequency: 'Every 30 minutes',
    description: '9 AM - 4:30 PM, Mon-Fri EST',
    times: Array.from({ length: 16 }, (_, i) => 9 * 60 + i * 30), // 9:00 AM to 4:30 PM, every 30 min
  },
  SWING: {
    label: 'Swing',
    frequency: '3 times daily',
    description: '9 AM, 1 PM, 5 PM, Mon-Fri EST',
    times: [9 * 60, 13 * 60, 17 * 60], // 9:00 AM, 1:00 PM, 5:00 PM in minutes
  },
  LONG_TERM: {
    label: 'Long-Term',
    frequency: 'Once daily',
    description: '9 AM, Mon-Fri EST',
    times: [9 * 60], // 9:00 AM only
  },
};

export default function BotScheduleStatus({
  lastExecutedAt,
  timeHorizon,
  status,
}: BotScheduleStatusProps) {
  const [nextRun, setNextRun] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    calculateNextRun();
  }, [timeHorizon, currentTime]);

  const calculateNextRun = () => {
    const schedule = SCHEDULES[timeHorizon];
    const now = new Date();

    // Convert to EST (UTC-5) or EDT (UTC-4)
    const estOffset = isDST(now) ? -4 : -5;
    const estDate = new Date(now.getTime() + (estOffset * 60 + now.getTimezoneOffset()) * 60000);

    const currentDay = estDate.getDay();
    const currentMinutes = estDate.getHours() * 60 + estDate.getMinutes();

    // Check if today is a weekday (Mon-Fri)
    if (currentDay === 0 || currentDay === 6) {
      // Weekend - find next Monday 9 AM
      const daysUntilMonday = currentDay === 0 ? 1 : 2;
      const nextMonday = new Date(estDate);
      nextMonday.setDate(estDate.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      setNextRun(convertESTtoLocal(nextMonday, estOffset));
      return;
    }

    // Find next run time today
    const nextTimeToday = schedule.times.find(time => time > currentMinutes);

    if (nextTimeToday !== undefined) {
      // Next run is today
      const nextDate = new Date(estDate);
      nextDate.setHours(Math.floor(nextTimeToday / 60), nextTimeToday % 60, 0, 0);
      setNextRun(convertESTtoLocal(nextDate, estOffset));
    } else {
      // Next run is tomorrow (or next Monday if Friday)
      const nextDate = new Date(estDate);
      if (currentDay === 5) {
        // Friday - next run is Monday
        nextDate.setDate(estDate.getDate() + 3);
      } else {
        // Mon-Thu - next run is tomorrow
        nextDate.setDate(estDate.getDate() + 1);
      }
      nextDate.setHours(Math.floor(schedule.times[0] / 60), schedule.times[0] % 60, 0, 0);
      setNextRun(convertESTtoLocal(nextDate, estOffset));
    }
  };

  // Check if Daylight Saving Time is in effect
  const isDST = (date: Date): boolean => {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset()) !== date.getTimezoneOffset();
  };

  // Convert EST time to local timezone
  const convertESTtoLocal = (estDate: Date, estOffset: number): Date => {
    const now = new Date();
    return new Date(estDate.getTime() - (estOffset * 60 + now.getTimezoneOffset()) * 60000);
  };

  const formatDateTime = (date: Date | string | null): string => {
    if (!date) return 'Never';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Past due';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days}d ${hours % 24}h`;
    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    return `in ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'STOPPED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const schedule = SCHEDULES[timeHorizon];
  const timezone = isDST(new Date()) ? 'EDT' : 'EST';

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-purple-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Execution Schedule
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Bot Status */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-xs mb-2">Bot Status</p>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(status)}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              status === 'ACTIVE' ? 'bg-green-600 animate-pulse' :
              status === 'PAUSED' ? 'bg-yellow-600' :
              'bg-red-600'
            }`}></span>
            {status}
          </span>
        </div>

        {/* Schedule Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-xs mb-1">Schedule Type</p>
          <p className="text-lg font-bold text-purple-600">{schedule.label}</p>
          <p className="text-xs text-gray-500 mt-1">{schedule.frequency}</p>
        </div>

        {/* Last Executed */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-xs mb-1">Last Executed</p>
          {lastExecutedAt ? (
            <>
              <p className="text-sm font-bold text-gray-900">
                {formatDateTime(lastExecutedAt)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(lastExecutedAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-400">Not yet run</p>
              <p className="text-xs text-gray-500 mt-1">Waiting for first execution</p>
            </>
          )}
        </div>

        {/* Next Scheduled Run */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-600 text-xs mb-1">Next Run {status === 'ACTIVE' && '(Active)'}</p>
          {nextRun && status === 'ACTIVE' ? (
            <>
              <p className="text-sm font-bold text-blue-600">
                {formatDateTime(nextRun)}
              </p>
              <p className="text-xs text-green-600 font-medium mt-1">
                {formatRelativeTime(nextRun)}
              </p>
            </>
          ) : nextRun && status !== 'ACTIVE' ? (
            <>
              <p className="text-sm font-bold text-gray-400">
                {formatDateTime(nextRun)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Bot is {status.toLowerCase()})
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-400">Not scheduled</p>
              <p className="text-xs text-gray-500 mt-1">Activate bot to schedule</p>
            </>
          )}
        </div>
      </div>

      {/* Schedule Details */}
      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-600 mb-2">Trading Hours ({timezone})</p>
        <p className="text-sm text-gray-900">{schedule.description}</p>
        {status !== 'ACTIVE' && (
          <p className="text-xs text-yellow-600 mt-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Bot must be ACTIVE for scheduled executions
          </p>
        )}
      </div>
    </div>
  );
}
