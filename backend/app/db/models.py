from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    LargeBinary,
    MetaData,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy import (
    false as sa_false,
)
from sqlalchemy import (
    true as sa_true,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


def omit_physical_foreign_keys(metadata: MetaData) -> None:
    """Keep Column.foreign_keys / relationship() for ORM; emit no DB FOREIGN KEY."""
    for table in metadata.tables.values():
        for constraint in list(table.constraints):
            if isinstance(constraint, ForeignKeyConstraint):
                table.constraints.discard(constraint)


class PersistentModel(Base):
    """Every business table: id, created_at, updated_at, is_deleted."""

    __abstract__ = True

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
        index=True,
    )


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class UserStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"


class PermissionType(StrEnum):
    API = "api"
    MENU = "menu"


class DocumentStatus(StrEnum):
    UPLOADING = "uploading"
    PARSING = "parsing"
    DRAFT = "draft"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    DISCARDED = "discarded"


class StorageStatus(StrEnum):
    """Object storage lifecycle for the original file (Tencent COS later)."""

    NONE = "none"
    PENDING = "pending"
    UPLOADED = "uploaded"
    FAILED = "failed"


class DatasetVisibility(StrEnum):
    ALL = "all"
    LAWYER = "lawyer"
    INTERNAL = "internal"


class PointLedgerType(StrEnum):
    RECHARGE = "recharge"
    SUBSCRIBE_GIFT = "subscribe_gift"
    CONSUME_CHAT = "consume_chat"
    REFUND = "refund"
    ADMIN_ADJUST = "admin_adjust"


class SubscriptionStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class ProductType(StrEnum):
    PLAN = "plan"
    POINTS = "points"


class User(PersistentModel):
    __tablename__ = "users"

    external_id: Mapped[str | None] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    nickname: Mapped[str | None] = mapped_column(String(64))
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    points: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=UserStatus.ACTIVE.value,
        server_default=UserStatus.ACTIVE.value,
        index=True,
    )

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="user")
    point_ledgers: Mapped[list["PointLedger"]] = relationship(back_populates="user")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user")


class Role(PersistentModel):
    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="role")
    role_permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role")
    agent_binds: Mapped[list["AgentRoleBind"]] = relationship(back_populates="role")


class Permission(PersistentModel):
    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    role_permissions: Mapped[list["RolePermission"]] = relationship(back_populates="permission")


class UserRole(PersistentModel):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),)

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="user_roles")
    role: Mapped[Role] = relationship(back_populates="user_roles")


class RolePermission(PersistentModel):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_perm"),
    )

    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    permission_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    role: Mapped[Role] = relationship(back_populates="role_permissions")
    permission: Mapped[Permission] = relationship(back_populates="role_permissions")


class Agent(PersistentModel):
    __tablename__ = "agents"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    tool_whitelist: Mapped[list | None] = mapped_column(JSON)
    dataset_ids: Mapped[list | None] = mapped_column(JSON)
    graph_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="legal_qa_react",
        server_default=text("'legal_qa_react'"),
        index=True,
    )
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
        index=True,
    )
    temperature: Mapped[Decimal] = mapped_column(
        Numeric(3, 2),
        nullable=False,
        default=Decimal("0.20"),
        server_default=text("0.20"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=sa_true(),
        index=True,
    )

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="agent")
    prompts: Mapped[list["Prompt"]] = relationship(back_populates="agent")
    role_binds: Mapped[list["AgentRoleBind"]] = relationship(back_populates="agent")


class AgentRoleBind(PersistentModel):
    __tablename__ = "agent_role_binds"
    __table_args__ = (
        UniqueConstraint("agent_id", "role_id", name="uq_agent_role_binds_agent_role"),
    )

    agent_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    agent: Mapped[Agent] = relationship(back_populates="role_binds")
    role: Mapped[Role] = relationship(back_populates="agent_binds")


class AgentRun(PersistentModel):
    __tablename__ = "agent_runs"
    __table_args__ = (
        Index("ix_agent_runs_agent_created", "agent_id", "created_at"),
        Index("ix_agent_runs_user_created", "user_id", "created_at"),
    )

    conversation_id: Mapped[str | None] = mapped_column(String(36), index=True)
    agent_id: Mapped[str | None] = mapped_column(String(36), index=True)
    prompt_id: Mapped[str | None] = mapped_column(String(36), index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), index=True)
    model: Mapped[str | None] = mapped_column(String(128))
    latency_ms: Mapped[float | None] = mapped_column(Numeric(12, 2))
    iterations: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    error_code: Mapped[str | None] = mapped_column(String(64), index=True)
    token_input: Mapped[int | None] = mapped_column(Integer)
    token_output: Mapped[int | None] = mapped_column(Integer)
    tool_trace_json: Mapped[list | dict | None] = mapped_column(JSON)
    retrieval_hit: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
    )
    used_search: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
    )
    used_tools: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
    )
    hit_max_iterations: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
    )
    sources_json: Mapped[list | dict | None] = mapped_column(JSON)


class Prompt(PersistentModel):
    __tablename__ = "prompts"
    __table_args__ = (
        UniqueConstraint("agent_id", "scene", "version", name="uq_prompts_agent_scene_version"),
        Index("ix_prompts_agent_active", "agent_id", "is_active"),
    )

    agent_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scene: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=sa_true(),
        index=True,
    )

    agent: Mapped[Agent] = relationship(back_populates="prompts")


