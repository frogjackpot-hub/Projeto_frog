FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Dar permissão de execução ao script
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Usar o script de inicialização
CMD [ "sh", "docker-entrypoint.sh" ]