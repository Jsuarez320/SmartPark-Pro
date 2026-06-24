# Guía de Contribución

Gracias por contribuir a SmartPark Pro. Para mantener un código limpio y mantenible, sigue las directrices descritas a continuación.

## Flujo Git Recomendado
Utilizamos un enfoque de **Git Flow** simplificado:
- La rama `main` debe ser siempre estable y lista para producción.
- La rama `develop` es la rama de integración donde convergen las características.
- Para nuevas funcionalidades, crea ramas a partir de `develop`:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feature/nombre-de-la-funcionalidad
  ```

## Convenciones de Commits
Utilizamos [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
Formatos permitidos:
- `feat: agrega validación de placa` (Nuevas funcionalidades)
- `fix: corrige cálculo de tarifa nocturna` (Corrección de errores)
- `docs: actualiza readme` (Cambios de documentación)
- `refactor: optimiza consulta a base de datos` (Reestructuración sin cambiar lógica)
- `style: formatea componentes UI` (Cambios de estilo o linter)

## Estándares de Código

### Backend (Python)
- Seguir formato **PEP 8**.
- Tipado estricto (Type hints) es obligatorio. `def calcular(valor: float) -> float:`
- Variables en `snake_case`. Clases en `PascalCase`.
- **Regla estricta:** No mezclar capas. Un router no debe ejecutar queries de SQLAlchemy directamente. Pásalo por un Service.
- Usa Docstrings de Google para documentar clases y funciones.

### Frontend (React/TypeScript)
- Usa **TypeScript** obligatoriamente. No uses `any`.
- Variables, funciones y hooks en `camelCase`. Componentes React en `PascalCase`.
- Nombres de archivos de componentes deben ser `PascalCase` (Ej. `Button.tsx`).
- Usa **TailwindCSS** para estilado. No escribas CSS puro a menos que sea estrictamente necesario.
- Organiza el código por **Features** (en la carpeta `modules/`), no por tipo técnico. Es decir, los hooks de tarifas van en `modules/tarifas/hooks/`, no en un `hooks/` global.

## Buenas Prácticas
1. **Comenta el por qué, no el qué:** El código debe ser autodescriptivo. Usa comentarios solo para explicar decisiones arquitectónicas complejas o lógica de negocio intrincada.
2. **Pequeños Commits:** Un commit no debe contener cambios masivos en toda la aplicación. Sepáralos lógicamente.
3. **Pruebas (Testing):** (Por implementar). Todo servicio backend nuevo debería venir acompañado de un test unitario en Pytest.
