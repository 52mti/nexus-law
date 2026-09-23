from fastapi import APIRouter

from app.api.v1 import agents, auth, commerce, conversations, health, notifications, users
from app.api.v1.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(conversations.router)
api_router.include_router(conversations.action_router)
api_router.include_router(agents.router)
api_router.include_router(commerce.router)
api_router.include_router(notifications.router)
api_router.include_router(admin_router)
