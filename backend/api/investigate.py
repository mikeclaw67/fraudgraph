# backend/api/investigate.py
# WebSocket endpoint for LangGraph fraud investigation agent.
# Route: /api/investigate/ws/{ring_id}?entity_id={entity_id}
# Streams InvStep JSON events to the frontend as the agent runs.

from __future__ import annotations
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.agents.investigator import run_investigation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/investigate/ws/{ring_id}")
async def investigation_websocket(
    websocket: WebSocket,
    ring_id: str,
    entity_id: str = Query(default=""),
):
    await websocket.accept()
    step = 0

    async def send(type_: str, content: str, tool_name: str | None = None):
        nonlocal step
        step += 1
        msg = {"step": step, "type": type_, "content": content}
        if tool_name:
            msg["tool_name"] = tool_name
        await websocket.send_json(msg)

    try:
        async for event in run_investigation(ring_id, entity_id, send):
            pass  # events sent via send() callback
    except WebSocketDisconnect:
        logger.info("Client disconnected during investigation %s", ring_id)
    except Exception as e:
        logger.error("Investigation error: %s", e, exc_info=True)
        await send("error", f"Investigation failed: {str(e)}")
