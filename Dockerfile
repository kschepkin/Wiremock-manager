# Многоэтапная сборка для объединения Wiremock и веб-интерфейса
FROM nginx:alpine as web-stage

# Устанавливаем рабочую директорию для веб-файлов
WORKDIR /usr/share/nginx/html

# Копируем статические файлы веб-интерфейса
COPY index.html .
COPY logs.html .
COPY script.js .
COPY logs.js .
# config.json будет подключен как внешний том
COPY favicon.ico .

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Финальный образ на основе Wiremock
FROM wiremock/wiremock:latest

# Устанавливаем nginx для обслуживания веб-интерфейса
USER root
RUN apt-get update && apt-get install -y nginx wget && rm -rf /var/lib/apt/lists/*

# Создаем директорию для веб-файлов
RUN mkdir -p /usr/share/nginx/html

# Копируем веб-файлы из предыдущего этапа
COPY --from=web-stage /usr/share/nginx/html /usr/share/nginx/html
COPY --from=web-stage /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Исправляем права доступа к веб-файлам
RUN chmod -R 644 /usr/share/nginx/html/* && chmod 755 /usr/share/nginx/html

# Создаем директории для Wiremock данных
RUN mkdir -p /home/wiremock/mappings
RUN mkdir -p /home/wiremock/__files

# Создаем скрипт запуска для одновременного запуска nginx и wiremock
RUN cat > /start.sh << 'EOF'
#!/bin/bash

# Запускаем nginx в фоновом режиме
nginx -g "daemon off;" &

# Запускаем Wiremock (используем правильный класс)
exec java $JAVA_OPTS -cp /var/wiremock/lib/*:/var/wiremock/extensions/* wiremock.Run --port 8080 --global-response-templating --local-response-templating $WIREMOCK_OPTIONS
EOF

RUN chmod +x /start.sh

# Остаемся под root (как в базовом образе Wiremock)

# Экспонируем порты
EXPOSE 80 8080

# Точка входа
ENTRYPOINT ["/start.sh"]
