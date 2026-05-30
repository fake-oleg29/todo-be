FROM node:20-alpine
# better-sqlite3 is a native addon; Alpine needs a C++ toolchain to compile it
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
