# Referencia de la API

Este documento detalla los endpoints RESTful expuestos por el Backend (FastAPI).

*Nota: Actualmente el proyecto está en Fase 1, por lo que **solo el endpoint `/health` existe en código**. El resto se encuentra catalogado como **"Pendiente de Implementar"** basado en la arquitectura definida.*

## Resumen de Endpoints

| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| `GET` | `/health` | Verifica estado de la API | **Implementado** |
| `POST` | `/api/v1/auth/login` | Login de usuario | Pendiente |
| `POST` | `/api/v1/operaciones/ingreso`| Ingreso de vehículo | Pendiente |
| `PUT` | `/api/v1/operaciones/salida` | Salida y cálculo tarifa | Pendiente |

---

## Módulo Base

### Nombre del Endpoint: Health Check

Verifica que el servicio backend esté levantado y respondiendo.

#### Método
`GET`

#### Ruta
`/health`

#### Descripción
Retorna un simple JSON para comprobaciones de balanceadores de carga o Docker Healthcheck.

#### Parámetros
Ninguno.

#### Request Body
Ninguno.

#### Response
```json
{
  "status": "ok"
}
```

#### Posibles errores
- `500 Internal Server Error`: Si el servidor no puede procesar el evento.

#### Ejemplo de uso
```bash
curl -X GET http://localhost:8000/health
```

---

## Módulo Operaciones (Pendiente de Implementar)

### Nombre del Endpoint: Registrar Ingreso

#### Método
`POST`

#### Ruta
`/api/v1/operaciones/ingreso`

#### Descripción
[Pendiente de Documentar - Lógica y validaciones aún no programadas]

#### Parámetros
Ninguno (se usa Body).

#### Request Body
[Pendiente de Documentar] - Se espera Placa y Tipo de vehículo.

#### Response
[Pendiente de Documentar]

#### Posibles errores
- `400 Bad Request`
- `422 Unprocessable Entity`

#### Ejemplo de uso
[Pendiente de Documentar]
