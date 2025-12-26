FROM node:18.20

COPY . /home/vendure/

WORKDIR /home/vendure

RUN npm install

WORKDIR /home/vendure/packages/dev-server

CMD npm run start