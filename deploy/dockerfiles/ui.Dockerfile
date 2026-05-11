FROM nginx:1.27-alpine

COPY services/ui /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
