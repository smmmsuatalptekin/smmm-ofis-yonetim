FROM node:20-slim

WORKDIR /app

# Install deps first for better layer caching
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

COPY . .

EXPOSE 3000

# CRA dev server (hot reload). For a production build use: yarn build + a static server.
CMD ["yarn", "start"]
