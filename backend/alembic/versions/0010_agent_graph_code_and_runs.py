"""add agent graph_code / is_system and agent_runs observability

Revision ID: 0010_agent_graph_code_and_runs
Revises: 0009_audit_view_permission
Create Date: 2026-09-22 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010_agent_graph_code_and_runs"
down_revision: str | None = "0009_audit_view_permission"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "agents",
        sa.Column(
            "graph_code",
            sa.String(length=64),
            server_default=sa.text("'legal_qa_react'"),
            nullable=False,
        ),
    )
    op.add_column(
        "agents",
        sa.Column(
            "is_system",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.create_index(op.f("ix_agents_graph_code"), "agents", ["graph_code"], unique=False)
    op.create_index(op.f("ix_agents_is_system"), "agents", ["is_system"], unique=False)
    op.execute(
        sa.text(
            """
            UPDATE agents
            SET graph_code = 'legal_qa_react', is_system = true
            WHERE code = 'legal_qa' AND is_deleted = false
            """
        )
    )

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=True),
        sa.Column("agent_id", sa.String(length=36), nullable=True),
        sa.Column("prompt_id", sa.String(length=36), nullable=True),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("model", sa.String(length=128), nullable=True),
        sa.Column("latency_ms", sa.Numeric(12, 2), nullable=True),
        sa.Column("iterations", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("token_input", sa.Integer(), nullable=True),
        sa.Column("token_output", sa.Integer(), nullable=True),
        sa.Column("tool_trace_json", sa.JSON(), nullable=True),
        sa.Column("retrieval_hit", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("used_search", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("used_tools", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "hit_max_iterations",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column("sources_json", sa.JSON(), nullable=True),
    )
    op.create_index(
        op.f("ix_agent_runs_is_deleted"), "agent_runs", ["is_deleted"], unique=False
    )
    op.create_index(
        op.f("ix_agent_runs_conversation_id"),
        "agent_runs",
        ["conversation_id"],
        unique=False,
    )
    op.create_index(op.f("ix_agent_runs_agent_id"), "agent_runs", ["agent_id"], unique=False)
    op.create_index(op.f("ix_agent_runs_prompt_id"), "agent_runs", ["prompt_id"], unique=False)
    op.create_index(op.f("ix_agent_runs_user_id"), "agent_runs", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_agent_runs_error_code"), "agent_runs", ["error_code"], unique=False
    )
    op.create_index(
        "ix_agent_runs_agent_created",
        "agent_runs",
        ["agent_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_agent_runs_user_created",
        "agent_runs",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_agent_runs_user_created", table_name="agent_runs")
    op.drop_index("ix_agent_runs_agent_created", table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_error_code"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_user_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_prompt_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_agent_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_conversation_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_is_deleted"), table_name="agent_runs")
    op.drop_table("agent_runs")
    op.drop_index(op.f("ix_agents_is_system"), table_name="agents")
    op.drop_index(op.f("ix_agents_graph_code"), table_name="agents")
    op.drop_column("agents", "is_system")
    op.drop_column("agents", "graph_code")
