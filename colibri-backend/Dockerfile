# Etapa base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npx prisma generate

# Puerto que expone tu backend (ajusta si usas otro)
EXPOSE 4000

# Comando de arranque
CMD ["npm", "start"]
