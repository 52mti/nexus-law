# 阶段 1：编译 React
FROM node:20-alpine AS builder
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 阶段 2：用 Nginx 部署
FROM nginx:alpine
# 把编译好的静态文件放进 Nginx 目录 (注意：如果是 Create React App 则是 /app/build)
COPY --from=builder /app/dist /usr/share/nginx/html
# 替换 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]