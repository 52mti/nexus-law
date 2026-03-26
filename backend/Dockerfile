# --- 构建阶段 ---
FROM node:20-alpine AS builder

WORKDIR /app

# 1. 复制依赖清单并安装依赖
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# 2. 生成 Prisma Client
RUN npx prisma generate

# 3. 复制源代码并编译 NestJS
COPY . .
RUN npm run build

# --- 运行阶段 ---
FROM node:20-alpine

WORKDIR /app

# 1. 仅复制运行必需的文件，减小镜像体积
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# 2. 暴露端口
EXPOSE 3000

# 3. 启动命令：先执行数据库迁移，然后启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]