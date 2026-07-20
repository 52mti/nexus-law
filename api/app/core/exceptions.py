from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "app_error",
        status_code: int = 400,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


def _error_body(
    *,
    request_id: str | None,
    code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
        "request_id": request_id,
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        logger.warning(
            "AppError request_id={} code={} message={}",
            request_id,
            exc.code,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(
                request_id=request_id,
                code=exc.code,
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        detail = exc.detail
        message = detail if isinstance(detail, str) else "HTTP error"
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(
                request_id=request_id,
                code="http_error",
                message=message,
                details=detail if not isinstance(detail, str) else None,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=422,
            content=_error_body(
                request_id=request_id,
                code="validation_error",
                message="Request validation failed",
                details=exc.errors(),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        logger.exception("Unhandled error request_id={}", request_id)
        return JSONResponse(
            status_code=500,
            content=_error_body(
                request_id=request_id,
                code="internal_error",
                message="Internal server error",
            ),
        )
