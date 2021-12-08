# pull official base image
FROM node:16.13.0-alpine

# set working directory
WORKDIR /dashboard

# add `/app/node_modules/.bin` to $PATH
ENV PATH /dashboard/node_modules/.bin:$PATH

# install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent
# RUN npm install react-scripts@3.4.1 -g --silent

EXPOSE 3000

# add app
COPY . ./
RUN npm run build

# start app
CMD ["npm", "start"]