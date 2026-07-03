import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Invoice } from '../../api/invoices';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface ClientInvoiceTrackerProps {
  invoices: Invoice[];
  onToggleStatus: (id: number, currentStatus: string) => Promise<void>;
  onDeleteInvoice: (id: number) => Promise<void>;
}

interface ClientStats {
  clientId: number | string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  invoices: Invoice[];
  totalPaid: number;
  totalUnpaid: number;
  paidCount: number;
  unpaidCount: number;
}

export const ClientInvoiceTracker: React.FC<ClientInvoiceTrackerProps> = ({
  invoices,
  onToggleStatus,
  onDeleteInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Group invoices by client email (since multiple client IDs might map or email is unique identifier)
  const clientGroups = useMemo(() => {
    const groups: Record<string, ClientStats> = {};

    invoices.forEach((inv) => {
      const email = inv.client_email || 'unknown@example.com';
      if (!groups[email]) {
        groups[email] = {
          clientId: inv.client_id || email,
          clientName: inv.client_name || 'Unknown Client',
          clientEmail: email,
          companyName: inv.company_name || 'N/A',
          invoices: [],
          totalPaid: 0,
          totalUnpaid: 0,
          paidCount: 0,
          unpaidCount: 0,
        };
      }

      groups[email].invoices.push(inv);
      if (inv.status === 'paid') {
        groups[email].totalPaid += inv.value;
        groups[email].paidCount += 1;
      } else {
        groups[email].totalUnpaid += inv.value;
        groups[email].unpaidCount += 1;
      }
    });

    return Object.values(groups);
  }, [invoices]);

  // Filter clients based on search and tab selection
  const filteredClients = useMemo(() => {
    return clientGroups.filter((client) => {
      const matchesSearch =
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'unpaid') {
        return client.unpaidCount > 0;
      }
      if (filterTab === 'paid') {
        return client.unpaidCount === 0 && client.paidCount > 0;
      }
      return true;
    });
  }, [clientGroups, searchQuery, filterTab]);

  // Global aggregate stats
  const aggregateStats = useMemo(() => {
    let totalCollected = 0;
    let totalOutstanding = 0;
    let paidUsers = 0;
    let unpaidUsers = 0;

    clientGroups.forEach((client) => {
      totalCollected += client.totalPaid;
      totalOutstanding += client.totalUnpaid;
      if (client.unpaidCount > 0) {
        unpaidUsers += 1;
      } else if (client.paidCount > 0) {
        paidUsers += 1;
      }
    });

    return {
      totalCollected,
      totalOutstanding,
      totalUsers: clientGroups.length,
      paidUsers,
      unpaidUsers,
    };
  }, [clientGroups]);

  const toggleExpand = (email: string) => {
    setExpandedClient(expandedClient === email ? null : email);
  };

  return (
    <div className="space-y-6">
      {/* Micro-Dashboard / Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Collected</span>
            <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
          </div>
          <div className="text-2xl font-black text-slate-800">₹{aggregateStats.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active revenue received
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Outstanding</span>
            <span className="material-symbols-outlined text-amber-600 text-lg">pending_actions</span>
          </div>
          <div className="text-2xl font-black text-slate-800">₹{aggregateStats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] font-medium text-amber-600 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Awaiting client clearing
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">User Payment Split</span>
            <span className="material-symbols-outlined text-indigo-600 text-lg">group</span>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {aggregateStats.paidUsers} <span className="text-slate-400 text-sm font-normal">paid</span> / {aggregateStats.unpaidUsers} <span className="text-slate-400 text-sm font-normal">unpaid</span>
          </div>
          <div className="text-[10px] font-medium text-indigo-600 mt-1 flex items-center gap-1">
            Out of {aggregateStats.totalUsers} total clients
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200/80 p-3 rounded-2xl shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search clients or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-body placeholder:text-slate-400 text-slate-700 bg-slate-50/30"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/65 shrink-0 self-stretch sm:self-auto justify-center">
          {(['all', 'unpaid', 'paid'] as const).map((tab) => {
            const isActive = filterTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer capitalize font-mono ${
                  isActive ? 'bg-white text-slate-900 shadow-xs border border-slate-200/20' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'all' ? 'All Clients' : tab === 'unpaid' ? 'Unpaid' : 'Fully Paid'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 border border-slate-100">
            <span className="material-symbols-outlined text-3xl text-slate-350">group</span>
            <p className="text-sm font-semibold mt-2">No matching clients found.</p>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const isExpanded = expandedClient === client.clientEmail;
            const hasUnpaid = client.unpaidCount > 0;
            const totalInvoiced = client.totalPaid + client.totalUnpaid;
            const paidPercentage = totalInvoiced > 0 ? (client.totalPaid / totalInvoiced) * 100 : 0;
            const initial = client.clientName.charAt(0).toUpperCase();

            return (
              <Card
                key={client.clientEmail}
                className={`border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-sm ${
                  isExpanded ? 'border-indigo-200 bg-indigo-50/5' : 'border-slate-100 bg-white'
                }`}
              >
                {/* Header/Summary Line */}
                <div
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(client.clientEmail)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 font-heading font-black text-sm shrink-0">
                      {initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading text-sm font-bold text-slate-800">{client.clientName}</h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                          {client.companyName}
                        </span>
                      </div>
                      <p className="font-body text-xs text-slate-500">{client.clientEmail}</p>
                    </div>
                  </div>

                  {/* Payment Progress Bar */}
                  <div className="w-full md:w-48 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold font-mono">
                      <span className="text-slate-400">Clearing Status</span>
                      <span className={hasUnpaid ? 'text-amber-600' : 'text-emerald-600'}>
                        {paidPercentage.toFixed(0)}% Paid
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${paidPercentage}%` }}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${100 - paidPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Totals & Dropdown Arrow */}
                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right font-mono">
                      <div className="text-xs font-bold text-slate-800">
                        Paid: <span className="text-emerald-600">₹{client.totalPaid.toLocaleString()}</span>
                      </div>
                      {hasUnpaid && (
                        <div className="text-[11px] font-bold text-amber-600">
                          Due: ₹{client.totalUnpaid.toLocaleString()} ({client.unpaidCount} bills)
                        </div>
                      )}
                    </div>

                    <span
                      className={`material-symbols-outlined text-slate-400 text-lg transition-transform duration-250 ${
                        isExpanded ? 'rotate-180 text-indigo-500' : ''
                      }`}
                    >
                      keyboard_arrow_down
                    </span>
                  </div>
                </div>

                {/* Expanded Invoices List */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="border-t border-slate-100 bg-slate-50/50"
                    >
                      <div className="p-5 space-y-3">
                        <h5 className="font-heading text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                          Statement of Invoices
                        </h5>
                        <div className="space-y-2.5">
                          {client.invoices.map((inv) => {
                            const raisedDate = format(parseISO(inv.raised_date), 'MMM d, yyyy');
                            const dueDate = format(parseISO(inv.due_date), 'MMM d, yyyy');
                            const isPaid = inv.status === 'paid';

                            return (
                              <div
                                key={inv.id}
                                className="bg-white border border-slate-200/60 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs hover:border-slate-300 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-body text-xs font-bold text-slate-800">
                                      {inv.name}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono ${
                                        isPaid
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                                      }`}
                                    >
                                      {inv.status}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-3 flex-wrap">
                                    <span>
                                      <strong>Raised:</strong> {raisedDate}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      <strong>Due:</strong> {dueDate}
                                    </span>
                                    <span>•</span>
                                    <span
                                      className={`font-semibold ${
                                        isPaid ? 'text-slate-400' : inv.days_until_due >= 0 ? 'text-indigo-600' : 'text-rose-600 font-bold'
                                      }`}
                                    >
                                      {isPaid
                                        ? 'Settled'
                                        : inv.days_until_due >= 0
                                        ? `${inv.days_until_due} days remaining`
                                        : `${Math.abs(inv.days_until_due)} days overdue`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                                  <div className="font-mono text-sm font-black text-slate-800">
                                    ₹{inv.value.toFixed(2)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleStatus(inv.id, inv.status);
                                      }}
                                      className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-lg border transition-colors cursor-pointer ${
                                        isPaid
                                          ? 'bg-amber-50/50 hover:bg-amber-50/10 border-amber-100 text-amber-700'
                                          : 'bg-emerald-50 hover:bg-emerald-100/50 border-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteInvoice(inv.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg border border-transparent hover:border-rose-100 hover:bg-rose-50"
                                      title="Delete invoice"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
