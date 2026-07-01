import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export interface BookingFormState {
  agenda: string;
  date: { year: number; month: number; day: number } | null;
  slot: { label: string; start: string; end: string } | null;
  communicationType: string;
  phone: string;
  priority: string;
  description: string;
}

interface ChatBookingFormProps {
  formState: BookingFormState;
  onChange: (updates: Partial<BookingFormState>) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ChatBookingForm: React.FC<ChatBookingFormProps> = ({ formState, onChange, onSubmit, isSubmitting }) => {
  const showConfirmBtn = formState.agenda && formState.date && formState.slot;

  return (
    <Card className="p-5 border border-slate-200 bg-white space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="material-symbols-outlined text-indigo-600">sync</span>
        <h3 className="font-heading text-sm font-bold text-slate-800">Booking Draft Summary</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">1. Agenda Topic</span>
          <span className="text-slate-800 font-bold">
            {formState.agenda ? `"${formState.agenda}"` : <span className="text-slate-400 italic font-normal">Awaiting input...</span>}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">2. Date & Time</span>
          <span className="text-slate-800 font-bold">
            {formState.date && formState.slot ? (
              <span className="text-indigo-600">
                {new Date(formState.date.year, formState.date.month, formState.date.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formState.slot.label}
              </span>
            ) : <span className="text-slate-400 italic font-normal">Select slot on calendar...</span>}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">3. Meet Type</span>
          <select
            value={formState.communicationType}
            onChange={(e) => onChange({ communicationType: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 focus:outline-none"
          >
            <option value="video">📹 Online Google Meet</option>
            <option value="in_person">🏢 In-Person Office Meet</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">4. Phone Number</span>
          <input
            type="tel"
            placeholder="Enter phone..."
            value={formState.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white p-1 text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">5. Priority</span>
          <select
            value={formState.priority}
            onChange={(e) => onChange({ priority: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 focus:outline-none"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {showConfirmBtn && (
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{isSubmitting ? 'Booking...' : 'Confirm & Book Slot'}</span>
        </Button>
      )}
    </Card>
  );
};
export default ChatBookingForm;
