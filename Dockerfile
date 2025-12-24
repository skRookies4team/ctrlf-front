FROM nginx:stable-alpine
# 빌드된 결과물 복사
COPY ./dist /usr/share/nginx/html
# 위에서 만든 설정 파일 적용
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]