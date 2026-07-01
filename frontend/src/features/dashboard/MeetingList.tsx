import React, { useState } from 'react';
import { Meeting } from '../../types/meeting';
import MeetingCard from './MeetingCard';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';

interface MeetingListProps {
  meetings: Meeting[];
  onCancel: (id: number) => void;
  onReschedule: (meeting: Meeting) => void;
  onAcceptReschedule: (id: number) => void;
}

export const MeetingList: React.FC<MeetingListProps> = ({ meetings, onCancel, onReschedule, onAcceptReschedule }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || m.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-100 p-4 rounded-2xl">
        <div className="w-full sm:max-w-xs">
          <Input
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="font-body text-xs font-semibold text-slate-500 uppercase">Status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-body text-sm text-slate-600 focus:border-indigo-600 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Confirmed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List Container */}
      {filteredMeetings.length === 0 ? (
        <EmptyState
          title="No meetings found"
          description={searchTerm || filterStatus !== 'all' ? "Try adjusting your filters or search terms." : "You have no upcoming or past sessions scheduled."}
          icon="event_busy"
        />
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onCancel={onCancel}
              onReschedule={onReschedule}
              onAcceptReschedule={onAcceptReschedule}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default MeetingList;
