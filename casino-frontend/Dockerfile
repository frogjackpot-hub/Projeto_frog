# Etapa 1: build do Angular
FROM node:22-alpine AS build

WORKDIR /app
# Copiar apenas manifestos para aproveitar cache de dependências
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps || npm install --no-audit --no-fund

# Copiar o restante dos arquivos e gerar build de desenvolvimento
COPY . .
RUN npm run build -- --configuration=development

# Etapa 2: servir com NGINX
FROM nginx:alpine

COPY --from=build /app/dist/casino-frontend/browser/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
