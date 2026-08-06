# Pantallas

## Login (`/login`)

- Propósito: autenticar operador.
- Componentes: logo 64px (Car + sombra brand/20), título, card `rounded-2xl` con Input usuario/contraseña, toggle mostrar password, banner de error (`role="alert"`), botón submit full-width con spinner.
- Flujo: 2 campos → submit → redirige por rol.
- Complejidad: baja. UX: buena (autofocus, autoComplete, error se limpia al editar).
- Problemas: ícono del toggle en `text-subtle` (bajo contraste), error genérico no distingue usuario vs servidor, logo con `text-white` subóptimo en dark.

## Dashboard / Panel de Control (`/`, `/dashboard` — admin)

- Propósito: resumen del parqueadero.
- Componentes: 4 KPIs (Vehículos en patio, Ingresos hoy, Clientes mensuales, Tiempo promedio), 2 tarjetas (Ocupación, Transacciones Recientes).
- Flujo: home del admin.
- Complejidad: baja (estática).
- Problemas: todo placeholder ("Conecta la API", `—`, `$0`), ícono ingresos green-600 hardcode, sin gráfica de ocupación.

## Registro de Ingreso (`/` — home employee)

- Propósito: registrar entrada de vehículo (flujo primario).
- Componentes: input placa (h-12, mono, uppercase, maxLength 10), Select tipo, input marca, tarjetas de opción de pago (Mensualidad/Pago Diario), calculadora "Total a Pagar" en vivo, botón "Registrar Entrada", modal AlertaRegistro con impresión.
- Flujo: placa → tipo/marca → opción de pago → precio en vivo → registrar → modal éxito → imprimir; el form se limpia.
- Complejidad: media. **Mejor pantalla del sistema.**
- Problemas: Select dropdown defectuoso, sin control UI para "Día especial/Evento" (existe en lógica), modal sin focus trap, sin validación de formato de placa, Total `—` si la API falla sin explicación.

## Gestión de Vehículos (`/vehiculos` — admin)

- Propósito: listar placas y clientes mensuales.
- Componentes: 2 KPIs (border-l-4), tabla de placas con buscador, 4 tarjetas de estado mensuales, tabla de mensuales.
- Flujo: datos reales vía API (3 llamadas); búsqueda local por placa.
- Complejidad: media.
- Problemas: KPIs con patrón distinto al resto, `m.estado` impreso crudo, filtro rígido (`includes`), sin paginación, error silencioso (parece "sin datos"), contador mezcla filtrados/totales, import de Button sin uso.

## Cobrar Salida (`/pago` — admin + employee)

- Propósito: cobrar la salida de un vehículo en patio.
- Componentes: contador "En patio", buscador, tarjetas de vehículo (ícono, placa, ingreso, tiempo, monto, botón Cobrar), PagoModal (métodos Efectivo/Tarjeta/Nequi, montos rápidos +5/10/20/50k, "Exacto", cambio, recibo termal + imprimir).
- Flujo: buscar → Cobrar → método → monto → pagar → recibo → imprimir.
- Complejidad: media-alta (modal más complejo).
- Problemas: datos simulados (vehículos hardcodeados), tarifa fija $3.200 y 800ms fake en `useReceipt`, montosRápidos acumulativos, sin validación monto ≥ total, modal sin focus trap.

## Caja (`/caja` — admin + employee)

- Propósito: resumen de dinero y cierre de caja.
- Componentes: 3 KPIs (Dinero en caja, Ingresos del día, Entregado hoy); employee además tarjeta "Cierre de Caja"; admin además 2 KPIs (Carros/Motos), "Historial de Ingresos" con filtros de periodo (botones raw), desglose y "Transacciones Recientes".
- Flujo: ver resumen → Cerrar Caja → modal de confirmación (sin efecto).
- Complejidad: media (contenido condicionado por rol).
- Problemas: todo cero/placeholder, periodos sin estado activo funcional, desglose con colores inconsistentes, "Cerrar Caja" no hace nada al confirmar.

## Configuración (`/configuracion` — admin)

- Propósito: editar tarifas y activar evento del día.
- Componentes: botón "Editar Tarifas" (toggle), columnas Moto/Carro con inputs de tarifa ($, disabled en lectura), "Guardar Cambios", aviso de reimpresión (placa `0101`), toggle de evento.
- Flujo: Editar → cambiar valores → Guardar (sin efecto).
- Complejidad: baja-media.
- Problemas: "Guardar" sin onClick, valores hardcodeados sin API, "Cancelar" usa variante destructive, sin confirmación de descarte, evento sin confirmación.
