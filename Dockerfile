FROM node:26-trixie-slim
RUN npm install -g corepack && corepack enable

WORKDIR /app

COPY .yarnrc.yml package.json yarn.lock ./

RUN yarn install --immutable

COPY . .

RUN yarn rebuild esbuild

RUN yarn build

ENV NODE_ENV=production
EXPOSE 5120
CMD ["yarn", "start:prod"]
