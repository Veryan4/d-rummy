FROM node:14 as builder

WORKDIR /app
COPY ./package.json /app

RUN npm i

COPY ./ /app

RUN npm run build-production

FROM fholzer/nginx-brotli:v1.18.0

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

COPY ./nginx/frontend.conf /etc/nginx/conf.d/frontend.conf
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

CMD ["nginx"]