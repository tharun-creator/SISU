import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import AppLayout from '../components/layout/AppLayout';
import invoicesApi, { Invoice } from '../api/invoices';
import { useAuth } from '../lib/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { ClientInvoiceTracker } from '../features/invoices/ClientInvoiceTracker';
import { api } from '../constants/api';

export const InvoicesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'list' | 'tracker'>('list');

  const [users, setUsers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Invoice Form State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceValue, setInvoiceValue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoicesApi.getInvoices();
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    if (isAdmin) {
      api.adminGetUsers()
        .then((data: any) => setUsers(data || []))
        .catch((e: any) => console.error("Failed to load users for autocomplete", e));
    }
  }, [isAdmin]);

  const filteredUsers = React.useMemo(() => {
    if (!recipientEmail) return [];
    const query = recipientEmail.toLowerCase();
    return users.filter((u) => 
      u.email.toLowerCase().includes(query) || 
      (u.name && u.name.toLowerCase().includes(query))
    );
  }, [users, recipientEmail]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !invoiceName || !invoiceValue || !dueDate) {
      toast.show('Please fill in all fields', 'error');
      return;
    }

    setCreating(true);
    try {
      const parsedValue = parseFloat(invoiceValue);
      if (isNaN(parsedValue) || parsedValue <= 0) {
        toast.show('Please enter a valid positive value', 'error');
        setCreating(false);
        return;
      }

      await invoicesApi.createInvoice({
        recipient_email: recipientEmail,
        name: invoiceName,
        value: parsedValue,
        due_date: new Date(dueDate).toISOString(),
      });

      toast.show('Invoice raised successfully!', 'success');
      // Reset form
      setRecipientEmail('');
      setInvoiceName('');
      setInvoiceValue('');
      setDueDate('');
      fetchInvoices();
    } catch (err: any) {
      toast.show(err.message || 'Failed to raise invoice.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await invoicesApi.updateInvoiceStatus(id, nextStatus);
      toast.show(`Invoice marked as ${nextStatus}!`, 'success');
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: nextStatus } : inv));
    } catch (err: any) {
      toast.show(err.message || 'Failed to update invoice status.', 'error');
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoicesApi.deleteInvoice(id);
      toast.show('Invoice deleted successfully', 'success');
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    } catch (err: any) {
      toast.show(err.message || 'Failed to delete invoice.', 'error');
    }
  };

  const handleTriggerReminders = async () => {
    setTriggeringReminders(true);
    try {
      const res = await invoicesApi.triggerReminders();
      toast.show(`Successfully executed reminder pipeline. Sent ${res.emails_sent} notifications!`, 'success');
    } catch (err: any) {
      toast.show(err.message || 'Failed to trigger reminders.', 'error');
    } finally {
      setTriggeringReminders(false);
    }
  };

  return (
    <AppLayout title="Invoicing Statement">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Header Block */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-800">
              {isAdmin ? 'Billing & Invoices Management' : 'Invoices & Outstanding Statements'}
            </h1>
            <p className="font-body text-xs text-slate-400 mt-1">
              {isAdmin ? 'Issue invoices, toggle statuses, and execute scheduled automated reminders.' : 'Track your session invoices, payment dates, and due statuses.'}
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={handleTriggerReminders}
              disabled={triggeringReminders}
              className="flex items-center gap-1.5 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700"
            >
              <span className="material-symbols-outlined text-base">notifications_active</span>
              <span>{triggeringReminders ? 'Triggering...' : 'Trigger Reminders Cron'}</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-4">
            {isAdmin && (
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 w-fit mb-4">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  All Invoices
                </button>
                <button
                  onClick={() => setViewMode('tracker')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                    viewMode === 'tracker' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Client Tracker
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-body text-rose-600">
                {error}
              </div>
            ) : viewMode === 'tracker' && isAdmin ? (
              <ClientInvoiceTracker
                invoices={invoices}
                onToggleStatus={handleToggleStatus}
                onDeleteInvoice={handleDeleteInvoice}
              />
            ) : invoices.length === 0 ? (
              <Card className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl text-slate-350">receipt_long</span>
                <p className="text-sm font-semibold mt-2">No invoices issued yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv) => {
                  const raisedDateLabel = format(parseISO(inv.raised_date), 'MMMM d, yyyy');
                  const dueDateLabel = format(parseISO(inv.due_date), 'MMMM d, yyyy');
                  const isPaid = inv.status === 'paid';

                  return (
                    <Card key={inv.id} className="p-6 border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-base font-bold text-slate-800">{inv.name}</h3>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                        {isAdmin && (
                          <div className="text-xs text-slate-500">
                            <strong>Client:</strong> {inv.client_name} ({inv.client_email}) | <strong>Company:</strong> {inv.company_name}
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500 pt-1">
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Value</span>
                            <span className="font-bold text-slate-800 text-sm">₹{inv.value.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Raised Date</span>
                            <span>{raisedDateLabel}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Due Date</span>
                            <span>{dueDateLabel}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Day Tracking</span>
                            <span className="font-mono font-bold text-indigo-600">
                              {isPaid ? `Cleared` : inv.days_until_due >= 0 ? `${inv.days_until_due} days left` : `${Math.abs(inv.days_until_due)} days overdue`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Admin controls */}
                      {isAdmin && (
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`border ${isPaid ? 'border-amber-100 text-amber-700' : 'border-emerald-100 text-emerald-700'}`}
                            onClick={() => handleToggleStatus(inv.id, inv.status)}
                          >
                            {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteInvoice(inv.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form / Sidebar Column */}
          <div className="space-y-6">
            {isAdmin ? (
              <Card className="p-6 border border-slate-100 bg-white shadow-sm space-y-4">
                <h2 className="font-heading text-lg font-bold text-slate-800">Raise New Invoice</h2>
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Recipient User Email *"
                      type="email"
                      placeholder="client@company.com"
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
                        // Delay hiding suggestions so click event on option registers
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      required
                      autoComplete="off"
                    />
                    {showSuggestions && filteredUsers.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-[calc(100%-12px)] bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                        {filteredUsers.map((u) => (
                          <div
                            key={u.id || u.email}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevents input onBlur from firing before click registers
                              setRecipientEmail(u.email);
                              setShowSuggestions(false);
                            }}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex flex-col items-start gap-0.5 text-left transition-colors"
                          >
                            <span className="text-xs font-bold text-slate-800 font-heading">
                              {u.name || 'No Name'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {u.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    label="Invoice Title / Description *"
                    type="text"
                    placeholder="e.g. Q3 Sales Mentorship Retainer"
                    value={invoiceName}
                    onChange={(e) => setInvoiceName(e.target.value)}
                    required
                  />
                  <Input
                    label="Value (₹ INR) *"
                    type="number"
                    step="0.01"
                    placeholder="1500.00"
                    value={invoiceValue}
                    onChange={(e) => setInvoiceValue(e.target.value)}
                    required
                  />
                  <Input
                    label="Due Date *"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={creating}
                  >
                    {creating ? 'Raising...' : 'Raise Invoice'}
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-6 border border-slate-100 bg-white shadow-sm space-y-3">
                <h3 className="font-heading text-base font-bold text-slate-800">Billing Support</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  For queries regarding payment methods, ACH transfers, wire transfers or corporate expense receipts, please reach out to our billing operations team at:
                </p>
                <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-indigo-600">mail</span>
                  <span>billing@sisu.io</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default InvoicesPage;
