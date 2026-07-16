import redis
import json
from typing import Any, Dict
from pydantic import BaseModel

class TrustEventPayload(BaseModel):
    event_type: str
    actor_did: str
    target_did: str = None
    credential_hash: str = None
    payload: Dict[str, Any]

class EventBus:
    def __init__(self, redis_url: str = "redis://localhost:6379/0", stream_name: str = "trustverse_events"):
        self.redis = redis.from_url(redis_url)
        self.stream_name = stream_name

    def publish(self, event: TrustEventPayload):
        """Publish an event to the Redis Stream"""
        event_dict = event.dict(exclude_none=True)
        # Redis streams require dict with string values
        stream_data = {k: (json.dumps(v) if isinstance(v, dict) else str(v)) for k, v in event_dict.items()}
        return self.redis.xadd(self.stream_name, stream_data)

    def subscribe(self, group_name: str, consumer_name: str, block: int = 0):
        """Subscribe to the event stream as a consumer group"""
        try:
            self.redis.xgroup_create(self.stream_name, group_name, id="0", mkstream=True)
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

        # Read from stream
        messages = self.redis.xreadgroup(group_name, consumer_name, {self.stream_name: ">"}, block=block, count=10)
        return messages

    def ack(self, group_name: str, message_id: str):
        """Acknowledge a processed message"""
        self.redis.xack(self.stream_name, group_name, message_id)

event_bus = EventBus()
