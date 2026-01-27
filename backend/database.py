"""
DASO Database Module
====================
SQLite database schema and operations for queue management.
"""

import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import contextmanager

# Database file path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "daso.db")


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Initialize the database with required tables."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Customers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mobile VARCHAR(15) UNIQUE NOT NULL,
                name VARCHAR(100),
                age INTEGER DEFAULT 30,
                is_disabled INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Queue entries table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS queue_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_number VARCHAR(20) UNIQUE NOT NULL,
                customer_id INTEGER,
                service_type VARCHAR(50) NOT NULL,
                booking_type VARCHAR(20) NOT NULL,
                scheduled_time TIMESTAMP,
                check_in_time TIMESTAMP,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                status VARCHAR(20) DEFAULT 'waiting',
                priority_score REAL DEFAULT 0,
                predicted_duration REAL,
                actual_duration REAL,
                assigned_counter INTEGER,
                staff_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        """)
        
        # Staff table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                counter_number INTEGER UNIQUE NOT NULL,
                efficiency_score REAL DEFAULT 1.0,
                is_available INTEGER DEFAULT 1,
                current_queue_id INTEGER,
                FOREIGN KEY (current_queue_id) REFERENCES queue_entries(id)
            )
        """)
        
        # Transaction history for analytics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transaction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                queue_id INTEGER,
                service_type VARCHAR(50),
                predicted_duration REAL,
                actual_duration REAL,
                wait_time REAL,
                staff_id INTEGER,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (queue_id) REFERENCES queue_entries(id),
                FOREIGN KEY (staff_id) REFERENCES staff(id)
            )
        """)
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_queue_status 
            ON queue_entries(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_queue_priority 
            ON queue_entries(priority_score DESC)
        """)
        
        # Insert default staff if not exists
        cursor.execute("SELECT COUNT(*) FROM staff")
        if cursor.fetchone()[0] == 0:
            default_staff = [
                ("Raj Kumar", 1, 1.0),
                ("Priya Sharma", 2, 1.1),
                ("Amit Patel", 3, 0.95),
                ("Neha Singh", 4, 1.05),
            ]
            cursor.executemany(
                "INSERT INTO staff (name, counter_number, efficiency_score) VALUES (?, ?, ?)",
                default_staff
            )


def generate_token() -> str:
    """Generate a unique token number."""
    now = datetime.now()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM queue_entries WHERE DATE(created_at) = DATE('now')"
        )
        count = cursor.fetchone()[0] + 1
    return f"{now.strftime('%d%m')}-{count:04d}"


def create_customer(mobile: str, name: str = None, age: int = 30, 
                   is_disabled: bool = False) -> int:
    """Create or update a customer record."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO customers (mobile, name, age, is_disabled)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(mobile) DO UPDATE SET
               name = COALESCE(excluded.name, customers.name),
               age = COALESCE(excluded.age, customers.age),
               is_disabled = COALESCE(excluded.is_disabled, customers.is_disabled)
               RETURNING id""",
            (mobile, name, age, 1 if is_disabled else 0)
        )
        return cursor.fetchone()[0]


