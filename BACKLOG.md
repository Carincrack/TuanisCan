# Backlog priorizado del MVP — TuanisCan

**Curso:** EIF-409 Aplicaciones Informáticas Globales
**Entrega:** Seguimiento de Proyecto Final #1 · Semana #5 (20/08/2026)
**Docente:** Ing. José Benavides Vargas

> Las fechas objetivo son estimadas asumiendo una semana por checkpoint desde la
> Semana #5. **Confirmarlas contra el cronograma oficial del curso antes de entregar.**
> Los responsables están en blanco a propósito: los asigna el equipo.

---

## Estado de las pantallas (evidencia del wireframe)

| Pantalla | Ruta | Estado |
|---|---|---|
| Login / Registro | — (gate previo al layout) | Maquetada |
| Panel general | `/` | Maquetada |
| Mis mascotas | `/mascotas` | Maquetada |
| Paseadores | `/paseadores` | Maquetada |
| Paseos | `/paseos` | Maquetada |
| Paseo en vivo | `/paseo-en-vivo` | Maquetada |
| Mascotas perdidas | `/mascotas-perdidas` | Maquetada |
| Directorio | `/directorio` | Maquetada |
| Pagos | `/pagos` | Maquetada |
| Reseñas | `/resenas` | Maquetada |

Todas navegan con datos de ejemplo. Ninguna tiene backend todavía — eso arranca en Seguimiento 2.

---

## Backlog

### Seguimiento 2 — fecha objetivo sugerida: 10/09/2026

Base funcional: sin esto no hay usuarios ni datos reales.

| # | Funcionalidad (MVP) | Responsable | Fecha objetivo | Checkpoint |
|---|---|---|---|---|
| 1 | Registro de usuario dueño con correo y contraseña | | 03/09 | Seguimiento 2 |
| 2 | Inicio de sesión y cierre de sesión con sesión persistente | | 03/09 | Seguimiento 2 |
| 3 | Registro de perfil de paseador con datos de contacto y zona | | 05/09 | Seguimiento 2 |
| 4 | Registro de mascota (nombre, especie, raza, edad, peso, zona) | | 08/09 | Seguimiento 2 |
| 5 | Edición y eliminación de una mascota registrada | | 10/09 | Seguimiento 2 |
| 6 | Listado de mascotas del usuario desde base de datos | | 10/09 | Seguimiento 2 |

### Seguimiento 3 — fecha objetivo sugerida: 01/10/2026

Núcleo del negocio: agendar un paseo de punta a punta.

| # | Funcionalidad (MVP) | Responsable | Fecha objetivo | Checkpoint |
|---|---|---|---|---|
| 7 | Listado de paseadores con filtro por zona | | 17/09 | Seguimiento 3 |
| 8 | Búsqueda de paseador por nombre | | 17/09 | Seguimiento 3 |
| 9 | Ficha de detalle de un paseador | | 22/09 | Seguimiento 3 |
| 10 | Agendar paseo (mascota, paseador, fecha, hora, duración) | | 26/09 | Seguimiento 3 |
| 11 | Listado de paseos próximos e historial del usuario | | 29/09 | Seguimiento 3 |
| 12 | Cancelar un paseo agendado | | 01/10 | Seguimiento 3 |

### Seguimiento 4 — fecha objetivo sugerida: 22/10/2026

Diferenciadores del producto.

| # | Funcionalidad (MVP) | Responsable | Fecha objetivo | Checkpoint |
|---|---|---|---|---|
| 13 | Seguimiento de paseo en vivo con ubicación en mapa | | 08/10 | Seguimiento 4 |
| 14 | Bitácora de eventos del paseo (inicio, fotos, fin) | | 13/10 | Seguimiento 4 |
| 15 | Reportar mascota perdida con señas, zona y contacto | | 15/10 | Seguimiento 4 |
| 16 | Listado público de mascotas perdidas con filtro por zona | | 17/10 | Seguimiento 4 |
| 17 | Marcar reporte de mascota perdida como encontrada | | 20/10 | Seguimiento 4 |
| 18 | Directorio de comercios con filtro por categoría | | 22/10 | Seguimiento 4 |

### Seguimiento 5 — fecha objetivo sugerida: 05/11/2026

Cierre del ciclo: cobro y confianza.

| # | Funcionalidad (MVP) | Responsable | Fecha objetivo | Checkpoint |
|---|---|---|---|---|
| 19 | Registrar método de pago del usuario | | 27/10 | Seguimiento 5 |
| 20 | Cobro de un paseo completado y cambio de estado a pagado | | 30/10 | Seguimiento 5 |
| 21 | Historial de movimientos de pago con filtro por estado | | 30/10 | Seguimiento 5 |
| 22 | Calificar un paseo terminado con estrellas y comentario | | 03/11 | Seguimiento 5 |
| 23 | Promedio de calificación visible en la ficha del paseador | | 05/11 | Seguimiento 5 |

---

## Fuera del MVP

Se dejan documentados para que no se cuelen como alcance sin decisión explícita.

- Pasarela de pago real (SINPE / tarjeta con procesador)
- Chat en tiempo real entre dueño y paseador
- Notificaciones push
- Aplicación móvil nativa
- Panel de administración para el comercio del directorio
- Programa de recompensas por mascota encontrada

---

## Enlaces de entrega

| Recurso | Enlace |
|---|---|
| Repositorio | _pegar URL de GitHub_ |
| Tablero de tareas | _pegar URL de Trello / GitHub Projects_ |

## Retroalimentación de la Defensa de propuesta

_1–2 líneas indicando qué pidió el docente y dónde se refleja. Ejemplo del formato esperado:_

> El docente pidió delimitar el alcance porque los módulos eran solo nombres.
> El wireframe ahora incluye las 10 pantallas centrales navegables y el backlog
> divide cada módulo en funcionalidades verificables por separado, asignadas a un
> checkpoint concreto.
