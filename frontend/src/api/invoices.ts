import client from './client';

export interface Invoice {
  id: number;
  client_id: number;
  client_name: string;
  client_email: string;
  name: string;
  company_name: string;
  value: number;
  due_date: string;
  raised_date: string;
  status: string;
  days_since_raised: number;
  days_until_due: number;
  created_at: string;
  updated_at: string;
}

export const invoicesApi = {
  getInvoices: () => client.get<any, Invoice[]>('/invoices'),
  createInvoice: (data: { recipient_email: string; name: string; value: number; due_date: string }) =>
    client.post<any, Invoice>('/invoices', data),
  updateInvoiceStatus: (id: number, status: string) =>
    client.put<any, Invoice>(`/invoices/${id}`, { status }),
  deleteInvoice: (id: number) => client.delete(`/invoices/${id}`),
  triggerReminders: () => client.post<any, { success: boolean; emails_sent: number; logs: string[] }>('/invoices/trigger-reminders'),
};

export default invoicesApi;
