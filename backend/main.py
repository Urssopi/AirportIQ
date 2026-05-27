import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

from .config import settings
from .database.client import get_supabase
from .jobs.check_alerts import run_periodic
from .routers import airports, alerts, auth, flights, jobs, plan, trips, tsa, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_supabase()
    task: asyncio.Task | None = None
    if os.environ.get("DISABLE_ALERT_LOOP") != "1":
        task = asyncio.create_task(run_periodic())
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass


app = FastAPI(title="AirportIQ API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(airports.router, prefix="/api/airports", tags=["airports"])
app.include_router(flights.router, prefix="/api/flights", tags=["flights"])
app.include_router(tsa.router, prefix="/api/tsa", tags=["tsa"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(plan.router, prefix="/api/plan", tags=["plan"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
