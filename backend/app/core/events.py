from typing import Any, Dict
from pydantic import BaseModel
from app.db.session import SessionLocal
from app.db.models import TrustEvent, EventType

class TrustEventPayload(BaseModel):
    event_type: str
    actor_did: str
    target_did: str = None
    credential_hash: str = None
    payload: Dict[str, Any]

class EventBus:
    def publish(self, event: TrustEventPayload):
        """Publish an event to the SQLite database (replaces Redis)"""
        db = SessionLocal()
        try:
            try:
                etype = EventType(event.event_type)
            except ValueError:
                print(f"Unknown event type {event.event_type}")
                etype = EventType.ISSUER_REGISTERED
                event.payload = {**(event.payload or {}), "original_type": event.event_type}
            db_event = TrustEvent(
                event_type=etype,
                actor_did=event.actor_did,
                target_did=event.target_did,
                credential_hash=event.credential_hash,
                payload=event.payload,
            )
            db.add(db_event)
            db.commit()
            db.refresh(db_event)
            return db_event.id
        except Exception as e:
            print(f"Failed to publish event: {e}")
            db.rollback()
        finally:
            db.close()

    def get_events(self, limit: int = 100):
        db = SessionLocal()
        try:
            return db.query(TrustEvent).order_by(TrustEvent.timestamp.desc()).limit(limit).all()
        finally:
            db.close()

event_bus = EventBus()
