import datetime
import os
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.services.email_service import EmailService
from app.config import settings
from app.core.logging import logger

class InvoiceService:
    @staticmethod
    def get_invoice_out(invoice: Invoice) -> InvoiceOut:
        today = datetime.datetime.utcnow().date()
        raised_date_date = invoice.raised_date.date()
        days_since_raised = (today - raised_date_date).days
        due_date_date = invoice.due_date.date()
        days_until_due = (due_date_date - today).days

        return InvoiceOut(
            id=invoice.id,
            client_id=invoice.client_id,
            client_name=invoice.client.name if invoice.client else "Unknown",
            client_email=invoice.client.email if invoice.client else "",
            name=invoice.name,
            company_name=invoice.company_name,
            value=invoice.value,
            due_date=invoice.due_date,
            raised_date=invoice.raised_date,
            status=invoice.status,
            days_since_raised=days_since_raised,
            days_until_due=days_until_due,
            created_at=invoice.created_at,
            updated_at=invoice.updated_at
        )

    @classmethod
    def get_user_invoices(cls, db: Session, user_id: int) -> List[InvoiceOut]:
        invoices = db.query(Invoice).filter(Invoice.client_id == user_id).order_by(Invoice.raised_date.desc()).all()
        return [cls.get_invoice_out(inv) for inv in invoices]

    @classmethod
    def get_all_invoices(cls, db: Session) -> List[InvoiceOut]:
        invoices = db.query(Invoice).order_by(Invoice.raised_date.desc()).all()
        return [cls.get_invoice_out(inv) for inv in invoices]

    @classmethod
    def create_invoice(cls, db: Session, data: InvoiceCreate) -> InvoiceOut:
        # Find client by email
        client = db.query(User).filter(User.email.like(data.recipient_email.strip())).first()
        if not client:
            raise ValueError(f"No user found with email {data.recipient_email}")

        invoice = Invoice(
            client_id=client.id,
            name=data.name,
            company_name=client.company or "Independent",
            value=data.value,
            due_date=data.due_date,
            status="unpaid"
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        # Trigger Day 0 Notification
        cls.send_raised_notification(invoice)

        return cls.get_invoice_out(invoice)

    @classmethod
    def update_invoice(cls, db: Session, invoice_id: int, data: InvoiceUpdate) -> Optional[InvoiceOut]:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return None
        
        for field, val in data.model_dump(exclude_unset=True).items():
            setattr(invoice, field, val)
        
        db.commit()
        db.refresh(invoice)
        return cls.get_invoice_out(invoice)

    @classmethod
    def delete_invoice(cls, db: Session, invoice_id: int) -> bool:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return False
        db.delete(invoice)
        db.commit()
        return True

    @staticmethod
    def generate_polite_reminder(invoice_name: str, value: float, due_date: str) -> str:
        api_key = settings.GEMINI_API_KEY
        fallback_msg = (
            f"Dear Client,\n\nThis is a friendly reminder that invoice '{invoice_name}' for ${value:.2f} "
            f"is due on {due_date}. We appreciate your prompt attention to this invoice.\n\nBest regards,\nSISU Ops"
        )
        if not api_key or api_key.startswith("your-gemini-api-key"):
            return fallback_msg
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            model = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=api_key,
                temperature=0.7
            )
            prompt = (
                f"Write a polite, professional, and friendly email payment reminder. "
                f"Invoice description: {invoice_name}, Amount: ${value:.2f}, Due Date: {due_date}. "
                f"Keep it brief and clear (1-2 short paragraphs). Only output the email body text."
            )
            response = model.invoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Error calling LLM for payment reminder: {e}")
            return fallback_msg

    @classmethod
    def send_raised_notification(cls, invoice: Invoice):
        if not invoice.client:
            return
        subject = f"New Invoice Raised: {invoice.name} - SISU"
        due_str = invoice.due_date.strftime("%B %d, %Y")
        html = f"""
        <div style="font-family: sans-serif; color: #374151; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #111827;">Invoice Raised</h2>
          <p>A new invoice has been raised for your account on SISU.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p><strong>Invoice Name:</strong> {invoice.name}</p>
          <p><strong>Value:</strong> ${invoice.value:.2f}</p>
          <p><strong>Due Date:</strong> {due_str}</p>
          <p style="margin-top: 20px;">Please clear the balance before the due date. Thank you for your partnership.</p>
        </div>
        """
        try:
            EmailService.send_email(to=invoice.client.email, subject=subject, html=html)
            logger.info(f"Day 0 Raised Email sent to {invoice.client.email} for invoice {invoice.id}")
        except Exception as e:
            logger.error(f"Error sending Raised Email: {e}")

    @classmethod
    def run_invoice_reminders(cls, db: Session) -> dict:
        today = datetime.datetime.utcnow().date()
        unpaid_invoices = db.query(Invoice).filter(Invoice.status == "unpaid").all()
        
        # Group by client
        client_groups = {}
        for inv in unpaid_invoices:
            if inv.client_id not in client_groups:
                client_groups[inv.client_id] = []
            client_groups[inv.client_id].append(inv)
            
        logs = []
        emails_sent = 0

        for client_id, invoices in client_groups.items():
            client = invoices[0].client
            if not client:
                continue

            # Prioritize older (earliest raised_date) and smaller invoices first
            invoices.sort(key=lambda x: (x.raised_date, x.value))

            # Determine day-count tracking for each invoice
            triggers = []
            for inv in invoices:
                raised_date_date = inv.raised_date.date()
                days_since_raised = (today - raised_date_date).days
                due_date_date = inv.due_date.date()
                days_until_due = (due_date_date - today).days

                # Check if this invoice triggers a notification today
                triggered = False
                trigger_type = ""
                
                if days_since_raised == 15:
                    triggered = True
                    trigger_type = "Day 15"
                elif days_since_raised == 21:
                    triggered = True
                    trigger_type = "Day 21 (AI)"
                elif days_since_raised == 26:
                    triggered = True
                    trigger_type = "Day 26 (Firm)"
                elif days_until_due < 0:
                    overdue_days = abs(days_until_due)
                    if overdue_days <= 7:
                        # Weekly in the first week
                        if overdue_days == 7:
                            triggered = True
                            trigger_type = "Overdue Weekly"
                    else:
                        # Twice per week after first week (every 3 days)
                        if overdue_days % 3 == 0:
                            triggered = True
                            trigger_type = "Overdue Bi-weekly"

                if triggered:
                    triggers.append((inv, trigger_type, days_since_raised, days_until_due))

            if not triggers:
                continue

            # If the user has more than 1 unpaid invoice, consolidate reminders (Clubbed Invoices)
            if len(invoices) > 1:
                emails_sent += 1
                logs.append(f"Consolidated reminder sent to {client.email} for {len(invoices)} open invoices.")
                cls.send_consolidated_reminder(client, invoices, triggers)
            else:
                # Single invoice reminder
                inv, trigger_type, days_since, days_until = triggers[0]
                emails_sent += 1
                logs.append(f"Single reminder ({trigger_type}) sent to {client.email} for invoice {inv.name}.")
                cls.send_single_reminder(client, inv, trigger_type, days_since, days_until)

        return {"success": True, "emails_sent": emails_sent, "logs": logs}

    @classmethod
    def send_single_reminder(cls, client: User, inv: Invoice, trigger_type: str, days_since: int, days_until: int):
        subject = f"Payment Reminder: {inv.name} - SISU"
        raised_str = inv.raised_date.strftime("%B %d, %Y")
        due_str = inv.due_date.strftime("%B %d, %Y")

        if trigger_type == "Day 15":
            body_html = f"<p>Hope you've been working on it — it's been 15 days since {raised_str}.</p>"
        elif trigger_type == "Day 21 (AI)":
            ai_msg = cls.generate_polite_reminder(inv.name, inv.value, due_str)
            body_html = f"<div style='white-space: pre-wrap; background: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;'>{ai_msg}</div>"
        elif trigger_type == "Day 26 (Firm)":
            body_html = (
                f"<p><strong>Urgent Notice:</strong> This is a firm reminder that your payment for invoice "
                f"'{inv.name}' is due in a few days on {due_str}. Please clear this balance immediately.</p>"
            )
        else: # Overdue reminders
            body_html = (
                f"<p><strong>Overdue Notice:</strong> Your invoice '{inv.name}' was due on {due_str} "
                f"({abs(days_until)} days overdue). Please settle the outstanding amount of ${inv.value:.2f} "
                f"as soon as possible to avoid service disruption.</p>"
            )

        html = f"""
        <div style="font-family: sans-serif; color: #374151; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h3 style="color: #111827;">Invoice Reminder</h3>
          {body_html}
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p><strong>Invoice Name:</strong> {inv.name}</p>
          <p><strong>Amount Due:</strong> ${inv.value:.2f}</p>
          <p><strong>Due Date:</strong> {due_str}</p>
        </div>
        """
        try:
            EmailService.send_email(to=client.email, subject=subject, html=html)
        except Exception as e:
            logger.error(f"Error sending single invoice reminder: {e}")

    @classmethod
    def send_consolidated_reminder(cls, client: User, all_invoices: List[Invoice], triggered_triggers: list):
        subject = "Consolidated Payment Reminder - SISU"
        total_due = sum(inv.value for inv in all_invoices)
        
        # Sort so older & smaller invoices are listed first
        all_invoices.sort(key=lambda x: (x.raised_date, x.value))
        
        invoice_rows = ""
        for inv in all_invoices:
            due_str = inv.due_date.strftime("%b %d, %Y")
            raised_str = inv.raised_date.strftime("%b %d, %Y")
            status_badge = "OVERDUE" if inv.due_date < datetime.datetime.utcnow() else "PENDING"
            invoice_rows += f"""
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; font-size: 13px; color: #111827;"><strong>{inv.name}</strong></td>
              <td style="padding: 10px 0; font-size: 13px; text-align: center; color: #6b7280;">{raised_str}</td>
              <td style="padding: 10px 0; font-size: 13px; text-align: center; color: #6b7280;">{due_str}</td>
              <td style="padding: 10px 0; font-size: 13px; text-align: center; font-weight: bold; color: {'#ef4444' if status_badge == 'OVERDUE' else '#f59e0b'};">{status_badge}</td>
              <td style="padding: 10px 0; font-size: 13px; text-align: right; font-weight: bold; color: #111827;">${inv.value:.2f}</td>
            </tr>
            """

        oldest_smallest = all_invoices[0]
        
        html = f"""
        <div style="font-family: sans-serif; color: #374151; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h3 style="color: #111827;">Outstanding Invoices Statement</h3>
          <p>Hello {client.name},</p>
          <p>You currently have <strong>{len(all_invoices)} open invoices</strong>. We consolidate our reminder notifications to simplify your inbox.</p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>Total Outstanding Balance:</strong></p>
            <h2 style="margin: 5px 0 0; color: #111827; font-size: 28px;">${total_due:.2f}</h2>
          </div>

          <p><strong>Priority Action Plan:</strong> We recommend clearing older or smaller balances first. Please prioritize paying <strong>"{oldest_smallest.name}" for ${oldest_smallest.value:.2f}</strong>, raised on {oldest_smallest.raised_date.strftime("%B %d, %Y")}.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #9ca3af;">Invoice</th>
                <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #9ca3af; text-align: center;">Raised</th>
                <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #9ca3af; text-align: center;">Due</th>
                <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #9ca3af; text-align: center;">Status</th>
                <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #9ca3af; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice_rows}
            </tbody>
          </table>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Note: Consolidating {len(triggered_triggers)} active reminders.</p>
        </div>
        """
        try:
            EmailService.send_email(to=client.email, subject=subject, html=html)
        except Exception as e:
            logger.error(f"Error sending consolidated reminder: {e}")
