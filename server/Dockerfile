FROM node:13.12.0-alpine

COPY . .

RUN npm install
EXPOSE 80
ENV PORT 80
CMD node myServer.js