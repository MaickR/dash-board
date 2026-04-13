# ARIA Dashboard

Plataforma de seguimiento ejecutivo para reuniones, tareas, acuerdos, responsables e informacion operativa del Grupo CAP Honduras.

Este proyecto centraliza el trabajo posterior a reuniones en un solo tablero: seguimiento de tareas, control por responsable, carga por area, archivos, briefs previos a reunion, actividad reciente y herramientas de apoyo con IA.

## Panorama General

ARIA Dashboard esta construido como una aplicacion full stack con frontend en React y backend en Node.js. Su objetivo es ofrecer una vista clara del estado operativo del negocio, facilitar el seguimiento de compromisos y reducir el trabajo manual de consolidacion.

Capacidades principales:

- tablero ejecutivo con metricas y vistas por estado;
- gestion de tareas, responsables y departamentos;
- control de reuniones, acuerdos y archivos;
- briefs previos a reunion y ayuda memoria;
- centro de actividad, notificaciones y carga de trabajo;
- soporte local para desarrollo incluso sin base de datos externa.

## Arquitectura

```text
client/   -> interfaz React + Vite
server/   -> backend Express + tRPC
drizzle/  -> esquema y migraciones
shared/   -> tipos y constantes compartidas
```

Stack principal:

- React 19
- Vite 7
- TypeScript 5
- Express
- tRPC
- Drizzle ORM
- MySQL
- Vitest

## Estado Tecnico

El proyecto fue estabilizado para desarrollo local y validado tecnicamente con los siguientes resultados:

- `corepack pnpm check` en verde;
- `corepack pnpm build` en verde;
- `corepack pnpm test` en verde con `318` pruebas exitosas;
- validacion manual de frontend y backend realizada en entorno local.

Tambien se incorporaron dos mejoras importantes para desarrollo:

- persistencia local basada en archivo JSON cuando no existe `DATABASE_URL`;
- fallback local para funciones asistidas por IA cuando no existe `BUILT_IN_FORGE_API_KEY`.

Estas facilidades son solo para desarrollo. En produccion se requiere infraestructura real.

## Requisitos

Para trabajar con el proyecto se recomienda:

- Node.js 20 o superior;
- Corepack habilitado;
- pnpm administrado por Corepack;
- opcionalmente MySQL si se desea operar con base real en desarrollo.

## Instalacion Rapida

```powershell
corepack enable
corepack pnpm install
Copy-Item .env.example .env
corepack pnpm dev
```

La aplicacion quedara disponible en el puerto que indique la consola. Si el puerto configurado esta ocupado, el servidor intentara usar otro puerto libre.

## Configuracion de Entorno

Archivo base: `.env.example`

Variables clave:

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | Modo de ejecucion |
| `PORT` | Puerto local del servidor |
| `JWT_SECRET` | Secreto de sesion/autenticacion |
| `DATABASE_URL` | Conexion MySQL real |
| `OAUTH_SERVER_URL` | Servicio de autenticacion |
| `OWNER_OPEN_ID` | Usuario propietario de la instancia |
| `BUILT_IN_FORGE_API_KEY` | Clave del proveedor de IA |
| `TELEGRAM_BOT_TOKEN` | Integracion opcional con Telegram |
| `TEAMS_WEBHOOK_URL` | Integracion opcional con Teams |

Modo desarrollo minimo:

- `DATABASE_URL` puede quedar vacio;
- `BUILT_IN_FORGE_API_KEY` puede quedar vacio;
- el sistema levantara con almacenamiento local de apoyo;
- el acceso local de desarrollo permite revisar la interfaz sin depender de todas las integraciones.

## Scripts Disponibles

```powershell
corepack pnpm dev
corepack pnpm check
corepack pnpm build
corepack pnpm test
```

Descripcion:

- `dev`: inicia el entorno de desarrollo;
- `check`: valida TypeScript sin emitir archivos;
- `build`: construye frontend y backend para despliegue;
- `test`: ejecuta la suite automatizada.

## Flujo de Desarrollo

Pasos recomendados para el equipo:

1. Instalar dependencias.
2. Crear `.env` a partir de `.env.example`.
3. Iniciar con `corepack pnpm dev`.
4. Validar cambios con `corepack pnpm check`.
5. Antes de integrar, ejecutar `corepack pnpm test`.

## Despliegue

Para un despliegue real se recomienda un servicio que soporte Node.js y variables de entorno del backend, por ejemplo Render, Railway o Koyeb.

Para produccion hace falta:

- base de datos MySQL real;
- secretos reales de autenticacion;
- clave real del servicio de IA, si se usara esa funcionalidad;
- validacion de cookies, dominio y HTTPS;
- prueba final en staging o preproduccion.

## Observaciones Importantes

- La persistencia local en `.local/dashboard-local-db.json` existe solo para desarrollo.
- Ese archivo no debe versionarse ni usarse como origen de datos productivo.
- El proyecto esta preparado para ser mostrado visualmente en demos, pero para uso operativo en linea se debe desplegar con backend e infraestructura completa.

## Estructura Funcional

Modulos destacados:

- Dashboard
- Tareas
- Kanban
- Reuniones
- Archivos
- Departamentos
- Responsables
- Informes
- Organizacion
- Cumplimiento
- Carga de trabajo
- Resumen ejecutivo
- Drive
- Correos Outlook
- Automatizaciones
- Plantillas Prompt
- Actividad
- Configuracion
- Brief Pre-Reunion

## Licencia

Uso interno del proyecto segun definicion del propietario del repositorio y del equipo responsable.