"""
DASO FastAPI Backend
====================
Smart Banking Flow Management System - API Server

Endpoints:
- POST /predict-time - ML-based duration prediction
- POST /book-slot - Create walk-in token or pre-booking
- GET /queue-status - Get priority-sorted queue
- POST /staff-update - Staff marks transaction status
- POST /sim-proximity - Simulate proximity check-in
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from enum import Enum

# Local imports
from database import (
    init_db, create_customer, create_queue_entry, get_queue,
    update_queue_status, get_queue_by_id, get_customer_by_mobile,
    get_staff, update_staff, save_transaction, get_analytics,
    get_holding_pool, check_late_arrivals
)
from ml_engine import predict_duration, calculate_priority, get_service_types, SERVICE_TYPES

# Model path
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "duration_predictor.pkl")

# ============================================================
# FastAPI App Setup
# ============================================================

app = FastAPI(
    title="DASO API",
    description="Dynamic Appointment & Slot Optimization System for Smart Banking",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Pydantic Models
# ============================================================

class ServiceType(str, Enum):
    cash_deposit = "Cash_Deposit"
    cash_withdrawal = "Cash_Withdrawal"
    loan_inquiry = "Loan_Inquiry"
    kyc_update = "KYC_Update"
    forex = "Forex"
    lost_card = "Lost_Card"
    account_opening = "Account_Opening"
    fixed_deposit = "Fixed_Deposit"


class BookingType(str, Enum):
    walk_in = "walk_in"
    pre_booked = "pre_booked"


class PredictTimeRequest(BaseModel):
    age: int = Field(ge=18, le=100, default=30)
    is_disabled: bool = False
    service_type: ServiceType
    staff_efficiency_score: float = Field(ge=0.5, le=1.5, default=1.0)
    time_of_day: int = Field(ge=9, le=17, default=12)


class BookSlotRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=15)
    name: Optional[str] = None
    age: int = Field(ge=18, le=100, default=30)
    is_disabled: bool = False
    service_type: ServiceType
    booking_type: BookingType
    scheduled_time: Optional[datetime] = None  # For pre-booked


class StaffUpdateRequest(BaseModel):
    queue_id: int
    action: str = Field(pattern="^(start|complete|no_show)$")
    counter_number: int
    staff_id: int


class ProximityRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=15)


class QueueResponse(BaseModel):
    id: int
    token_number: str
    customer_name: Optional[str]
    service_type: str
    booking_type: str
    status: str
    priority_score: float
    predicted_duration: Optional[float]
    wait_time_min: Optional[float]
    assigned_counter: Optional[int]
    start_time: Optional[datetime]


# ============================================================
# API Endpoints
# ============================================================

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "DASO API",
        "version": "1.0.0",
        "time": datetime.now().isoformat()
    }


@app.get("/service-types")
async def list_service_types():
    """Get available service types with base durations."""
    return {
        "service_types": [
            {
                "id": st,
                "name": st.replace("_", " "),
                "base_duration_min": config["base"]
            }
            for st, config in SERVICE_TYPES.items()
        ]
    }


@app.post("/predict-time")
async def predict_time(request: PredictTimeRequest):
    """
    Predict service duration using ML model.
    
    Returns estimated duration in minutes based on:
    - Customer demographics (age, disability status)
    - Service type
    - Staff efficiency
    - Time of day
    """
    try:
        predicted = predict_duration(
            age=request.age,
            is_disabled=1 if request.is_disabled else 0,
            service_type=request.service_type.value,
            staff_efficiency_score=request.staff_efficiency_score,
            time_of_day=request.time_of_day,
            model_path=MODEL_PATH
        )
        
        return {
            "estimated_duration_min": predicted,
            "service_type": request.service_type.value,
            "confidence": "high" if predicted > 0 else "low"
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="ML model not found. Please run ml_engine.py first."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/book-slot")
async def book_slot(request: BookSlotRequest):
    """
    Book a slot for walk-in or pre-booked customer.
    
    For walk-ins:
    - Calculates priority score immediately
    - Assigns position in queue based on priority
    
    For pre-booked:
    - Simulates 10% no-show risk
    - Stores scheduled time
    """
    # Create or update customer
    customer_id = create_customer(
        mobile=request.mobile,
        name=request.name,
        age=request.age,
        is_disabled=request.is_disabled
    )
    
    # Get predicted duration
    now = datetime.now()
    time_of_day = now.hour if 9 <= now.hour <= 17 else 12
    
    predicted = predict_duration(
        age=request.age,
        is_disabled=1 if request.is_disabled else 0,
        service_type=request.service_type.value,
        staff_efficiency_score=1.0,
        time_of_day=time_of_day,
        model_path=MODEL_PATH
    )
    
    # Calculate initial priority score
    priority = calculate_priority(
        age=request.age,
        is_disabled=request.is_disabled,
        service_type=request.service_type.value,
        wait_time_min=0  # Just arrived
    )
    
    # For pre-booked: simulate no-show risk
    no_show_risk = None
    if request.booking_type == BookingType.pre_booked:
        no_show_risk = random.random() < 0.10  # 10% chance
    
    # Create queue entry
    queue_entry = create_queue_entry(
        customer_id=customer_id,
        service_type=request.service_type.value,
        booking_type=request.booking_type.value,
        scheduled_time=request.scheduled_time,
        priority_score=priority,
        predicted_duration=predicted
    )
    
    # Get current queue position
    queue = get_queue()
    position = next(
        (i + 1 for i, q in enumerate(queue) if q["id"] == queue_entry["id"]),
        len(queue)
    )
    
    # Estimate wait time
    estimated_wait = sum(
        q.get("predicted_duration", 5) or 5 
        for q in queue[:position-1]
    )
    
    return {
        "success": True,
        "token_number": queue_entry["token_number"],
        "queue_id": queue_entry["id"],
        "position": position,
        "priority_score": priority,
        "predicted_duration_min": predicted,
        "estimated_wait_min": round(estimated_wait, 1),
        "no_show_risk": no_show_risk,
        "message": f"Token {queue_entry['token_number']} issued. Estimated wait: {round(estimated_wait)} mins."
    }


@app.get("/queue-status")
async def queue_status(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get the current queue sorted by priority.
    
    Implements the Merging Logic:
    - High-priority walk-ins (score > 80) can jump ahead of low-priority appointments
    - BUT never delay an appointment by more than 10 mins (Buffer Rule)
    
    Also checks for late arrivals and moves them to holding pool.
    """
    # Check for late arrivals first
    late_count = check_late_arrivals()
    
    # Get raw queue
    raw_queue = get_queue(status=status, limit=limit * 2)  # Get extra for merging
    
    # Separate by type
    appointments = [q for q in raw_queue if q["booking_type"] == "pre_booked"]
    walkins = [q for q in raw_queue if q["booking_type"] == "walk_in"]
    
    # Apply merging logic
    merged_queue = []
    now = datetime.now()
    
    for appt in appointments:
        # Check if any high-priority walk-ins should jump ahead
        high_priority_walkins = [
            w for w in walkins 
            if w["priority_score"] > 80 and w["id"] not in [m["id"] for m in merged_queue]
        ]
        
        for walkin in high_priority_walkins:
            # Calculate if inserting would delay appointment by > 10 mins
            walkin_duration = walkin.get("predicted_duration", 5) or 5
            scheduled = appt.get("scheduled_time")
            
            if scheduled:
                # Buffer check: don't delay appointments more than 10 mins
                current_delay = sum(
                    m.get("predicted_duration", 5) or 5 
                    for m in merged_queue
                )
                if current_delay + walkin_duration <= 10:
                    merged_queue.append(walkin)
                    walkins.remove(walkin)
        
        merged_queue.append(appt)
    
    # Add remaining walk-ins
    merged_queue.extend([w for w in walkins if w["id"] not in [m["id"] for m in merged_queue]])
    
    # Sort final queue by priority
    merged_queue.sort(key=lambda x: (-x["priority_score"], x["created_at"]))
    
    # Calculate wait times and format response
    result = []
    cumulative_wait = 0
    
    for i, entry in enumerate(merged_queue[:limit]):
        wait_time = cumulative_wait
        
        result.append({
            "id": entry["id"],
            "token_number": entry["token_number"],
            "customer_name": entry.get("customer_name", "Guest"),
            "mobile": entry.get("mobile", "")[-4:] if entry.get("mobile") else "",  # Last 4 digits only
            "age": entry.get("age", 30),
            "is_disabled": bool(entry.get("is_disabled", 0)),
            "service_type": entry["service_type"],
            "booking_type": entry["booking_type"],
            "status": entry["status"],
            "priority_score": entry["priority_score"],
            "predicted_duration_min": entry.get("predicted_duration"),
            "estimated_wait_min": round(wait_time, 1),
            "position": i + 1,
            "assigned_counter": entry.get("assigned_counter"),
            "scheduled_time": entry.get("scheduled_time"),
            "check_in_time": entry.get("check_in_time"),
            "start_time": entry.get("start_time")
        })
        
        cumulative_wait += entry.get("predicted_duration", 5) or 5
    
    return {
        "queue": result,
        "total_in_queue": len(result),
        "late_arrivals_moved": late_count,
        "timestamp": now.isoformat()
    }


