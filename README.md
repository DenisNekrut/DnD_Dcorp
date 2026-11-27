# DnD_Dcorp

## Текущая публикация

Сейчас frontend публикуется через GitHub Pages:

https://denisnekrut.github.io/DnD_Dcorp/

Workflow `.github/workflows/deploy-pages.yml` собирает сайт после изменений в `main`. Для подключения API в настройках репозитория GitHub Actions должна быть задана переменная `VITE_API_URL` с адресом API. Для GitHub Pages Vite использует базовый путь `/DnD_Dcorp/`.

API размещается отдельно. Для текущего адреса frontend в настройках API должны быть:
- `WEB_ORIGIN=https://denisnekrut.github.io`
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none`

Авторизация использует HttpOnly Cookie `dnd_session`, запросы выполняются с `credentials: include`. Для разных доменов требуется `SameSite=None; Secure`. При этом некоторые мобильные браузеры могут ограничивать сторонние Cookie, поэтому устойчивость входа на GitHub Pages зависит от политики конкретного браузера. Перенос frontend и API на один сайт пока не выполняется.

## Будущий вариант размещения

Файл `render.yaml` содержит подготовленный вариант Render Blueprint для будущего переноса frontend, API и базы данных на общую платформу. Само наличие файла не запускает перенос. Не импортируй Blueprint, пока не решено перейти на Render.

## Разработка

- Frontend: React + Vite + TypeScript.
- API: NestJS + Prisma + PostgreSQL.
- Игровые механики: правила D&D 5e.
- Интерфейс: тёмная древесная тема портала и песочная тема игрового стола.

Не публикуй секреты и реальные значения переменных окружения в репозитории.