class Conversation(PersistentModel):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_user_deleted_last_msg", "user_id", "is_deleted", "last_message_at"),
        Index("ix_conversations_user_deleted_created", "user_id", "is_deleted", "created_at"),
    )

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    agent_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("agents.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    title: Mapped[str | None] = mapped_column(String(255))
    title_locked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
    )
    content: Mapped[str | None] = mapped_column(Text)
    memory_summary: Mapped[str | None] = mapped_column(Text)
    summary_until_message_id: Mapped[str | None] = mapped_column(String(36))
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    user: Mapped[User] = relationship(back_populates="conversations")
    agent: Mapped[Agent | None] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        order_by="Message.created_at",
        cascade="all, delete-orphan",
    )


class Message(PersistentModel):
    __tablename__ = "messages"

    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_usage: Mapped[int | None] = mapped_column(Integer)
    points_cost: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    sources_json: Mapped[list | dict | None] = mapped_column(JSON)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class Dataset(PersistentModel):
    """Logical RAG dataset; maps 1:1 to a Weaviate collection/class."""

    __tablename__ = "datasets"

    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    weaviate_collection: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    region: Mapped[str | None] = mapped_column(String(64), index=True)
    visibility: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=DatasetVisibility.ALL.value,
        server_default=DatasetVisibility.ALL.value,
        index=True,
    )
    created_by: Mapped[str | None] = mapped_column(String(128), index=True)

    documents: Mapped[list["Document"]] = relationship(back_populates="dataset")


class Document(PersistentModel):
    """RAG document metadata. Vectors live in Weaviate; chunk text is mirrored in PG."""

    __tablename__ = "documents"

    dataset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(512))
    law_level: Mapped[str | None] = mapped_column(String(64), index=True)
    region: Mapped[str | None] = mapped_column(String(64), index=True)
    effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    content_type: Mapped[str | None] = mapped_column(String(128))
    file_extension: Mapped[str | None] = mapped_column(String(32))
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    raw_content: Mapped[bytes | None] = mapped_column(LargeBinary)
    extracted_text: Mapped[str | None] = mapped_column(Text)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=DocumentStatus.UPLOADING.value,
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    uploaded_by: Mapped[str | None] = mapped_column(String(128), index=True)

    storage_provider: Mapped[str | None] = mapped_column(String(32))
    storage_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=StorageStatus.NONE.value,
        index=True,
    )
    oss_bucket: Mapped[str | None] = mapped_column(String(255))
    oss_region: Mapped[str | None] = mapped_column(String(64))
    oss_key: Mapped[str | None] = mapped_column(String(1024))
    oss_url: Mapped[str | None] = mapped_column(String(2048))
    oss_etag: Mapped[str | None] = mapped_column(String(128))
    oss_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    dataset: Mapped["Dataset"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
        order_by="DocumentChunk.chunk_index",
        cascade="all, delete-orphan",
    )

    @property
    def collection(self) -> str:
        """Backward-compatible alias for the Weaviate collection / dataset name."""
        if self.dataset is not None:
            return self.dataset.weaviate_collection
        return ""


class DocumentChunk(PersistentModel):
    """Source text for each chunk. `chunk_index` is the spec ordinal (0-based)."""

    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunks_doc_index"),
    )

    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    char_count: Mapped[int | None] = mapped_column(Integer)

    document: Mapped[Document] = relationship(back_populates="chunks")


class PointLedger(PersistentModel):
    __tablename__ = "point_ledgers"
    __table_args__ = (Index("ix_point_ledgers_user_created", "user_id", "created_at"),)

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    change: Mapped[int] = mapped_column(Integer, nullable=False)
    balance: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    biz_id: Mapped[str | None] = mapped_column(String(36), index=True)
    remark: Mapped[str | None] = mapped_column(String(512))

    user: Mapped[User] = relationship(back_populates="point_ledgers")


class Plan(PersistentModel):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    period: Mapped[str | None] = mapped_column(String(32))
    benefits_json: Mapped[dict | list | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=sa_true(),
        index=True,
    )

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="plan")


class Subscription(PersistentModel):
    __tablename__ = "subscriptions"
    __table_args__ = (Index("ix_subscriptions_user_status", "user_id", "status"),)

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    plan_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("plans.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expire_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=SubscriptionStatus.PENDING.value,
        index=True,
    )

    user: Mapped[User] = relationship(back_populates="subscriptions")
    plan: Mapped[Plan] = relationship(back_populates="subscriptions")


class Order(PersistentModel):
    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_user_status", "user_id", "status"),)

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=OrderStatus.PENDING.value,
        index=True,
    )
    channel: Mapped[str | None] = mapped_column(String(32))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="orders")


class AdminAuditLog(PersistentModel):
    __tablename__ = "admin_audit_logs"
    __table_args__ = (Index("ix_admin_audit_logs_admin_created", "admin_id", "created_at"),)

    admin_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[str | None] = mapped_column(String(36), index=True)
    detail_json: Mapped[dict | list | None] = mapped_column(JSON)


class VerificationScene(StrEnum):
    REGISTER = "register"
    LOGIN = "login"
    RESET_PASSWORD = "reset_password"
    BIND_CONTACT = "bind_contact"


class VerificationCode(PersistentModel):
    __tablename__ = "verification_codes"
    __table_args__ = (Index("ix_verification_codes_target_scene", "target", "scene"),)

    target: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    scene: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    used: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa_false(),
    )


# ForeignKey() stays on columns so ORM/AI can read relations; DDL must not emit them.
omit_physical_foreign_keys(Base.metadata)