@app.post("/staff-update")
async def staff_update(request: StaffUpdateRequest):
    """
    Staff updates transaction status.
    
    Actions:
    - 'start': Begin serving customer, record start time
    - 'complete': Finish transaction, calculate actual duration, save for ML retraining
    - 'no_show': Customer didn't show, move to next
    """
    queue_entry = get_queue_by_id(request.queue_id)
    if not queue_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    
    now = datetime.now()
    
    if request.action == "start":
        # Mark as in progress
        update_queue_status(
            request.queue_id,
            status="in_progress",
            start_time=now,
            assigned_counter=request.counter_number,
            staff_id=request.staff_id
        )
        
        # Update staff availability
        update_staff(request.staff_id, is_available=0, current_queue_id=request.queue_id)
        
        return {
            "success": True,
            "action": "started",
            "queue_id": request.queue_id,
            "start_time": now.isoformat(),
            "predicted_duration_min": queue_entry.get("predicted_duration")
        }
    
    elif request.action == "complete":
        # Calculate actual duration
        start_time = queue_entry.get("start_time")
        if start_time:
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time)
            actual_duration = (now - start_time).total_seconds() / 60
        else:
            actual_duration = queue_entry.get("predicted_duration", 5)
        
        # Calculate wait time
        created_at = queue_entry.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)
            wait_time = (start_time - created_at).total_seconds() / 60 if start_time else 0
        else:
            wait_time = 0
        
        # Update queue entry
        update_queue_status(
            request.queue_id,
            status="completed",
            end_time=now,
            actual_duration=actual_duration
        )
        
        # Save transaction for analytics and future ML training
        save_transaction(
            queue_id=request.queue_id,
            service_type=queue_entry["service_type"],
            predicted=queue_entry.get("predicted_duration", 0),
            actual=actual_duration,
            wait_time=wait_time,
            staff_id=request.staff_id
        )
        
        # Free up staff
        update_staff(request.staff_id, is_available=1, current_queue_id=None)
        
        # Performance comparison
        predicted = queue_entry.get("predicted_duration", actual_duration)
        performance = "faster" if actual_duration < predicted else (
            "slower" if actual_duration > predicted * 1.1 else "on_track"
        )
        
        return {
            "success": True,
            "action": "completed",
            "queue_id": request.queue_id,
            "actual_duration_min": round(actual_duration, 1),
            "predicted_duration_min": predicted,
            "wait_time_min": round(wait_time, 1),
            "performance": performance,
            "variance_min": round(actual_duration - predicted, 1)
        }
    
    elif request.action == "no_show":
        update_queue_status(request.queue_id, status="no_show")
        
        return {
            "success": True,
            "action": "no_show",
            "queue_id": request.queue_id,
            "message": "Customer marked as no-show"
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")


@app.post("/sim-proximity")
async def simulate_proximity(request: ProximityRequest):
    """
    Simulate Wi-Fi/Beacon proximity detection for check-in.
    
    When a pre-booked customer arrives (detected by proximity),
    their status changes to 'checked_in' and they're ready to be called.
    """
    customer = get_customer_by_mobile(request.mobile)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Find their pending queue entry
    queue = get_queue()
    customer_entry = next(
        (q for q in queue if q.get("mobile") == request.mobile and q["status"] == "waiting"),
        None
    )
    
    if not customer_entry:
        return {
            "success": False,
            "message": "No pending appointment found for this customer"
        }
    
    now = datetime.now()
    
    # Update priority (boost for being present)
    new_priority = customer_entry["priority_score"] + 10
    
    update_queue_status(
        customer_entry["id"],
        status="checked_in",
        check_in_time=now,
        priority_score=new_priority
    )
    
    # Get assigned counter (next available)
    staff_list = get_staff()
    available_counter = next(
        (s["counter_number"] for s in staff_list if s["is_available"]),
        None
    )
    
    # Get updated position
    updated_queue = get_queue()
    position = next(
        (i + 1 for i, q in enumerate(updated_queue) if q["id"] == customer_entry["id"]),
        0
    )
    
    return {
        "success": True,
        "message": f"Welcome {customer.get('name', 'Guest')}!",
        "token_number": customer_entry["token_number"],
        "queue_position": position,
        "assigned_counter": available_counter,
        "check_in_time": now.isoformat()
    }


@app.get("/holding-pool")
async def get_holding_pool_entries():
    """Get customers in the holding pool (late arrivals)."""
    entries = get_holding_pool()
    return {
        "holding_pool": entries,
        "count": len(entries)
    }


@app.get("/analytics")
async def get_analytics_data():
    """Get analytics data for manager dashboard."""
    data = get_analytics()
    
    # Add some simulated heatmap data
    hours = list(range(9, 17))
    heatmap = [
        {"hour": h, "load": random.randint(20, 100)}
        for h in hours
    ]
    
    data["hourly_load_heatmap"] = heatmap
    data["current_time"] = datetime.now().isoformat()
    
    return data


@app.get("/staff")
async def list_staff():
    """Get all staff members with their status."""
    staff_list = get_staff()
    return {
        "staff": [
            {
                **s,
                "status": "busy" if s.get("current_queue_id") else "available"
            }
            for s in staff_list
        ]
    }


# ============================================================
# Main Entry Point
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    print("\n🏦 DASO API Server")
    print("=" * 40)
    print("Starting on http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 40 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
