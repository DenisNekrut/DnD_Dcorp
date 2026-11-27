# DnD_Dcorp

## Развёртывание

Проект разворачивается через Render Blueprint из `render.yaml`:
- `dnd-dcorp-web` — React/Vite frontend (Static Site).
- `dnd-dcorp-api` — NestJS API.
- `dnd-dcorp-db` — PostgreSQL.

Импортируй репозиторий в Render через **New → Blueprint** и подтверди создание ресурсов. После первого развёртывания проверь, что публичный адрес Static Site совпадает с `WEB_ORIGIN` в API. Если Render назначит другой адрес, обнови `WEB_ORIGIN` в настройках API и запусти redeploy.

GitHub остаётся источником кода. Коммиты в `main` запускают автоматическую сборку и публикацию обоих сервисов.

## Авторизация и мобильные браузеры

- Вход и регистрация устанавливают HttpOnly Cookie `dnd_session`.
- JWT не передаётся в JavaScript и не хранится в localStorage/sessionStorage.
- API-запросы отправляются с `credentials: include`.
- Cookie защищена флагами `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Срок Cookie и JWT — 30 дней.
- Frontend и API используют поддомены `onrender.com`, поэтому браузер рассматривает их как один site для SameSite-политики, при этом CORS разрешает только точный адрес frontend.

После деплоя проверь вход, обновление страницы, закрытие/повторное открытие браузера и выход из аккаунта на телефоне. Гостевой режим продолжает хранить локальные данные в браузере устройства.

## Переменные API

Обязательные: `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN`.
Cookie: `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `JWT_EXPIRES_IN=30d`.
Frontend: `VITE_API_URL=https://dnd-dcorp-api.onrender.com`.

Не публикуй секреты и реальные значения переменных окружения в репозитории.
