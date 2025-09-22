FROM node:20-alpine
WORKDIR /functions
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 54321
CMD ["node", "index.js"]
