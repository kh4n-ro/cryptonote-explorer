FROM node:8
WORKDIR /usr/src/crypto-explorer
COPY package.json /usr/src/crypto-explorer/package.json
RUN npm update && npm install && npm install -g grunt-cli
COPY . /usr/src/crypto-explorer
ADD config.js /usr/src/crypto-explorer/lib/config.js
RUN grunt build
CMD [ "npm", "start" ]	
EXPOSE 3000
EXPOSE 12401
