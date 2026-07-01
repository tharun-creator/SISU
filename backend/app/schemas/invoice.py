import datetime
from typing import Optional
from pydantic import BaseModel

class InvoiceCreate(BaseModel):
    recipient_email: str
    name: str
    value: float
    due_date: datetime.datetime

class InvoiceUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    due_date: Optional[datetime.datetime] = None
    status: Optional[str] = None

class InvoiceOut(BaseModel):
    id: int
    client_id: int
    client_name: str
    client_email: str
    name: str
    company_name: str
    value: float
    due_date: datetime.datetime
    raised_date: datetime.datetime
    status: str
    days_since_raised: int
    days_until_due: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
