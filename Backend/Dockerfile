# 1. Imagen base: Python 3.11 slim (liviana, sin herramientas innecesarias)
FROM python:3.11-slim

# 2. Directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar SOLO requirements.txt primero (clave para el cache de Docker)
COPY requirements.txt .

# 4. Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar el resto del código del backend
COPY . .

# 6. Puerto que expone FastAPI/uvicorn
EXPOSE 8000

# 7. Comando de arranque
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]