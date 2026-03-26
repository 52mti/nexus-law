# --- 构建阶段 ---
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖并安装
COPY package*.json ./
RUN npm install

# 复制源码并执行 Vite 构建
# ⚠️ 注意：由于使用了 Nginx 反向代理，你的 VITE_API_BASE_URL 应该设置为空或 / 
COPY . .
RUN npm run build

# --- 运行阶段 ---
FROM nginx:alpine

# 移除默认的 nginx 配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/

# 将 Vite 编译出的静态文件复制到 Nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]