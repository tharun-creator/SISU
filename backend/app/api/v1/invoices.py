from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user, require_admin
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Invoicing"])

@router.post("", response_model=InvoiceOut)
async def create_invoice(
    req: InvoiceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        new_inv = InvoiceService.create_invoice(db, req)
        return new_inv
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {e}")

@router.get("", response_model=List[InvoiceOut])
async def get_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["admin", "super_admin"]:
        return InvoiceService.get_all_invoices(db)
    else:
        return InvoiceService.get_user_invoices(db, current_user.id)

@router.put("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(
    invoice_id: int,
    req: InvoiceUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    updated = InvoiceService.update_invoice(db, invoice_id, req)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    success = InvoiceService.delete_invoice(db, invoice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "success": True,
        "data": {"message": "Invoice deleted successfully"}
    }

@router.post("/trigger-reminders")
async def trigger_reminders(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        result = InvoiceService.run_invoice_reminders(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run invoice reminders: {e}")
