# 阶段 1：编译
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 阶段 2：运行
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# 只安装生产依赖
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]