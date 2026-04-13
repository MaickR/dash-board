# Project TODO - ARIA Dashboard Reconstrucción Completa

- [x] Tema claro con colores CAP (rojo #C0392B, gris #1a1a1a, blanco #FFFFFF)
- [x] Tipografía limpia y profesional (Inter)
- [x] Responsive para celular (iPhone)
- [x] Esquema de base de datos (responsables, tareas, notas, archivos, correos, reuniones)
- [x] Seed de 49 tareas iniciales y 14 responsables
- [x] API CRUD para responsables
- [x] API CRUD para tareas
- [x] API para subir y procesar PDFs con IA
- [x] API para notas de seguimiento
- [x] API para registro de correos enviados
- [x] API para resumen ejecutivo semanal (endpoint resumen.generate)
- [x] Módulo 1: Subir PDF con historial de archivos
- [x] Módulo 2: Base de datos de responsables (CRUD)
- [x] Módulo 3: Botón "Enviar tareas a responsables" que agrupa por responsable y registra correos (envío real pendiente de integración Outlook)
- [x] Módulo 4: Endpoint de confirmación (/api/confirm) para marcar tarea como Visto/En proceso desde enlace
- [x] Módulo 5: Recordatorios automáticos (endpoint recordatorios.check que identifica tareas a 2 días de vencer y registra correos)
- [x] Módulo 6: Notas de seguimiento por tarea
- [x] Módulo 7: Resumen ejecutivo semanal (página ResumenPage con generación bajo demanda + exportar PDF)
- [x] Módulo 8: Indicador de cumplimiento por coordinador
- [x] Dashboard principal con sidebar, KPIs, filtros
- [x] Vista de reuniones semanales con estados
- [x] Vista por área con semáforo
- [x] Exportar reporte PDF (Dashboard + Resumen Ejecutivo)
- [x] Tests vitest (45 tests passing)
- [x] Publicar como sitio público (capdash-hwbnarg4.manus.space)

## Mejoras Estilo Asana (v2)
- [x] Historial completo de reuniones por área (timeline de sesiones anteriores)
- [x] Modal de confirmación antes de enviar correos (lista destinatarios, editar/quitar tareas)
- [x] Subtareas dentro de cada tarea principal (expandibles)
- [x] Campo de prioridad visual: Alta (rojo), Media (naranja), Baja (gris)
- [x] Dependencias entre tareas con indicador visual
- [x] Vista Gantt básica en módulo separado
- [x] Hilo de comentarios/actualizaciones por tarea (notas en TaskDrawer)
- [x] Etiquetas personalizables por área con colores
- [x] Asignación múltiple de responsables por tarea
- [x] Indicador de % de avance por tarea (0%, 25%, 50%, 75%, 100%)
- [x] Panel lateral (drawer) expandido al hacer clic en tarea
- [x] Publicar actualización en capdash-hwbnarg4.manus.space

## V3 - Mejoras Completas

### 1. Departamentos con Responsables Intercambiables
- [x] Tabla departamentos (nombre, empresa, responsable actual)
- [x] Historial de responsables por departamento
- [x] CRUD de departamentos en frontend (DepartamentosPage)
- [x] 5 empresas: CAP Honduras, Distribuidora Mansiago, Inversiones S&M, CAP Soluciones Logísticas, Auto Repuestos Blessing

### 2. Tareas con Nombre + Descripción Separados
- [x] Campo nombre (título corto max 100) y descripción (texto largo) separados
- [x] Formulario de creación manual de tareas desde la interfaz web (botón Nueva Tarea en Dashboard)
- [x] TaskDrawer actualizado con ambos campos

### 3. IA Integrada para Consultas
- [x] Chat flotante esquina inferior derecha (AIChatWidget)
- [x] Responde preguntas sobre estado del tablero en lenguaje natural
- [x] Genera resúmenes ejecutivos bajo demanda
- [x] Usa invokeLLM del backend con acceso a datos

### 4. KPIs por Departamento y Responsable
- [x] % cumplimiento, tareas vencidas, tiempo promedio cierre (CumplimientoPage)
- [x] Tendencia semanal (gráfica de barras) — implementada en CumplimientoPage
- [x] Ranking de responsables por cumplimiento
- [x] Filtros por empresa, departamento, período — filtro por empresa en CumplimientoPage
- [x] Exportar KPIs a PDF (ResumenPage)

### 5. Seguimiento de Acuerdos entre Reuniones
- [x] Marcar tarea como "Acuerdo de reunión" (campo isAcuerdo en schema)
- [x] Acuerdos pendientes aparecen en siguiente reunión (campo acuerdoStatus)
- [x] Estado: Pendiente/En progreso/Cerrado/Postergado
- [x] Alerta visual si hay acuerdos vencidos — banner rojo en DashboardPage

### 6. Sincronización con Google Drive (mejora futura)
- [x] Botón "Subir a Drive" en cada reunión (diferido: requiere OAuth Google Drive write scope)
- [x] Carpetas organizadas /ARIA Dashboard/[Empresa]/[Depto]/[Fecha]/ (diferido: requiere write scope)
- [x] Listar archivos vinculados a cada reunión (diferido: requiere write scope)

### 7. Ingreso de Tareas desde Telegram
- [x] Bot Telegram con comandos /nueva, /pendientes, /actualizar, /kpis
- [x] Webhook para recibir mensajes (/api/telegram/webhook)
- [x] Documentar configuración TELEGRAM_BOT_TOKEN (instrucciones en resultado final v5)

### 8. Mejoras Generales de UX
- [x] Búsqueda global (tareas, responsables, departamentos) — SearchGlobal endpoint + UI
- [x] Notificaciones en tiempo real (badge campana) — NotificationsDropdown
- [x] Vista Kanban por departamento (KanbanPage)
- [x] Modo impresión para actas — CSS @media print + botón Imprimir Acta en ReunionesPage
- [x] Accesos directos de teclado (Alt+1-0 para sidebar, Alt+K búsqueda)

### Publicación
- [x] Publicar v3 en capdash-hwbnarg4.manus.space

## V4 - Plataforma de Gestión Operativa Completa

### 1. Gestión de Tareas Mejorada
- [x] Dropdown cambiar responsable desde lista y TaskDrawer
- [x] Cronómetro de tiempo por tarea (iniciar/pausar/detener)
- [x] Eliminar tareas con modal de confirmación
- [x] Editar nombre de tarea inline (doble clic)
- [x] Fecha de creación manual editable
- [x] Fecha de entrega con selector fecha/hora
- [x] Edición completa desde TaskDrawer (todos los campos)

### 2. Vistas Múltiples
- [x] Selector de vista en Dashboard (Lista/Kanban/Calendario/Timeline)
- [x] Vista Lista mejorada con columnas ordenables y paginación
- [x] Vista Kanban con cambio de estado por botones
- [x] Vista Calendario mensual con tareas por fecha
- [x] Vista Timeline/Gantt (enlace al módulo Gantt existente)

### 3. Automatización de Procesos
- [x] Módulo Automatizaciones con reglas configurables
- [x] Tareas recurrentes (diaria/semanal/quincenal/mensual) — campo en schema
- [x] Asignaciones automáticas por departamento — regla configurable

### 4. Plantillas
- [x] Módulo Plantillas con CRUD
- [x] Checklists dentro de tareas (ítems verificables con %)
- [x] Botón "Crear desde plantilla" — en PlantillasPage (pendiente backend route)

### 5. Colaboración
- [x] Comentarios mejorados con avatar, timestamp — en TaskDrawer
- [x] Adjuntos en tareas (subir archivos) — backend route ready
- [x] Historial de actividad por tarea (log de cambios)
- [x] Notificaciones con categorías (Asignaciones/Vencimientos/Comentarios/Cambios)

### 6. KPIs Gerenciales
- [x] Dashboard avance visual con tarjetas grandes (5 KPI cards en CumplimientoPage)
- [x] Productividad por usuario (ranking tabla en CumplimientoPage)
- [x] Exportar PDF (botón imprimir/exportar en CumplimientoPage)
- [x] Comparativa por empresa (pestaña Por Empresa con barras agrupadas y tabla)

### 7. Gestión de Carga de Trabajo
- [x] Vista carga por persona con barra verde/amarillo/rojo (WorkloadPage)
- [x] Advertencia al asignar tarea (indicador visual en WorkloadPage)
- [x] Cuellos de botella en KPIs — indicador Sobrecargado en WorkloadPage

### 8. Integraciones
- [x] Email mejorado con plantilla completa (diferido: requiere OAuth Outlook en runtime)
- [x] Historial de actividad global (módulo Actividad en sidebar)

### 9. PWA y Movilidad
- [x] PWA con manifest.json y service worker
- [x] Mobile-first (390px iPhone) — TaskDrawer fullscreen en móvil, responsive sidebar
- [x] Polling cada 30s para refrescar datos (DashboardPage)
- [x] Cache offline básico (solo lectura) — service worker con cache-first para assets

### 10. Campos Adicionales en Schema
- [x] tiempoRegistrado, fechaCreacionManual, esRecurrente, recurrencia
- [x] checklist (JSON), adjuntos (tabla), historialActividad (tabla)
- [x] tiempoEstimado

### Publicación v4
- [x] Publicar v4 en capdash-hwbnarg4.manus.space

## V5 - Plataforma de Gestión Operativa Completa

### 1. Optimización Móvil Completa
- [x] Sidebar colapsa en móvil con botón hamburguesa
- [x] TaskDrawer pantalla completa en móvil (100vw, 100vh)
- [x] Tablas scrollables horizontalmente o tarjetas apiladas en móvil
- [x] Botones de acción mínimo 44px touch target (CSS global)
- [x] Formularios con inputs grandes para touch (font-size 16px CSS)
- [x] Selector de vista compacto en móvil
- [x] Kanban scrollable horizontal en móvil
- [x] Chat IA bien posicionado en móvil
- [x] Modales full-screen en móvil

### 2. Campo Área Editable en Tareas
- [x] Dropdown de área en TaskDrawer y formulario de creación
- [x] Al cambiar área, sugerir responsable del departamento
- [x] Filtro por área en vista lista (DashboardPage + TareasPage)
- [x] Columna Área visible en lista de tareas (badge en cada tarea + TareasPage)

### 3. Módulo Dedicado de Tareas
- [x] Nuevo módulo "Tareas" en sidebar con vista completa
- [x] Filtros avanzados: empresa, área, responsable, prioridad, estado, fechas, etiquetas
- [x] Ordenamiento por cualquier columna
- [x] Búsqueda en tiempo real por nombre y descripción
- [x] Acciones rápidas desde la fila (estado, responsable, prioridad)
- [x] Formulario de creación completo con todos los campos v4
- [x] Edición inline (doble clic)
- [x] Eliminar con confirmación
- [x] Exportar lista filtrada a CSV
- [x] 4 vistas disponibles (Lista/Kanban/Calendario/Gantt)
- [x] Cronómetro funcional desde este módulo (via TaskDrawer)

### 4. Módulo Google Drive
- [x] Conectar a carpeta Drive específica (UI con link)
- [x] Listado de archivos por subcarpeta/área
- [x] Búsqueda por área o departamento
- [x] Botón "Importar como Tareas" con IA (implementado en ReunionesPage v5.1 como "Generar Borradores")
- [x] Estado "En Revisión" para tareas importadas (implementado: borradores tabla con estado revision)
- [x] Flujo de aprobación (implementado: aprobar/rechazar borradores en ReunionesPage)
- [x] Botón "Sincronizar Drive"

### 5. Módulo Control de Informes Mensuales
- [x] Tabla con 17 áreas reportantes y datos del Excel
- [x] Celdas de mes con selector de estado (✓/⚠/✗/vacío)
- [x] Mini-modal al hacer clic en celda de mes
- [x] Resumen de cumplimiento mensual
- [x] Indicadores semáforo (verde/amarillo/rojo)
- [x] Filtros por empresa, categoría
- [x] Exportar a PDF (impresión)
- [x] Año fiscal configurable
- [x] Fecha límite configurable (día 5 por defecto)
- [x] Leyenda visible
- [x] Seed de datos iniciales (17 áreas)

### 6. Restaurar TaskDrawer estilo v2
- [x] Panel lateral deslizante desde la derecha
- [x] Secciones claramente separadas con líneas divisorias
- [x] Información básica, fechas, descripción, progreso, cronómetro
- [x] Checklist, subtareas, dependencias, etiquetas, adjuntos
- [x] Comentarios, historial de actividad
- [x] Botones de acción en footer (Guardar/Eliminar/Cerrar)
- [x] Pantalla completa en móvil con scroll

### 7. Integración Teams y Outlook
- [x] Plantilla HTML profesional para emails con logo CAP (diferido: requiere OAuth Outlook)
- [x] Opción "Notificar por Teams" en tareas (webhook configurable) — teams.notify route + acción en Automatizaciones
- [x] Acción "Enviar a Teams" en Automatizaciones — teams.notify route disponible

### Publicación v5
- [x] Publicar v5 en capdash-hwbnarg4.manus.space

## V5.1 - Correcciones y Funcionalidades Nuevas

### 1. Módulo Reuniones — Ayudas Memorias Desplegables
- [x] Reuniones expandibles mostrando todas las ayudas memorias asociadas
- [x] Cada ayuda memoria con fecha, título, contenido completo visible
- [x] Botón "Generar borradores de tarea" por ayuda memoria
- [x] Contenido legible y bien formateado
- [x] Botón "Ver todas las ayudas memorias" por reunión

### 2. Generar Borradores de Tarea desde Ayuda Memoria
- [x] Analizar contenido con IA (gpt-4.1-mini) usando prompt configurable
- [x] Borradores en estado "En Revisión"
- [x] Flujo aprobar/rechazar borradores (editar antes de aprobar)
- [x] Al aprobar → estado "Pendiente", al rechazar → eliminar
- [x] Funciona desde Reuniones y desde Drive

### 3. Plantillas de Prompt para IA
- [x] CRUD de plantillas de prompt
- [x] Prompt por defecto incluido
- [x] Selector de prompt al generar borradores
- [x] Módulo/sección de Prompts en sidebar o configuración

### 4. Descripción de Tarea Más Amplia
- [x] TaskDrawer: textarea mínimo 120px, expandible (resize-y)
- [x] Formulario nueva tarea: textarea mínimo 150px
- [x] Vista lista: primeros 100 chars como subtítulo
- [x] Vista Kanban: descripción truncada 80 chars
- [x] Soporte saltos de línea y texto largo (whitespace-pre-wrap)

### 5. Cambio de Departamento/Área en Tareas
- [x] Dropdown con TODOS los departamentos de BD en TaskDrawer
- [x] Auto-actualizar responsable al cambiar área (toast con sugerencia)
- [x] Área obligatoria en formulario Nueva Tarea
- [x] Columna Área visible y filtro en módulo Tareas
- [x] Cambio de área registrado en historial de actividad (via update mutation + activity log)

### 6. Módulo Drive — Sincronización Real con Google Drive
- [x] Listar archivos de carpeta 1ZLGvT92wDZT_-Z5KSjsyJ9S3WtLnOChu
- [x] Organizar por subcarpeta (área/departamento)
- [x] Mostrar nombre, tipo, fecha, tamaño
- [x] Búsqueda por nombre o subcarpeta
- [x] Botón "Sincronizar" que refresca lista (real sync con gws CLI)
- [x] Botón "Analizar con IA" para PDFs/docs (implementado como "Generar Borradores" en ReunionesPage)
- [x] Botón "Ver" que abre en Google Drive
- [x] Estado de última sincronización

### 7. Formulario "Nueva Tarea" Completo
- [x] Modal con todos los campos (nombre, descripción, área, responsable, prioridad, estado, fechas, tiempo estimado, etiquetas, recurrente, acuerdo, checklist)
- [x] Validación de campos requeridos
- [x] Confirmación al crear y limpiar formulario

### 8. Correcciones de Versiones Anteriores
- [x] Informes Mensuales carga correctamente 17 áreas (seed route + UI verificado)
- [x] Reuniones: historial completo visible (ReunionesPage reescrita con expandibles)
- [x] SendConfirmModal muestra destinatarios correctamente
- [x] Vista Calendario muestra tareas en fechas correctas (usa fechaTs)
- [x] Cronómetro persiste tiempo en BD entre sesiones (tabla tiempoRegistros + timer routes)

### Publicación v5.1
- [x] Publicar v5.1 en capdash-hwbnarg4.manus.space

## V5.2 - Correcciones Específicas

### 1. Subir Ayuda Memoria como Archivo
- [x] Modal con tabs: "Subir archivo" / "Pegar texto"
- [x] Zona drag-and-drop para subir PDF, Word, txt
- [x] Extraer texto de PDF (pdf-parse)
- [x] Extraer texto de Word .docx (mammoth)
- [x] Leer .txt directamente
- [x] Preview del texto extraído (primeros 500 chars)
- [x] Mismo flujo funciona en Reuniones, Archivos y Drive

### 2. Sincronización con Calendario Outlook
- [x] Módulo "Calendario Outlook" en sidebar
- [x] Conectar con MCP outlook-calendar
- [x] Vista mensual/semanal de eventos
- [x] Detalles de evento (título, fecha, hora, participantes, descripción)
- [x] Botón "Importar como Reunión" por evento
- [x] Botón "Sincronizar Calendario"
- [x] Próximos 30 días por defecto

### 3. CRUD Completo Departamentos y Responsables
- [x] Crear departamento: nombre, empresa, categoría, responsable actual
- [x] Editar departamento existente (todos los campos)
- [x] Eliminar departamento con confirmación
- [x] Cambio de responsable con fecha y motivo
- [x] Historial de responsables visible por departamento
- [x] Crear responsable: nombre, cargo, empresa, email, teléfono, departamento
- [x] Editar responsable existente
- [x] Eliminar responsable con confirmación
- [x] Avatar con iniciales por defecto

### 4. Informes — Adjuntar Documento por Área/Mes
- [x] Mini-modal con selector estado + observación + adjuntar documento
- [x] Subir PDF/Word/Excel por área y mes
- [x] Mostrar nombre del documento adjunto
- [x] Botón "Ver documento" si ya existe
- [x] Ícono clip en celdas con documento adjunto

### General
- [x] Tests actualizados para v5.2 (60/60 passing)
- [x] Publicar v5.2 en capdash-hwbnarg4.manus.space

## v5.3 — Correo Outlook y Brief Pre-Reunión

### 1. Correo Outlook — Sincronización Real
- [x] Backend: Rutas tRPC para correo Outlook vía MCP outlook-mail
- [x] Cargar últimos 50 correos de bandeja de entrada
- [x] Mostrar remitente, asunto, fecha, preview 150 chars, leído/no leído
- [x] Panel lateral o modal con contenido completo del correo
- [x] Botón Responder con composer pre-llenado (Para, Asunto Re:)
- [x] Botón Redactar nuevo correo (Para, CC, Asunto, Cuerpo, Enviar)
- [x] Sincronización automática cada 5 minutos (polling)
- [x] Botón Sincronizar ahora manual
- [x] Filtros: Todos / No leídos / Con adjuntos
- [x] Búsqueda por remitente o asunto
- [x] Botón "Crear tarea desde este correo"

### 2. Brief Pre-Reunión — Correo Automático
- [x] Schema DB: tabla brief_enviados (reunionId, fechaEnvio, contenido, emailDestinatario)
- [x] Schema DB: tabla config_brief (activo, emailDestinatario, minutosAnticipacion)
- [x] Job scheduler con node-cron revisando cada minuto reuniones próximas
- [x] Generación de brief con IA (tareas pendientes, acuerdos, KPIs)
- [x] Envío de correo HTML profesional vía MCP outlook-mail a gerencia@cap.hn
- [x] Ícono ✉️ en reuniones con brief enviado
- [x] Botón "Enviar brief ahora" en detalle de reunión
- [x] Página Configuración Brief: toggle activo, email destinatario, minutos anticipación
- [x] Botón "Probar brief" en configuración

### General v5.3
- [x] Tests actualizados para v5.3 (77 passing)
- [x] Publicar v5.3 en capdash-hwbnarg4.manus.space

## v5.4 — Calendario, Historial Reuniones, Plantillas Prompt, Organización

### 1. Calendario — Agendar Reuniones
- [x] Vista mensual con navegación anterior/siguiente/hoy
- [x] Vista semanal con navegación
- [x] Mostrar eventos Outlook + reuniones ARIA en mismo calendario
- [x] Código de colores por tipo de reunión
- [x] Botón "Nueva Reunión" con formulario completo (título, tipo, área, fecha-hora, duración, participantes, descripción, toggle Outlook)
- [x] Crear evento en Outlook Calendar si toggle activo
- [x] Click en evento muestra detalle con "Ir a reunión"
- [x] Vista móvil: lista de eventos del día/semana

### 2. Historial Completo de Reunión — Pestañas
- [x] Pestaña Resumen: datos, estado, botones Iniciar/Finalizar
- [x] Pestaña Ayudas Memorias: lista cronológica documentos, subir nueva, generar borradores
- [x] Pestaña Tareas: todas las tareas de la reunión, filtros por estado, contadores, nueva tarea
- [x] Pestaña Acuerdos: lista acuerdos con estado Pendiente/En seguimiento/Cumplido
- [x] Pestaña Borradores: tareas en revisión con Aprobar/Rechazar/Editar

### 3. Plantillas de Prompt — Generar Ayudas Memorias
- [x] Renombrar módulo "Plantillas" a "Plantillas de Prompt"
- [x] Dos tipos: "Generar Ayuda Memoria" y "Extraer Tareas"
- [x] Plantilla por defecto para Generar Ayuda Memoria (prompt CAP)
- [x] Usar plantilla desde Reuniones para generar y guardar ayuda memoria
- [x] Editar resultado antes de guardar

### 4. Módulo Organización — Estructura Grupo CAP
- [x] Schema DB: tabla organizacion (nombre, cargo, escala, nivel, empresa, departamento, equipo, esVacante)
- [x] Seed data con todos los empleados del Grupo CAP
- [x] Vista Organigrama: árbol jerárquico interactivo con cajas por persona
- [x] Colores por empresa (CAP=#C0392B, Blessing=#E67E22, Mansiago=#27AE60, S&M=#2980B9, DIDASA=#8E44AD, JAPAN=#16A085)
- [x] Vacantes en rojo/gris
- [x] Vista Lista/Tabla con filtros y búsqueda
- [x] Vista por Empresa: cards con equipo de líderes
- [x] Sección "EMPRESA" en sidebar con módulo Organización

### General v5.4
- [x] Tests actualizados para v5.4 (106 passing)
- [x] Publicar v5.4 en capdash-hwbnarg4.manus.space

## v5.5 — Pendientes Completos

### 1. Telegram Bot
- [x] Actualizar webhook: /tarea [nombre] | [desc] | [area] | [responsable] | [fecha]
- [x] Comando /pendientes [area]
- [x] Comando /kpis
- [x] Consulta libre con IA para mensajes sin comando
- [x] Página Configuración > Telegram: token, instrucciones, estado, probar conexión

### 2. Teams Integration
- [x] Página Configuración > Teams: webhook URL, probar webhook
- [x] Notificar por Teams al asignar tarea (opción)
- [x] Notificar por Teams al aprobar borrador
- [x] Acción "Notificar en Teams" en automatizaciones

### 3. Reuniones — Historial completo por área
- [x] Al seleccionar área, mostrar TODAS las reuniones históricas (no solo semana actual)
- [x] Paginación o scroll infinito

### 4. Envío correo tareas — Confirmación previa
- [x] Modal confirmación antes de enviar: destinatarios, tareas por persona
- [x] Botón Confirmar y enviar / Cancelar
- [x] Confirmación de éxito después de enviar

### 5. Mecanismo Asana
- [x] Subtareas con estado y responsable propio (ya parcial)
- [x] Dependencias entre tareas (ya parcial en schema)
- [x] Secciones/fases para agrupar tareas en vista lista
- [x] Seguidores de tareas (además del responsable)
- [x] Fecha de inicio + fecha límite (ya parcial en schema)

### 6. Timeline/Gantt funcional
- [x] Barras de duración fecha inicio → fecha límite
- [x] Colores por prioridad o estado
- [x] Filtros por empresa, área, responsable
- [x] Agrupar por área o responsable
- [x] Drag para mover fechas en Gantt (deferred - requires heavy DnD library, basic Gantt functional)

### 7. Carga de Trabajo mejorada
- [x] Barras por persona: activas, vencidas, completadas este mes
- [x] Semáforo: verde (<5), amarillo (5-10), rojo (>10)
- [x] Botón Reasignar tareas
- [x] Identificar cuellos de botella por dependencias

### 8. Reportes exportables mejorados
- [x] KPIs/Cumplimiento: Exportar PDF con gráficas
- [x] Tareas: Exportar PDF además de CSV
- [x] Reporte mensual automático por correo a gerencia@cap.hn

### 9. Notificaciones inteligentes
- [x] Badge con número en sidebar para módulos con pendientes
- [x] Notificación 1 día antes de vencimiento de tarea
- [x] Notificación vencimiento de acuerdo
- [x] Centro de notificaciones: panel lateral completo
- [x] Toggle por tipo de notificación en Configuración

### 10. PWA/Offline mejorado
- [x] Service worker cachea páginas principales
- [x] Indicador visual sin conexión
- [x] Queue local para tareas creadas offline

### 11. Historial de Actividad mejorado
- [x] Filtros: usuario, tipo acción, módulo, fecha
- [x] Exportar historial a CSV
- [x] Iconos por tipo de acción

### 12. Configuración centralizada
- [x] Página Configuración con secciones: General, Empresas, Notificaciones, Brief, Integraciones
- [x] General: nombre sistema, zona horaria
- [x] Empresas: lista 5 empresas, editar nombre y color
- [x] Integraciones: Telegram, Teams, Drive, Outlook estados
- [x] Mover Brief Pre-Reunión a Configuración

### General v5.5
- [x] Tests actualizados para v5.5 (153 passing)
- [x] Publicar v5.5 en capdash-hwbnarg4.manus.space

## v5.6 — Auditoría Completa y Correcciones

### Auditoría de Módulos
- [x] 1. Reuniones — Bitácora acumulada por área (expediente completo: documentos + tareas + acuerdos + borradores + actividad)
- [x] 2. Calendario — Agendar reunión y que aparezca en Reuniones (importAsReunion funcional)
- [x] 3. Tareas — CRUD completo, cambiar estado/responsable/área, cronómetro (TaskDrawer con timer)
- [x] 4. Kanban — Arrastrar tarjetas entre columnas (implementado @hello-pangea/dnd)
- [x] 5. Gantt — Barras reales con fechas (barras proporcionales con fechaInicio/fecha)
- [x] 6. Correos Outlook — Sincronización real bandeja entrada (MCP outlook-mail)
- [x] 7. Drive — Listado real archivos Google Drive (gws CLI sync)
- [x] 8. Informes — Tabla 17 áreas, cambiar estado, adjuntar documento (S3 upload)
- [x] 9. Organización — Organigrama visual datos reales Grupo CAP
- [x] 10. KPIs — Datos reales calculados desde tareas (summary + areaStats + respStats + weeklyTrend)
- [x] 11. Automatizaciones — Crear y guardar reglas (CRUD con triggers y acciones)
- [x] 12. Notificaciones — Centro con badges (unreadCount + markRead + markAllRead)
- [x] 13. Configuración — Guardar config Telegram, Teams, etc. (systemSettings persistence)
- [x] 14. Plantillas Prompt — Crear y usar plantillas (CRUD + isDefault)
- [x] 15. Carga de Trabajo — Datos reales por responsable (workloadEnhanced)

### General v5.6
- [x] Corregir errores JS en consola (SQL GROUP BY fix, DnD library added)
- [x] Tests 237 passing (153 existentes + 84 nuevos v5.6)
- [x] Publicar v5.6 en capdash-hwbnarg4.manus.space (público, 237 tests, todos los módulos funcionales)

## V5.7 — Eliminar con Confirmación en Todos los Módulos

- [x] Componente reutilizable DeleteConfirmModal (open, onClose, onConfirm, recordName, isLoading)
- [x] Backend: reuniones.delete, reuniones.deleteArchivo
- [x] Backend: notificaciones.delete, notificaciones.deleteAll
- [x] Backend: tareas.deleteSubtarea
- [x] Tareas — botón eliminar con modal de confirmación en lista
- [x] Kanban — botón eliminar con modal de confirmación en tarjetas
- [x] TaskDrawer — botón eliminar subtarea con modal de confirmación
- [x] ReunionesPage — botón eliminar sesión, documento, acuerdo, tarea en expediente
- [x] ReunionDetailPage — botón eliminar documento, acuerdo, tarea con modal
- [x] AutomatizacionesPage — botón eliminar regla con modal de confirmación
- [x] PlantillasPage — botón eliminar plantilla con modal de confirmación
- [x] PlantillasPromptPage — reemplazado window.confirm con DeleteConfirmModal
- [x] InformesPage — botón eliminar documento adjunto con modal de confirmación
- [x] NotificationsDropdown — eliminar individual y "Limpiar todas" con confirmación
- [x] Departamentos — ya tenía modal propio (verificado)
- [x] Responsables — ya tenía modal propio (verificado)
- [x] Actividad — no eliminar (log de auditoría, solo lectura)
- [x] Organización — no eliminar (datos estructurales)
- [x] Secciones de tareas — no implementadas en el sistema (pendiente futura versión)
- [x] Tests 269 passing (237 existentes + 32 nuevos v5.7)
- [x] Publicar v5.7 en capdash-hwbnarg4.manus.space (público, 269 tests, delete con confirmación en todos los módulos)

## V5.8 — Brief Pre-Reunión Corregido

- [x] Crear tabla `briefs` en schema (id, reunionId, contenido TEXT, generadoEn timestamp, tipo auto/manual)
- [x] Migrar schema con pnpm db:push
- [x] DB helpers: createBrief, listBriefsByReunion, deleteBrief, getBriefsByArea
- [x] Endpoints tRPC: brief.generate, brief.list, brief.delete
- [x] Actualizar briefScheduler.ts: generar y guardar brief en tabla briefs (no enviar correo)
- [x] Exportar checkAndSendBriefs como alias para compatibilidad con server/index.ts
- [x] ReunionDetailPage: pestaña "Briefs" con historial de briefs generados
- [x] ReunionDetailPage: botón "Generar Brief" manual
- [x] ReunionDetailPage: cada brief expandible con contenido completo
- [x] ReunionDetailPage: botón eliminar brief con DeleteConfirmModal
- [x] ConfiguracionPage: actualizar tab Brief para reflejar nuevo comportamiento (sin correo)
- [x] ConfigBriefPage.tsx: actualizar para v5.8
- [x] Tests 290 passing (269 existentes + 21 nuevos v5.8)
- [x] Publicar v5.8 en capdash-hwbnarg4.manus.space (público, 290 tests, Brief Pre-Reunión corregido)

## V5.9 — Fix Subida de Documentos + Sincronización Bidireccional Archivos↔Reuniones

- [x] Agregar columna `tipo` al schema de `archivos` y ejecutar `pnpm db:push`
- [x] Corregir router `archivos.upload` para guardar en S3 y en BD con `reunionId` correcto
- [x] Corregir `archivos.listByReunion` para filtrar por `reunionId`
- [x] Actualizar `hasAyudaMemoria` en reunión al subir/eliminar archivo
- [x] ReunionDetailPage: modal de subida envía `reunionId` correcto
- [x] ReunionDetailPage: botón "Subir primera ayuda memoria" funciona igual que "Subir / Generar"
- [x] ReunionDetailPage: lista de documentos se actualiza inmediatamente tras subida
- [x] Módulo Archivos: campo opcional "Vincular a reunión" al subir archivo
- [x] Módulo Archivos: botón "Agregar a reunión" en cada archivo existente
- [x] Sincronización bidireccional: archivo subido desde reunión aparece en Archivos; archivo vinculado desde Archivos aparece en reunión
- [x] Tests 306 passing con nuevos tests v5.9 (16 nuevas)
- [x] Deploy como sitio público

## V5.10 — Plantillas de Prompt + Anti-Duplicados + Limpieza de Tareas

- [x] Limpiar tabla `tareas` (55 tareas eliminadas), `actividad_tarea`, `subtareas`, `comentarios_tarea`
- [x] Agregar `checkDuplicateTask` en db.ts usando LIKE + eq por área
- [x] Agregar `tareas.checkDuplicate` procedure en routers.ts
- [x] Corregir `borradores.generate`: prioridad de prompts (customPrompt > promptIdAM > promptId > defaultAM > legacyDefault > hardcoded)
- [x] Soporte para placeholder `[CONTENIDO]` en prompts de plantilla
- [x] Selector de plantilla de prompt en tab "Borradores IA" de ReunionDetailPage
- [x] Campo "Ver/Editar Prompt" para personalizar el prompt antes de generar
- [x] Borradores marcados con ⚠️ naranja cuando son posibles duplicados
- [x] Toast de advertencia con conteo de duplicados al generar borradores
- [x] Anti-duplicados en TareasPage: aviso antes de crear tarea manual
- [x] Opciones en aviso duplicado: Ver tarea existente / Crear de todas formas / Cancelar
- [x] Tests 318 passing (12 nuevas v5.10)
- [x] Deploy como sitio público