def create_queue_entry(
    customer_id: int,
    service_type: str,
    booking_type: str,
    scheduled_time: datetime = None,
    priority_score: float = 0,
    predicted_duration: float = None
) -> dict:
    """Create a new queue entry."""
    token = generate_token()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO queue_entries 
               (token_number, customer_id, service_type, booking_type, 
                scheduled_time, priority_score, predicted_duration, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')
               RETURNING id, token_number""",
            (token, customer_id, service_type, booking_type,
             scheduled_time, priority_score, predicted_duration)
        )
        row = cursor.fetchone()
        return {"id": row[0], "token_number": row[1]}


def get_queue(status: str = None, limit: int = 20) -> List[dict]:
    """Get queue entries sorted by priority."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                q.id, q.token_number, q.service_type, q.booking_type,
                q.scheduled_time, q.check_in_time, q.status,
                q.priority_score, q.predicted_duration, q.assigned_counter,
                q.start_time,
                q.created_at,
                c.name as customer_name, c.age, c.is_disabled, c.mobile
            FROM queue_entries q
            LEFT JOIN customers c ON q.customer_id = c.id
        """
        
        conditions = []
        params = []
        
        if status:
            conditions.append("q.status = ?")
            params.append(status)
        else:
            conditions.append("q.status IN ('waiting', 'checked_in', 'in_progress')")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += """ 
            ORDER BY 
                CASE WHEN q.status = 'in_progress' THEN 0 ELSE 1 END,
                q.priority_score DESC, 
                q.created_at ASC 
            LIMIT ?
        """
        params.append(limit)
        
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def update_queue_status(queue_id: int, status: str, **kwargs) -> bool:
    """Update queue entry status and optional fields."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        fields = ["status = ?"]
        values = [status]
        
        if "start_time" in kwargs:
            fields.append("start_time = ?")
            values.append(kwargs["start_time"])
        
        if "end_time" in kwargs:
            fields.append("end_time = ?")
            values.append(kwargs["end_time"])
            
        if "actual_duration" in kwargs:
            fields.append("actual_duration = ?")
            values.append(kwargs["actual_duration"])
            
        if "assigned_counter" in kwargs:
            fields.append("assigned_counter = ?")
            values.append(kwargs["assigned_counter"])
            
        if "staff_id" in kwargs:
            fields.append("staff_id = ?")
            values.append(kwargs["staff_id"])
            
        if "check_in_time" in kwargs:
            fields.append("check_in_time = ?")
            values.append(kwargs["check_in_time"])
            
        if "priority_score" in kwargs:
            fields.append("priority_score = ?")
            values.append(kwargs["priority_score"])
        
        values.append(queue_id)
        
        cursor.execute(
            f"UPDATE queue_entries SET {', '.join(fields)} WHERE id = ?",
            values
        )
        return cursor.rowcount > 0


def get_queue_by_id(queue_id: int) -> Optional[dict]:
    """Get a single queue entry by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT q.*, c.name as customer_name, c.age, c.is_disabled, c.mobile
               FROM queue_entries q
               LEFT JOIN customers c ON q.customer_id = c.id
               WHERE q.id = ?""",
            (queue_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def get_customer_by_mobile(mobile: str) -> Optional[dict]:
    """Get customer by mobile number."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE mobile = ?", (mobile,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_staff(counter_number: int = None) -> List[dict]:
    """Get staff members."""
    with get_db() as conn:
        cursor = conn.cursor()
        if counter_number:
            cursor.execute(
                "SELECT * FROM staff WHERE counter_number = ?",
                (counter_number,)
            )
        else:
            cursor.execute("SELECT * FROM staff")
        return [dict(row) for row in cursor.fetchall()]


def update_staff(staff_id: int, **kwargs) -> bool:
    """Update staff record."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        fields = []
        values = []
        
        for key, value in kwargs.items():
            if key in ["is_available", "current_queue_id", "efficiency_score"]:
                fields.append(f"{key} = ?")
                values.append(value)
        
        if not fields:
            return False
            
        values.append(staff_id)
        cursor.execute(
            f"UPDATE staff SET {', '.join(fields)} WHERE id = ?",
            values
        )
        return cursor.rowcount > 0


def save_transaction(queue_id: int, service_type: str, predicted: float,
                    actual: float, wait_time: float, staff_id: int):
    """Save completed transaction for analytics."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO transaction_history 
               (queue_id, service_type, predicted_duration, actual_duration, 
                wait_time, staff_id)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (queue_id, service_type, predicted, actual, wait_time, staff_id)
        )


def get_analytics() -> dict:
    """Get analytics data."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Average wait time
        cursor.execute(
            """SELECT AVG(wait_time) as avg_wait, 
                      AVG(actual_duration) as avg_service,
                      COUNT(*) as total_transactions
               FROM transaction_history
               WHERE DATE(completed_at) = DATE('now')"""
        )
        today_stats = cursor.fetchone()
        
        # Queue status counts
        cursor.execute(
            """SELECT status, COUNT(*) as count
               FROM queue_entries
               WHERE DATE(created_at) = DATE('now')
               GROUP BY status"""
        )
        status_counts = {row["status"]: row["count"] for row in cursor.fetchall()}
        
        # Staff performance
        cursor.execute(
            """SELECT s.name, s.counter_number, s.efficiency_score,
                      COUNT(t.id) as transactions_today
               FROM staff s
               LEFT JOIN transaction_history t ON s.id = t.staff_id 
                   AND DATE(t.completed_at) = DATE('now')
               GROUP BY s.id"""
        )
        staff_performance = [dict(row) for row in cursor.fetchall()]
        
        return {
            "avg_wait_time": today_stats["avg_wait"] or 0,
            "avg_service_time": today_stats["avg_service"] or 0,
            "total_transactions_today": today_stats["total_transactions"] or 0,
            "queue_status": status_counts,
            "staff_performance": staff_performance
        }


def get_holding_pool() -> List[dict]:
    """Get entries in the holding pool (late arrivals)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT q.*, c.name as customer_name
               FROM queue_entries q
               LEFT JOIN customers c ON q.customer_id = c.id
               WHERE q.status = 'holding'
               ORDER BY q.scheduled_time ASC"""
        )
        return [dict(row) for row in cursor.fetchall()]


def check_late_arrivals():
    """Move late pre-booked customers to holding pool."""
    cutoff_time = datetime.now() - timedelta(minutes=5)
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """UPDATE queue_entries 
               SET status = 'holding'
               WHERE booking_type = 'pre_booked'
               AND status = 'waiting'
               AND scheduled_time < ?
               AND check_in_time IS NULL""",
            (cutoff_time,)
        )
        return cursor.rowcount


# Initialize database on import
init_db()
