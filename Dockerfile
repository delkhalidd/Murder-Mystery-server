FROM node:lts-alpine3.21

WORKDIR /app
COPY . /app

ENV IS_DOCKER true
ENV NODE_ENV production
RUN apk add --no-cache curl
RUN npm i --production

CMD npm start
