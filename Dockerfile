FROM fholzer/nginx-brotli:v1.18.0

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

COPY  ./dist /usr/share/nginx/html

EXPOSE 80

COPY ./nginx/frontend.conf /etc/nginx/conf.d/frontend.conf
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

CMD ["nginx"]