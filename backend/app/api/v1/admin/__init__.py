from fastapi import APIRouter

from app.api.v1.admin import agents, audit, auth, commerce, knowledge, prompts, roles, users

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(roles.router)
router.include_router(prompts.router)
router.include_router(commerce.router)
router.include_router(agents.router)
router.include_router(knowledge.router)
router.include_router(audit.router)
