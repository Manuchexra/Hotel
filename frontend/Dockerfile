FROM nginx:alpine

RUN rm -rf /etc/nginx/conf.d

COPY nginx.conf /etc/nginx/nginx.conf

# Staff paneli → /usr/share/nginx/html/staff
COPY index.html  /usr/share/nginx/html/staff/index.html
COPY js/         /usr/share/nginx/html/staff/js/
COPY css/        /usr/share/nginx/html/staff/css/
COPY assets/     /usr/share/nginx/html/staff/assets/

# Guest paneli → /usr/share/nginx/html/guest
COPY guest/      /usr/share/nginx/html/guest/

EXPOSE 80 81
