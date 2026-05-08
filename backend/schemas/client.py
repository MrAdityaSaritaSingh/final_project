from pydantic import BaseModel, Field


class ClientRecord(BaseModel):
    """Client record for audit engagement"""
    client_name: str = Field(min_length=2, max_length=200)
    industry: str = Field(min_length=0, max_length=100)
    contact_person: str = Field(min_length=0, max_length=100)
    email: str = Field(min_length=0, max_length=320)
    last_audit_date: str = Field(min_length=0, max_length=50)
    notes: str = Field(min_length=0, max_length=2000)


class ClientOut(BaseModel):
    """Client output with metadata"""
    id: str
    client_name: str
    industry: str
    contact_person: str
    email: str
    last_audit_date: str
    notes: str
    created_at: str
