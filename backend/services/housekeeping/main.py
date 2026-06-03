from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import router

app = FastAPI(title="Housekeeping Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000", "http://127.0.0.1:8000", 
        "http://localhost:3010", "http://127.0.0.1:3010",
        "http://localhost:5500", "http://127.0.0.1:5500",
        "http://localhost:5050", "http://127.0.0.1:5050",
        "http://localhost:5501", "http://localhost:3011", "http://127.0.0.1:3011", "http://127.0.0.1:5501"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

from common.database import init_db

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok"}