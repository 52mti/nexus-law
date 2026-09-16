"""align schema with Requirements.md: common fields, RBAC, billing, agents

Revision ID: 0006_requirements_schema
Revises: 0005_conversation_content
Create Date: 2026-09-16 09:10:00
"""

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "0006_requirements_schema"
down_revision: str | None = "0005_conversation_content"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ROLE_SUPER_ADMIN = "11111111-1111-4111-8111-111111111001"
ROLE_ADMIN = "11111111-1111-4111-8111-111111111002"
ROLE_LAWYER = "11111111-1111-4111-8111-111111111003"
ROLE_USER = "11111111-1111-4111-8111-111111111004"
AGENT_LEGAL_QA = "22222222-2222-4222-8222-222222222001"

PERMISSIONS: list[tuple[str, str, str]] = [
    ("chat:use", "发起智能对话", "api"),
    ("chat:history", "查看历史对话", "api"),
    ("kb:retrieve", "检索知识库", "api"),
    ("kb:manage", "管理知识库", "api"),
    ("prompt:manage", "管理提示词", "api"),
    ("agent:manage", "管理 Agent", "api"),
    ("user:manage", "管理用户与角色", "api"),
    ("order:manage", "管理订单", "api"),
    ("billing:view", "查看消费记录", "api"),
    ("plan:manage", "配置会员套餐", "api"),
    ("points:recharge", "积分充值", "api"),
]


def _audit_columns() -> list[sa.Column]:
    return [
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
    ]


