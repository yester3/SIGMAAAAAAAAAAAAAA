FROM node:18-alpine

WORKDIR /app

# Instalar dependencias primero (capa cacheada separada)
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

CMD ["node", "index.js"]
