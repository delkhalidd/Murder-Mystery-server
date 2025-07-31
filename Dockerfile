FROM node:lts-alpine3.21 AS builder

WORKDIR /app
ARG branch=dev
RUN apk add --no-cache git
RUN git clone https://github.com/delkhalidd/Murder-Mystery-client .
RUN git checkout ${branch}
RUN npm i
RUN npm run build

FROM node:lts-alpine3.21 AS runner

WORKDIR /app
COPY . /app
COPY --from=builder /app/dist /app/client-build

ENV IS_DOCKER true
ENV NODE_ENV production
ENV CLIENT_BUILD_DIR /app/client-build
RUN apk add --no-cache curl
RUN npm i --production

CMD npm start
