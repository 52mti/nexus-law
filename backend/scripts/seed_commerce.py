"""Insert demo membership / points plans when the table is empty."""

from __future__ import annotations

import asyncio
from decimal import Decimal

from sqlalchemy import func, select

from app.db.models import Plan
from app.db.session import AsyncSessionLocal

DEMO_PLANS = [
    {
        "name": "月度会员",
        "type": "membership",
        "price": Decimal("66.00"),
        "period": "month",
        "benefits_json": {
            "code": "MONTH",
            "hint": "适合日常咨询",
            "features": ["会员问答权益", "每月赠送积分"],
            "gift_points": 1000,
            "exclusive_group": "membership",
        },
        "is_active": True,
    },
    {
        "name": "年度会员",
        "type": "membership",
        "price": Decimal("660.00"),
        "period": "year",
        "benefits_json": {
            "code": "YEAR",
            "hint": "更优惠的长期方案",
            "features": ["会员问答权益", "每年赠送积分", "优先客服"],
            "gift_points": 15000,
            "exclusive_group": "membership",
        },
        "is_active": True,
    },
    {
        "name": "100积分",
        "type": "points",
        "price": Decimal("9.90"),
        "period": None,
        "benefits_json": {"points": 100, "hint": "入门档"},
        "is_active": True,
    },
    {
        "name": "500积分",
        "type": "points",
        "price": Decimal("45.00"),
        "period": None,
        "benefits_json": {"points": 500, "hint": "常用档"},
        "is_active": True,
    },
    {
        "name": "1000积分",
        "type": "points",
        "price": Decimal("88.00"),
        "period": None,
        "benefits_json": {"points": 1000, "hint": "超值档"},
        "is_active": True,
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        total = int(
            (
                await session.execute(
                    select(func.count()).select_from(Plan).where(Plan.is_deleted.is_(False))
                )
            ).scalar_one()
        )
        if total:
            print(f"plans already exist ({total}), skip seed")
            return
        for item in DEMO_PLANS:
            session.add(Plan(**item))
        await session.commit()
        print(f"seeded {len(DEMO_PLANS)} commerce plans")


if __name__ == "__main__":
    asyncio.run(seed())