def _add_is_deleted(table: str) -> None:
    op.add_column(
        table,
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index(op.f(f"ix_{table}_is_deleted"), table, ["is_deleted"], unique=False)


def _add_updated_at(table: str) -> None:
    op.add_column(
        table,
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("nickname", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=1024), nullable=True))
    op.add_column(
        "users",
        sa.Column("points", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
    )
    _add_updated_at("users")
    _add_is_deleted("users")
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=True)
    op.create_index(op.f("ix_users_status"), "users", ["status"], unique=False)

    _add_updated_at("conversations")
    _add_is_deleted("conversations")
    op.add_column(
        "conversations",
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_conversations_last_message_at"),
        "conversations",
        ["last_message_at"],
        unique=False,
    )
    op.execute(
        sa.text(
            """
            UPDATE conversations AS c
            SET last_message_at = COALESCE(
                (
                    SELECT MAX(m.created_at)
                    FROM messages AS m
                    WHERE m.conversation_id = c.id
                ),
                c.created_at
            )
            """
        )
    )
    op.create_index(
        "ix_conversations_user_deleted_last_msg",
        "conversations",
        ["user_id", "is_deleted", "last_message_at"],
        unique=False,
    )
    op.create_index(
        "ix_conversations_user_deleted_created",
        "conversations",
        ["user_id", "is_deleted", "created_at"],
        unique=False,
    )

    _add_updated_at("messages")
    _add_is_deleted("messages")
    op.add_column("messages", sa.Column("token_usage", sa.Integer(), nullable=True))
    op.add_column(
        "messages",
        sa.Column("points_cost", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column("messages", sa.Column("sources_json", sa.JSON(), nullable=True))

    op.add_column("datasets", sa.Column("region", sa.String(length=64), nullable=True))
    op.add_column(
        "datasets",
        sa.Column("visibility", sa.String(length=32), server_default="all", nullable=False),
    )
    _add_is_deleted("datasets")
    op.create_index(op.f("ix_datasets_region"), "datasets", ["region"], unique=False)
    op.create_index(op.f("ix_datasets_visibility"), "datasets", ["visibility"], unique=False)

    op.add_column("documents", sa.Column("law_level", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("region", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("effective_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("documents", sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True))
    _add_is_deleted("documents")
    op.create_index(op.f("ix_documents_law_level"), "documents", ["law_level"], unique=False)
    op.create_index(op.f("ix_documents_region"), "documents", ["region"], unique=False)

    _add_is_deleted("document_chunks")

    op.create_table(
        "roles",
        *_audit_columns(),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_index(op.f("ix_roles_is_deleted"), "roles", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_roles_code"), "roles", ["code"], unique=True)

    op.create_table(
        "permissions",
        *_audit_columns(),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
    )
    op.create_index(op.f("ix_permissions_is_deleted"), "permissions", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_permissions_code"), "permissions", ["code"], unique=True)
    op.create_index(op.f("ix_permissions_type"), "permissions", ["type"], unique=False)

    op.create_table(
        "user_roles",
        *_audit_columns(),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )
    op.create_index(op.f("ix_user_roles_is_deleted"), "user_roles", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_user_roles_user_id"), "user_roles", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_roles_role_id"), "user_roles", ["role_id"], unique=False)

    op.create_table(
        "role_permissions",
        *_audit_columns(),
        sa.Column("role_id", sa.String(length=36), nullable=False),
        sa.Column("permission_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_perm"),
    )
    op.create_index(
        op.f("ix_role_permissions_is_deleted"),
        "role_permissions",
        ["is_deleted"],
        unique=False,
    )
    op.create_index(
        op.f("ix_role_permissions_role_id"),
        "role_permissions",
        ["role_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_role_permissions_permission_id"),
        "role_permissions",
        ["permission_id"],
        unique=False,
    )

    op.create_table(
        "agents",
        *_audit_columns(),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tool_whitelist", sa.JSON(), nullable=True),
        sa.Column("dataset_ids", sa.JSON(), nullable=True),
        sa.Column("temperature", sa.Numeric(3, 2), server_default=sa.text("0.20"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.create_index(op.f("ix_agents_is_deleted"), "agents", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_agents_code"), "agents", ["code"], unique=True)
    op.create_index(op.f("ix_agents_is_active"), "agents", ["is_active"], unique=False)

    op.add_column("conversations", sa.Column("agent_id", sa.String(length=36), nullable=True))
    op.create_index(op.f("ix_conversations_agent_id"), "conversations", ["agent_id"], unique=False)
    op.create_foreign_key(
        "fk_conversations_agent_id",
        "conversations",
        "agents",
        ["agent_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "agent_role_binds",
        *_audit_columns(),
        sa.Column("agent_id", sa.String(length=36), nullable=False),
        sa.Column("role_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("agent_id", "role_id", name="uq_agent_role_binds_agent_role"),
    )
    op.create_index(
        op.f("ix_agent_role_binds_is_deleted"),
        "agent_role_binds",
        ["is_deleted"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_role_binds_agent_id"),
        "agent_role_binds",
        ["agent_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_role_binds_role_id"),
        "agent_role_binds",
        ["role_id"],
        unique=False,
    )

    op.create_table(
        "prompts",
        *_audit_columns(),
        sa.Column("agent_id", sa.String(length=36), nullable=False),
        sa.Column("scene", sa.String(length=64), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("agent_id", "scene", "version", name="uq_prompts_agent_scene_version"),
    )
    op.create_index(op.f("ix_prompts_is_deleted"), "prompts", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_prompts_agent_id"), "prompts", ["agent_id"], unique=False)
    op.create_index(op.f("ix_prompts_scene"), "prompts", ["scene"], unique=False)
    op.create_index(op.f("ix_prompts_is_active"), "prompts", ["is_active"], unique=False)
    op.create_index("ix_prompts_agent_active", "prompts", ["agent_id", "is_active"], unique=False)

    op.create_table(
        "point_ledgers",
        *_audit_columns(),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("change", sa.Integer(), nullable=False),
        sa.Column("balance", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("biz_id", sa.String(length=36), nullable=True),
        sa.Column("remark", sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_point_ledgers_is_deleted"), "point_ledgers", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_point_ledgers_user_id"), "point_ledgers", ["user_id"], unique=False)
    op.create_index(op.f("ix_point_ledgers_type"), "point_ledgers", ["type"], unique=False)
    op.create_index(op.f("ix_point_ledgers_biz_id"), "point_ledgers", ["biz_id"], unique=False)
    op.create_index(
        "ix_point_ledgers_user_created",
        "point_ledgers",
        ["user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "plans",
        *_audit_columns(),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("period", sa.String(length=32), nullable=True),
        sa.Column("benefits_json", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.create_index(op.f("ix_plans_is_deleted"), "plans", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_plans_type"), "plans", ["type"], unique=False)
    op.create_index(op.f("ix_plans_is_active"), "plans", ["is_active"], unique=False)

    op.create_table(
        "subscriptions",
        *_audit_columns(),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("plan_id", sa.String(length=36), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expire_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], ondelete="RESTRICT"),
    )
    op.create_index(op.f("ix_subscriptions_is_deleted"), "subscriptions", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_subscriptions_user_id"), "subscriptions", ["user_id"], unique=False)
    op.create_index(op.f("ix_subscriptions_plan_id"), "subscriptions", ["plan_id"], unique=False)
    op.create_index(op.f("ix_subscriptions_expire_at"), "subscriptions", ["expire_at"], unique=False)
    op.create_index(op.f("ix_subscriptions_status"), "subscriptions", ["status"], unique=False)
    op.create_index(
        "ix_subscriptions_user_status",
        "subscriptions",
        ["user_id", "status"],
        unique=False,
    )

    op.create_table(
        "orders",
        *_audit_columns(),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("product_type", sa.String(length=32), nullable=False),
        sa.Column("product_id", sa.String(length=36), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(op.f("ix_orders_is_deleted"), "orders", ["is_deleted"], unique=False)
    op.create_index(op.f("ix_orders_user_id"), "orders", ["user_id"], unique=False)
    op.create_index(op.f("ix_orders_product_type"), "orders", ["product_type"], unique=False)
    op.create_index(op.f("ix_orders_product_id"), "orders", ["product_id"], unique=False)
    op.create_index(op.f("ix_orders_status"), "orders", ["status"], unique=False)
    op.create_index("ix_orders_user_status", "orders", ["user_id", "status"], unique=False)

    op.create_table(
        "admin_audit_logs",
        *_audit_columns(),
        sa.Column("admin_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=36), nullable=True),
        sa.Column("detail_json", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        op.f("ix_admin_audit_logs_is_deleted"),
        "admin_audit_logs",
        ["is_deleted"],
        unique=False,
    )
    op.create_index(op.f("ix_admin_audit_logs_admin_id"), "admin_audit_logs", ["admin_id"], unique=False)
    op.create_index(op.f("ix_admin_audit_logs_action"), "admin_audit_logs", ["action"], unique=False)
    op.create_index(
        op.f("ix_admin_audit_logs_target_id"),
        "admin_audit_logs",
        ["target_id"],
        unique=False,
    )
    op.create_index(
        "ix_admin_audit_logs_admin_created",
        "admin_audit_logs",
        ["admin_id", "created_at"],
        unique=False,
    )

    _seed_rbac_and_agent()


def _seed_rbac_and_agent() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO roles (id, code, name, description)
            VALUES
                (:super_id, 'super_admin', '超级管理员', '后台全部权限；不可删除最后一个超管'),
                (:admin_id, 'admin', '运营管理员', '用户、订单、积分、会员、消费记录、提示词、知识库'),
                (:lawyer_id, 'lawyer', '专业律师', 'C 端全部问答能力；可使用专业 Agent / 专业知识库'),
                (:user_id, 'user', '普通用户', 'C 端基础问答、积分购买、会员订阅')
            """
        ),
        {
            "super_id": ROLE_SUPER_ADMIN,
            "admin_id": ROLE_ADMIN,
            "lawyer_id": ROLE_LAWYER,
            "user_id": ROLE_USER,
        },
    )

    perm_ids: dict[str, str] = {}
    perm_stmt = sa.text(
        """
        INSERT INTO permissions (id, code, name, "type")
        VALUES (:id, :code, :name, :perm_type)
        """
    )
    for code, name, perm_type in PERMISSIONS:
        perm_id = str(uuid4())
        perm_ids[code] = perm_id
        bind.execute(
            perm_stmt,
            {"id": perm_id, "code": code, "name": name, "perm_type": perm_type},
        )

    admin_codes = {
        "user:manage",
        "order:manage",
        "billing:view",
        "plan:manage",
        "prompt:manage",
        "kb:manage",
        "agent:manage",
        "chat:history",
    }
    client_codes = {"chat:use", "chat:history", "kb:retrieve", "points:recharge"}
    mapping = {
        ROLE_SUPER_ADMIN: set(perm_ids),
        ROLE_ADMIN: admin_codes,
        ROLE_LAWYER: client_codes,
        ROLE_USER: client_codes,
    }
    role_perm_stmt = sa.text(
        """
        INSERT INTO role_permissions (id, role_id, permission_id)
        VALUES (:id, :role_id, :permission_id)
        """
    )
    for role_id, codes in mapping.items():
        for code in codes:
            bind.execute(
                role_perm_stmt,
                {
                    "id": str(uuid4()),
                    "role_id": role_id,
                    "permission_id": perm_ids[code],
                },
            )

    bind.execute(
        sa.text(
            """
            INSERT INTO agents (
                id, name, code, description, tool_whitelist, dataset_ids, temperature, is_active
            )
            VALUES (
                :id, :name, :code, :description,
                CAST(:tool_whitelist AS json), CAST(:dataset_ids AS json),
                0.20, true
            )
            """
        ),
        {
            "id": AGENT_LEGAL_QA,
            "name": "法律问答",
            "code": "legal_qa",
            "description": "默认法律智能问答 Agent",
            "tool_whitelist": '["search_documents", "get_current_time", "calculator"]',
            "dataset_ids": "[]",
        },
    )

    bind_stmt = sa.text(
        """
        INSERT INTO agent_role_binds (id, agent_id, role_id)
        VALUES (:id, :agent_id, :role_id)
        """
    )
    for role_id in (ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_LAWYER, ROLE_USER):
        bind.execute(
            bind_stmt,
            {
                "id": str(uuid4()),
                "agent_id": AGENT_LEGAL_QA,
                "role_id": role_id,
            },
        )


def downgrade() -> None:
    op.drop_index("ix_admin_audit_logs_admin_created", table_name="admin_audit_logs")
    op.drop_index(op.f("ix_admin_audit_logs_target_id"), table_name="admin_audit_logs")
    op.drop_index(op.f("ix_admin_audit_logs_action"), table_name="admin_audit_logs")
    op.drop_index(op.f("ix_admin_audit_logs_admin_id"), table_name="admin_audit_logs")
    op.drop_index(op.f("ix_admin_audit_logs_is_deleted"), table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")

    op.drop_index("ix_orders_user_status", table_name="orders")
    op.drop_index(op.f("ix_orders_status"), table_name="orders")
    op.drop_index(op.f("ix_orders_product_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_product_type"), table_name="orders")
    op.drop_index(op.f("ix_orders_user_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_is_deleted"), table_name="orders")
    op.drop_table("orders")

    op.drop_index("ix_subscriptions_user_status", table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_status"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_expire_at"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_plan_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_user_id"), table_name="subscriptions")
    op.drop_index(op.f("ix_subscriptions_is_deleted"), table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index(op.f("ix_plans_is_active"), table_name="plans")
    op.drop_index(op.f("ix_plans_type"), table_name="plans")
    op.drop_index(op.f("ix_plans_is_deleted"), table_name="plans")
    op.drop_table("plans")

    op.drop_index("ix_point_ledgers_user_created", table_name="point_ledgers")
    op.drop_index(op.f("ix_point_ledgers_biz_id"), table_name="point_ledgers")
    op.drop_index(op.f("ix_point_ledgers_type"), table_name="point_ledgers")
    op.drop_index(op.f("ix_point_ledgers_user_id"), table_name="point_ledgers")
    op.drop_index(op.f("ix_point_ledgers_is_deleted"), table_name="point_ledgers")
    op.drop_table("point_ledgers")

    op.drop_index("ix_prompts_agent_active", table_name="prompts")
    op.drop_index(op.f("ix_prompts_is_active"), table_name="prompts")
    op.drop_index(op.f("ix_prompts_scene"), table_name="prompts")
    op.drop_index(op.f("ix_prompts_agent_id"), table_name="prompts")
    op.drop_index(op.f("ix_prompts_is_deleted"), table_name="prompts")
    op.drop_table("prompts")

    op.drop_index(op.f("ix_agent_role_binds_role_id"), table_name="agent_role_binds")
    op.drop_index(op.f("ix_agent_role_binds_agent_id"), table_name="agent_role_binds")
    op.drop_index(op.f("ix_agent_role_binds_is_deleted"), table_name="agent_role_binds")
    op.drop_table("agent_role_binds")

    op.drop_constraint("fk_conversations_agent_id", "conversations", type_="foreignkey")
    op.drop_index(op.f("ix_conversations_agent_id"), table_name="conversations")
    op.drop_column("conversations", "agent_id")

    op.drop_index(op.f("ix_agents_is_active"), table_name="agents")
    op.drop_index(op.f("ix_agents_code"), table_name="agents")
    op.drop_index(op.f("ix_agents_is_deleted"), table_name="agents")
    op.drop_table("agents")

    op.drop_index(op.f("ix_role_permissions_permission_id"), table_name="role_permissions")
    op.drop_index(op.f("ix_role_permissions_role_id"), table_name="role_permissions")
    op.drop_index(op.f("ix_role_permissions_is_deleted"), table_name="role_permissions")
    op.drop_table("role_permissions")

    op.drop_index(op.f("ix_user_roles_role_id"), table_name="user_roles")
    op.drop_index(op.f("ix_user_roles_user_id"), table_name="user_roles")
    op.drop_index(op.f("ix_user_roles_is_deleted"), table_name="user_roles")
    op.drop_table("user_roles")

    op.drop_index(op.f("ix_permissions_type"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_code"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_is_deleted"), table_name="permissions")
    op.drop_table("permissions")

    op.drop_index(op.f("ix_roles_code"), table_name="roles")
    op.drop_index(op.f("ix_roles_is_deleted"), table_name="roles")
    op.drop_table("roles")

    op.drop_index(op.f("ix_document_chunks_is_deleted"), table_name="document_chunks")
    op.drop_column("document_chunks", "is_deleted")

    op.drop_index(op.f("ix_documents_region"), table_name="documents")
    op.drop_index(op.f("ix_documents_law_level"), table_name="documents")
    op.drop_index(op.f("ix_documents_is_deleted"), table_name="documents")
    op.drop_column("documents", "is_deleted")
    op.drop_column("documents", "expired_at")
    op.drop_column("documents", "effective_at")
    op.drop_column("documents", "region")
    op.drop_column("documents", "law_level")

    op.drop_index(op.f("ix_datasets_visibility"), table_name="datasets")
    op.drop_index(op.f("ix_datasets_region"), table_name="datasets")
    op.drop_index(op.f("ix_datasets_is_deleted"), table_name="datasets")
    op.drop_column("datasets", "is_deleted")
    op.drop_column("datasets", "visibility")
    op.drop_column("datasets", "region")

    op.drop_column("messages", "sources_json")
    op.drop_column("messages", "points_cost")
    op.drop_column("messages", "token_usage")
    op.drop_index(op.f("ix_messages_is_deleted"), table_name="messages")
    op.drop_column("messages", "is_deleted")
    op.drop_column("messages", "updated_at")

    op.drop_index("ix_conversations_user_deleted_created", table_name="conversations")
    op.drop_index("ix_conversations_user_deleted_last_msg", table_name="conversations")
    op.drop_index(op.f("ix_conversations_last_message_at"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_is_deleted"), table_name="conversations")
    op.drop_column("conversations", "last_message_at")
    op.drop_column("conversations", "is_deleted")
    op.drop_column("conversations", "updated_at")

    op.drop_index(op.f("ix_users_status"), table_name="users")
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_index(op.f("ix_users_is_deleted"), table_name="users")
    op.drop_column("users", "is_deleted")
    op.drop_column("users", "updated_at")
    op.drop_column("users", "status")
    op.drop_column("users", "points")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "nickname")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "phone")
