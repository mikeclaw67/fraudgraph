# Investigation WebSocket API — streams LangGraph agent steps to the UI.
# WS /ws/investigate/{alert_id}?entity_id=XXX streams JSON line events.
# GET /api/investigate/{alert_id} returns full investigation result synchronously.

from __future__ import annotations

import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/investigate", tags=["investigate"])


@router.get("/{alert_id}")
async def run_investigation(
    alert_id: str,
    entity_id: str = Query(..., description="Primary entity to investigate"),
) -> JSONResponse:
    """Run full investigation and return structured findings."""
    from backend.agent.investigator import investigate
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return JSONResponse({"error": "ANTHROPIC_API_KEY not set"}, status_code=503)
    result = await investigate(alert_id, entity_id)
    return JSONResponse(result)


@router.websocket("/ws/{alert_id}")
async def investigate_ws(
    websocket: WebSocket,
    alert_id: str,
    entity_id: str = Query(..., description="Primary entity to investigate"),
):
    """Stream investigation steps as JSON lines over WebSocket."""
    await websocket.accept()
    try:
        from backend.agent.investigator import investigate_stream
        if not os.environ.get("ANTHROPIC_API_KEY"):
            await websocket.send_text('{"type":"error","content":"ANTHROPIC_API_KEY not set"}')
            await websocket.close()
            return
        async for line in investigate_stream(alert_id, entity_id):
            await websocket.send_text(line)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(f'{{"type":"error","content":"{str(e)[:200]}"}}')
    finally:
        await websocket.close()
