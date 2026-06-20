# SmartPark Pro - Arquitectura

Este repositorio queda preparado como monorepo con dos superficies principales:

- `Frontend/`: aplicacion de escritorio con Electron, React y TypeScript.
- `Backend/`: API y logica de negocio con FastAPI, SQLAlchemy y PostgreSQL.

Este documento define la arquitectura esperada sin incluir implementacion de codigo.

## Frontend

La arquitectura frontend es modular y basada en features. Cada modulo debe ser autocontenido:

- `components/`: componentes visuales propios del modulo.
- `hooks/`: coordinacion entre UI, estado remoto y servicios.
- `services/`: llamadas HTTP del modulo.

Modulos definidos:

- `vehiculos`
- `tarifas`
- `espacios`
- `caja`
- `operaciones`
- `turnos`
- `reportes`

Carpetas compartidas:

- `shared/components/ui/`: componentes base reutilizables.
- `shared/utils/`: utilidades puras compartidas.
- `shared/api/`: cliente HTTP compartido.
- `layout/`: estructura visual general.
- `pages/`: pantallas ensambladoras.
- `stores/`: estado global.
- `router/`: definicion de rutas.

### Reglas de dependencia frontend

Permitido:

- Modulo hacia `shared/`.
- Modulo hacia `stores/`.
- `pages/` hacia modulos mediante sus puntos publicos.
- `pages/` hacia `shared/`.

No permitido:

- Un modulo importando otro modulo directamente.
- `shared/` importando modulos.
- Componentes llamando servicios directamente.

## Backend

La arquitectura backend es por capas:

- `routers/`: endpoints HTTP y validacion de entrada/salida.
- `services/`: reglas de negocio.
- `repositories/`: acceso a datos.
- `models/`: entidades ORM.
- `schemas/`: DTOs de entrada y respuesta.
- `core/`: configuracion, base de datos, seguridad y dependencias.

### Regla de dependencia backend

La direccion permitida es:

`routers -> services -> repositories -> models`

No se deben saltar capas. En particular, los routers no deben acceder directamente a repositories ni models.

## Fases

1. Base del proyecto.
2. Modulos core.
3. Flujo principal.
4. Operaciones, turnos, auth y reportes.
5. Empaquetado de escritorio.

Cada fase debe cerrarse con validacion antes de avanzar a la siguiente.
