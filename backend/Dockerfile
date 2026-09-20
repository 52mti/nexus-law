# Override on China ECS (also set in docker-compose.yml):
#   --build-arg DEBIAN_MIRROR=mirrors.aliyun.com
#   --build-arg PYPI_INDEX=https://mirrors.aliyun.com/pypi/simple
ARG DEBIAN_MIRROR=deb.debian.org
ARG PYPI_INDEX=https://pypi.org/simple

FROM python:3.11-slim

WORKDIR /app

ARG DEBIAN_MIRROR
ARG PYPI_INDEX

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=300 \
    UV_DEFAULT_INDEX=${PYPI_INDEX} \
    PIP_INDEX_URL=${PYPI_INDEX} \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/app/.venv/bin:$PATH"

RUN set -eux; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i "s|deb.debian.org|${DEBIAN_MIRROR}|g; s|security.debian.org|${DEBIAN_MIRROR}|g" \
        /etc/apt/sources.list.d/debian.sources; \
    fi; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i "s|deb.debian.org|${DEBIAN_MIRROR}|g; s|security.debian.org|${DEBIAN_MIRROR}|g" \
        /etc/apt/sources.list; \
    fi; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl; \
    rm -rf /var/lib/apt/lists/*; \
    pip install --no-cache-dir uv

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY alembic/ alembic/
COPY app/ app/
COPY scripts/seed_commerce.py scripts/seed_commerce.py
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh \
    && uv sync --frozen --no-dev

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
CMD ["run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
