"""datasets table; documents.collection -> documents.dataset_id

Revision ID: 0004_datasets
Revises: 0003_hitl_document_status
Create Date: 2026-08-07 17:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_datasets"
down_revision: str | None = "0003_hitl_document_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "datasets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("weaviate_collection", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=128), nullable=True),
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
        sa.UniqueConstraint("name", name="uq_datasets_name"),
        sa.UniqueConstraint("weaviate_collection", name="uq_datasets_weaviate_collection"),
    )
    op.create_index("ix_datasets_name", "datasets", ["name"])
    op.create_index("ix_datasets_weaviate_collection", "datasets", ["weaviate_collection"])
    op.create_index("ix_datasets_created_by", "datasets", ["created_by"])

    op.add_column("documents", sa.Column("dataset_id", sa.String(length=36), nullable=True))

    # Backfill: one Dataset row per distinct documents.collection
    op.execute(
        sa.text(
            """
            INSERT INTO datasets (id, name, weaviate_collection, title, created_at, updated_at)
            SELECT
                gen_random_uuid()::text,
                collection,
                collection,
                collection,
                now(),
                now()
            FROM (
                SELECT DISTINCT collection
                FROM documents
                WHERE collection IS NOT NULL AND btrim(collection) <> ''
            ) AS distinct_collections
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE documents AS d
            SET dataset_id = ds.id
            FROM datasets AS ds
            WHERE d.collection = ds.name
            """
        )
    )

    # Any orphan docs (should be none) get a fallback dataset
    op.execute(
        sa.text(
            """
            INSERT INTO datasets (id, name, weaviate_collection, title, created_at, updated_at)
            SELECT '00000000-0000-0000-0000-000000000001',
                   'NexusLawDocuments',
                   'NexusLawDocuments',
                   'NexusLawDocuments',
                   now(),
                   now()
            WHERE NOT EXISTS (
                SELECT 1 FROM datasets WHERE name = 'NexusLawDocuments'
            )
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE documents
            SET dataset_id = (
                SELECT id FROM datasets WHERE name = 'NexusLawDocuments' LIMIT 1
            )
            WHERE dataset_id IS NULL
            """
        )
    )

    op.alter_column("documents", "dataset_id", nullable=False)
    op.create_index("ix_documents_dataset_id", "documents", ["dataset_id"])
    op.create_foreign_key(
        "fk_documents_dataset_id_datasets",
        "documents",
        "datasets",
        ["dataset_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_column("documents", "collection")


def downgrade() -> None:
    op.add_column("documents", sa.Column("collection", sa.String(length=128), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE documents AS d
            SET collection = ds.weaviate_collection
            FROM datasets AS ds
            WHERE d.dataset_id = ds.id
            """
        )
    )
    op.execute(sa.text("UPDATE documents SET collection = 'NexusLawDocuments' WHERE collection IS NULL"))
    op.alter_column("documents", "collection", nullable=False)

    op.drop_constraint("fk_documents_dataset_id_datasets", "documents", type_="foreignkey")
    op.drop_index("ix_documents_dataset_id", table_name="documents")
    op.drop_column("documents", "dataset_id")

    op.drop_index("ix_datasets_created_by", table_name="datasets")
    op.drop_index("ix_datasets_weaviate_collection", table_name="datasets")
    op.drop_index("ix_datasets_name", table_name="datasets")
    op.drop_table("datasets")
