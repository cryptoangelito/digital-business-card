# Отчёт проверки — 24 октября 2026

Среда: Windows, Docker Desktop; Node.js 22.23.4 и PostgreSQL 16 в Linux-контейнерах. Локальные npm/Node.js не требуются.

| Проверка | Фактический результат |
|---|---|
| Установка по package-lock через npm ci | Успешно в Docker build |
| Prisma generate 6.19.3 | Успешно |
| TypeScript typecheck | Успешно |
| Production build | Успешно |
| Unit-тесты | 5/5 |
| GraphQL + PostgreSQL e2e | 7/7 |
| Повторный seed | Число строк не изменяется: 1 профиль, 7 навыков, 0 записей опыта, 2 проекта |
| SQL при запросе простых полей | 1 запрос |
| SQL при загрузке всех связей | Не более 4 запросов; проверено через Prisma query events |
| Ограничение уникальности навыков | Проверено: ожидаемая ошибка P2002 при попытке дублирования |
| Запрос работодателя | Успешен через реальный HTTP GraphQL и PostgreSQL |
| Apollo landing page | HTTP 200, HTML Apollo; визуальная работа embedded Sandbox в браузере не проверена (нет подключённого браузера) |
| npm audit --omit=dev | 0 уязвимостей |
| Docker Compose на пустом volume | Автоматически применены обе миграции и seed, API healthy |
| Перезапуск API и PostgreSQL | Контейнеры healthy; повторный smoke успешен |
| Логи рабочего API | Ошибок запуска/запросов не обнаружено |
| Публичный облачный endpoint | Пока не опубликован: необходим вход в Render |

## Команды, выполненные при проверке

```powershell
# Отдельная БД и тестовый образ
docker compose -p business-card-tests -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests
# Финальный код: 5 unit + 7 e2e, exit code 0

# Порт 3000 уже занят предыдущим экземпляром, поэтому проверка шла на 3001
$env:API_PORT="3001"
docker compose -p business-card-verification up --build -d --wait
docker compose -p business-card-verification exec -T api node scripts/smoke.mjs
docker compose -p business-card-verification restart
docker compose -p business-card-verification up -d --wait
docker compose -p business-card-verification exec -T api node scripts/smoke.mjs

# Удалён только созданный для этой проверки volume; затем повторён чистый старт
docker compose -p business-card-verification down -v
docker compose -p business-card-verification up --build -d --wait
```

## Известные предупреждения

- Nest Apollo 13 включает неиспользуемую зависимость Playground с peer requirement Apollo 4; runtime работает на Apollo 5 с Sandbox. Зависимость включена транзитивно, не вызывается приложением.
- Prisma 6 предупреждает о будущей смене конфигурации seed в major 7.
- При тесте уникальности PostgreSQL намеренно логирует duplicate key: это ожидаемая проверка ограничения, не ошибка рабочего API.
- Успешный npm audit означает отсутствие известных registry-уязвимостей на момент проверки, а не гарантию отсутствия любых дефектов.

Облачный URL, HTTPS, визуальную работу Sandbox и запрос после публикации необходимо проверить после авторизации Render. Платные ресурсы не создавались.