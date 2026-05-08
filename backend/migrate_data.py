"""
Database migration script to update user name and seed proper workbook data.
Run this once to update existing data.
"""

import os
from datetime import datetime, timezone
from pymongo import MongoClient
from bson import ObjectId

MONGO_URI = os.environ.get("MONGO_URI", "")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "auditdb")

if not MONGO_URI:
    print("ERROR: MONGO_URI environment variable is not set")
    exit(1)

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

print("Connecting to database...")
db.command("ping")
print("✓ Connected to MongoDB")

# Update user name from "abhi" to "Auditor User"
print("\nUpdating user name...")
user_result = db.users.update_one(
    {"name": "abhi"},
    {"$set": {"name": "Auditor User"}},
)
print(f"✓ Updated {user_result.modified_count} user(s)")

# Update or create workbook data with proper client names
print("\nUpdating workbooks...")

# Get the user ID
user = db.users.find_one({"name": "Auditor User"})
if not user:
    print("ERROR: Could not find 'Auditor User'")
    exit(1)

user_id = str(user["_id"])

# Define proper client workbooks
workbooks_data = [
    {
        "owner_user_id": user_id,
        "client_name": "Acme Corporation Ltd.",
        "financial_year": "FY 2023-24",
        "functional_currency": "USD",
        "engagement_type": "Full Audit",
        "status": "In Progress",
        "risk_score": 68,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "owner_user_id": user_id,
        "client_name": "TechVision Solutions",
        "financial_year": "FY 2023-24",
        "functional_currency": "USD",
        "engagement_type": "Review",
        "status": "Draft",
        "risk_score": 42,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
    {
        "owner_user_id": user_id,
        "client_name": "Global Industries Inc.",
        "financial_year": "FY 2022-23",
        "functional_currency": "USD",
        "engagement_type": "Full Audit",
        "status": "Completed",
        "risk_score": 85,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    },
]

# Delete old test workbooks
db.workbooks.delete_many({"owner_user_id": user_id})

# Insert new workbooks
result = db.workbooks.insert_many(workbooks_data)
print(f"✓ Created {len(result.inserted_ids)} new workbooks")

print("\n✅ Database migration completed successfully!")
print(f"\nUpdated user: Auditor User (ID: {user_id})")
print("Updated workbooks:")
for wb in workbooks_data:
    print(f"  - {wb['client_name']} ({wb['financial_year']})")

client.close()
