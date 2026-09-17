from typing import Any


class BizCode:
    SUCCESS = 0
    INVALID_PARAMS = 1000
    INVALID_CONTACT = 1001
    INVALID_CODE = 1003
    CODE_EXPIRED = 1004
    CODE_TOO_FREQUENT = 1005
    INVALID_PASSWORD = 1006
    INVALID_AVATAR = 1007
    UNAUTHORIZED = 2000
    TOKEN_EXPIRED = 2001
    USER_DISABLED = 2002
    FORBIDDEN = 3000
    EMAIL_REGISTERED = 4001
    PHONE_REGISTERED = 4002
    USER_NOT_FOUND = 4003
    PASSWORD_WRONG = 4004
    CONTACT_TAKEN = 4005
    INTERNAL_ERROR = 5000
    COS_NOT_CONFIGURED = 5001


class BizError(Exception):
    def __init__(self, code: int, message: str, data: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


def ok(data: Any = None, message: str = "ok") -> dict[str, Any]:
    return {"code": BizCode.SUCCESS, "data": data, "message": message}
