from fastapi import APIRouter

from app.api.v1 import agents, auth, commerce, conversations, health, rag, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(conversations.router)
api_router.include_router(conversations.action_router)
api_router.include_router(agents.router)
api_router.include_router(rag.router)
api_router.include_router(commerce.router)
