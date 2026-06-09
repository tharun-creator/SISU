import React from 'react';

export default function Appointments() {
  const appointments = [
    {
      id: 1,
      type: 'Dental Consultation',
      provider: 'Dr. Smith',
      time: '10:00 AM',
      date: 'Tomorrow',
      icon: 'dentistry',
      color: 'bg-secondary-container',
      iconColor: 'text-on-secondary-container',
      tagColor: 'text-primary'
    },
    {
      id: 2,
      type: 'Personal Training',
      provider: 'Core Focus Studio',
      time: '04:30 PM',
      date: 'Nov 15',
      icon: 'fitness_center',
      color: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed-variant',
      tagColor: 'text-on-surface-variant'
    }
  ];

  const history = [
    { id: 1, name: 'Optician Exam', date: 'Oct 28, 2024', status: 'check_circle' },
    { id: 2, name: 'Dermatology Follow-up', date: 'Oct 22, 2024', status: 'check_circle' },
    { id: 3, name: 'Deep Tissue Massage', date: 'Oct 15, 2024', status: 'cancel', cancelled: true },
  ];

  return (
    <aside className="w-[320px] bg-surface-container-lowest border-l border-outline-variant p-6 flex flex-col space-y-8 h-screen overflow-y-auto sticky top-0">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Your Appointments</h3>
          <span className="font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">2 Upcoming</span>
        </div>
        
        <div className="space-y-4">
          {appointments.map(appt => (
            <div key={appt.id} className="bg-surface border border-outline-variant rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:border-primary-fixed-dim transition-colors group cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${appt.color} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${appt.iconColor}`}>{appt.icon}</span>
                </div>
                <span className={`font-label-sm text-label-sm ${appt.tagColor} font-bold`}>{appt.date}</span>
              </div>
              <h4 className="font-label-md text-label-md font-bold mb-1 text-on-surface">{appt.type}</h4>
              <p className="text-body-sm text-on-surface-variant mb-4">{appt.provider}</p>
              <div className="flex items-center text-body-sm text-on-surface-variant mb-4">
                <span className="material-symbols-outlined text-[18px] mr-2">event</span>
                {appt.time}
              </div>
              <button className="w-full py-2 border border-outline-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors active:scale-95">
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-outline-variant">
        <h3 className="font-label-md text-label-md font-bold text-on-surface mb-4">History</h3>
        <div className="space-y-3">
          {history.map(item => (
            <div key={item.id} className="flex items-center p-3 hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center mr-3 group-hover:bg-surface-container-highest transition-colors">
                <span className={`material-symbols-outlined text-[18px] ${item.cancelled ? 'text-on-surface-variant' : 'text-primary'}`}>{item.status}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-label-md text-label-md truncate ${item.cancelled ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{item.name}</p>
                <p className="text-[12px] text-on-surface-variant">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <div className="p-4 bg-primary-container/10 border border-primary/20 rounded-xl">
          <div className="flex items-center mb-2">
            <span className="material-symbols-outlined text-primary mr-2">tips_and_updates</span>
            <span className="font-label-md text-label-md font-bold text-primary">Pro Tip</span>
          </div>
          <p className="text-body-sm text-on-secondary-container">Sync with Google Calendar to never miss an appointment again.</p>
        </div>
      </div>
    </aside>
  );
}
