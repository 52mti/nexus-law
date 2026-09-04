import ast
import operator
from datetime import UTC, datetime

from langchain_core.tools import tool

_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _eval_ast(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _eval_ast(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in _BIN_OPS:
        return _BIN_OPS[type(node.op)](_eval_ast(node.left), _eval_ast(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return _UNARY_OPS[type(node.op)](_eval_ast(node.operand))
    raise ValueError("Only basic arithmetic expressions are allowed")


@tool
def get_current_time() -> str:
    """Return the current UTC date and time in ISO-8601 format."""
    return datetime.now(UTC).isoformat()


@tool
def calculator(expression: str) -> str:
    """Evaluate a basic arithmetic expression such as '15 * 0.2 + 3'.

    Supports +, -, *, /, //, %, **, and parentheses. Does not allow variables or function calls.
    """
    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_ast(tree)
    except Exception as exc:  # noqa: BLE001 - return tool-safe error text
        return f"Calculator error: {exc}"
    if result.is_integer():
        return str(int(result))
    return str(result)


AGENT_TOOLS = [get_current_time, calculator]
