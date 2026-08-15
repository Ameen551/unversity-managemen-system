FROM node:22-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run db:generate
RUN npm run build

ENV NODE_ENV=production

EXPOSE 5000

CMD ["sh", "-c", "npm run db:deploy && npm start"]
