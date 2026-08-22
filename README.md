# Numbers Don't Lie ⚽📊

App web mobile-first para gestionar estadísticas de partidos de fútbol (futsal) semanales con formato "Rey de la Cancha".

## 🚀 Stack Tecnológico

- **Backend**: NestJS, PostgreSQL, Prisma ORM, Passport JWT, class-validator
- **Frontend**: React, TypeScript, Vite, Tailwind CSS (Mobile-first, Dark Theme)
- **Base de Datos**: PostgreSQL 18
- **Despliegue**: Docker / Docker Compose / Coolify

---

## 🛠️ Ejecución Local

### 1. Requisitos
- Node.js >= 20
- npm >= 10

### 2. Backend
```bash
cd backend
npm install
# Asegúrate de tener .env configurado con DATABASE_URL y JWT_SECRET
npm run start:dev
```
API corriendo en `http://localhost:3000/api`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend corriendo en `http://localhost:5173`.

---

## 🐳 Despliegue con Docker / Coolify

El proyecto incluye `docker-compose.yml` y `Dockerfile` independientes para backend y frontend:

```bash
docker compose up --build -d
```

### Variables de entorno necesarias en el Backend:
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Llave secreta para firmar tokens JWT
- `JWT_EXPIRES_IN`: Tiempo de expiración (ej: `7d`)
- `PORT`: Puerto (default `3000`)
- `FRONTEND_URL`: URL del frontend para CORS (ej: `http://localhost:5173` o tu dominio público)

---

## ⚽ Características Clave

1. **Gestión de Grupos y Códigos de Invitación**: Auto-generados y personalizables con regeneración segura.
2. **Jornadas Recurrentes**: Programación semanal y cancelación flexible de jornadas individuales.
3. **Carga Rápida "Silbatazo Final"**: Registro de estadísticas en segundos diferenciando **Equipo Oficial** vs **Otros** (comodín).
4. **Métricas Fijas**: Goles ⚽, Asistencias 👟, Goles cantados fallados ❌, Autogoles 🤦, Balones afuera 🚀.
5. **Leaderboard**: Rankings de jugadores, posiciones por equipos y estadísticas graciosas.
6. **Permisos y Auditoría**:
   - **Jugador**: Carga y edita sus propias estadísticas.
   - **Capitán**: Puede editar estadísticas de jugadores de su equipo en contexto oficial.
   - **Organizador**: Control total del grupo, jornadas y estadísticas.
