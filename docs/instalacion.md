# Guía de Instalación y Configuración

Sigue estos pasos para configurar el entorno de desarrollo de SmartPark Pro.

## Requisitos
- [Node.js](https://nodejs.org/en/) (v18+)
- [Python](https://www.python.org/) (v3.10+)
- [Docker](https://www.docker.com/) y Docker Compose
- `npm` o `pnpm`

## Variables de Entorno
En la raíz del proyecto, crea un archivo `.env` utilizando los siguientes valores (puedes ajustarlos):
```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=smartpark_pro
```

## Ejecución Local (Con Docker - Recomendado)
La manera más rápida de levantar todos los servicios de forma orquestada es mediante `docker-compose`:
```bash
docker-compose up --build
```
Esto levantará:
- **db**: PostgreSQL en el puerto 5432.
- **backend**: FastAPI en el puerto 8000.
- **frontend**: Vite/React en el puerto 5173.

## Instalación Manual Frontend
Si deseas desarrollar únicamente en el frontend localmente (asumiendo que Backend está levantado en Docker):

1. Ingresa a la carpeta Frontend:
   ```bash
   cd Frontend
   ```
2. Instala las dependencias (se recomienda `npm` o `pnpm`):
   ```bash
   npm install
   ```
3. Ejecuta el entorno de desarrollo (React + Electron en modo dev):
   ```bash
   npm run dev
   ```

## Instalación Manual Backend
Si deseas correr FastAPI localmente sin Docker para debugging:

1. Ingresa a la carpeta Backend:
   ```bash
   cd Backend
   ```
2. Crea un entorno virtual:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/Mac
   source .venv/bin/activate
   ```
3. Instala los requerimientos:
   ```bash
   pip install -r requirements.txt
   ```
4. Levanta el servidor uvicorn:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.1 --port 8000
   ```

## Configuración PostgreSQL
El contenedor de Docker inicializa la base de datos automáticamente usando los datos del `.env`. 
Las migraciones de SQLAlchemy deben ser ejecutadas usando Alembic:
```bash
# Dentro del contenedor o en entorno virtual
alembic upgrade head
```
*(Nota: Actualmente no hay migraciones pendientes de modelos)*.

## Solución de Problemas Comunes

- **Error de conexión a la base de datos desde Backend:** Verifica que el contenedor `smartpark_db` esté en estado `healthy`. FastAPI tiene una condición de espera configurada en docker-compose, pero si levantas manualmente, asegúrate de cambiar `localhost` en `database_url` de `config.py` si es necesario.
- **Error CORS al conectar Frontend con Backend:** Asegúrate que en `config.py`, la variable `backend_cors_origins` contenga el puerto exacto (ej. `http://localhost:5173`).
- **Problemas compilando Electron:** En Windows asegúrate de ejecutar terminales como Administrador si fallan scripts post-instalación de node-gyp.
