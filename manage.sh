#!/bin/bash

# Скрипт управления Wiremock Manager

set -e

COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="wiremock-manager"

show_help() {
    echo "Использование: $0 [КОМАНДА]"
    echo ""
    echo "Команды:"
    echo "  build       - Сборка Docker образа"
    echo "  start       - Запуск сервиса"
    echo "  stop        - Остановка сервиса"
    echo "  restart     - Перезапуск сервиса"
    echo "  logs        - Просмотр логов"
    echo "  status      - Статус сервиса"
    echo "  clean       - Остановка и удаление контейнеров"
    echo "  rebuild     - Полная пересборка (clean + build + start)"
    echo "  help        - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 build      # Собрать образ"
    echo "  $0 start      # Запустить сервис"
    echo "  $0 logs       # Посмотреть логи"
}

build_image() {
    echo "🔨 Сборка Docker образа..."
    docker-compose -f $COMPOSE_FILE build
    echo "✅ Образ собран успешно"
}

start_service() {
    echo "🚀 Запуск Wiremock Manager..."
    docker-compose -f $COMPOSE_FILE up -d
    echo "✅ Сервис запущен"
    echo "🌐 Веб-интерфейс: http://localhost"
    echo "🔌 API Wiremock: http://localhost:8080"
}

stop_service() {
    echo "⏹️ Остановка сервиса..."
    docker-compose -f $COMPOSE_FILE stop
    echo "✅ Сервис остановлен"
}

restart_service() {
    echo "🔄 Перезапуск сервиса..."
    docker-compose -f $COMPOSE_FILE restart
    echo "✅ Сервис перезапущен"
}

show_logs() {
    echo "📋 Логи сервиса:"
    docker-compose -f $COMPOSE_FILE logs -f $SERVICE_NAME
}

show_status() {
    echo "📊 Статус сервиса:"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    echo "🏥 Healthcheck:"
    docker inspect --format='{{.State.Health.Status}}' wiremock-manager 2>/dev/null || echo "Healthcheck недоступен"
}

clean_all() {
    echo "🧹 Очистка контейнеров и образов..."
    docker-compose -f $COMPOSE_FILE down --rmi local --volumes --remove-orphans
    echo "✅ Очистка завершена"
}

rebuild_all() {
    echo "🔄 Полная пересборка..."
    clean_all
    build_image
    start_service
}

# Проверка наличия docker и docker-compose
check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker не установлен"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose не установлен"
        exit 1
    fi
    
    # Проверяем наличие config.json
    if [ ! -f "config.json" ]; then
        echo "⚠️  Файл config.json не найден"
        if [ -f "config.json.template" ]; then
            echo "📋 Создаю config.json из шаблона..."
            cp config.json.template config.json
            echo "✅ config.json создан из шаблона"
            echo "💡 Отредактируйте config.json при необходимости"
        else
            echo "❌ Шаблон config.json.template не найден"
            echo "📝 Создайте файл config.json с настройками:"
            echo '{"serverUrl": "http://localhost"}'
            exit 1
        fi
    fi
}

# Основная логика
main() {
    check_requirements
    
    case "${1:-help}" in
        build)
            build_image
            ;;
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        clean)
            clean_all
            ;;
        rebuild)
            rebuild_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "❌ Неизвестная команда: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
