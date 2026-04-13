import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const db = drizzle(DATABASE_URL);

const RESPONSABLES = [
  { nombre: "Sindy Castro", area: "Gerencia General", email: "gerencia@cap.hn" },
  { nombre: "Wilfredo Martínez", area: "Contabilidad", email: "contabilidad@cap.hn" },
  { nombre: "Jeffrin Castro", area: "Finanzas", email: "finanzas@cap.hn" },
  { nombre: "Samuel Ávila", area: "Compras", email: "s.avila@cap.hn" },
  { nombre: "Silvia Ruiz", area: "Talento Humano", email: "recursoshumanos@cap.hn" },
  { nombre: "Yenifer Carcamo", area: "Auditoría", email: "auditoria@cap.hn" },
  { nombre: "Daniel Henríquez", area: "Marketing", email: null },
  { nombre: "Carlos Rosales", area: "Procesos", email: null },
  { nombre: "Víctor Hernández", area: "Tecnología", email: null },
  { nombre: "Ángel Aguirre", area: "Legal", email: "legal@cap.hn" },
  { nombre: "Ramiro Castejón", area: "Servicios Generales", email: null },
  { nombre: "Ninfa Mendoza", area: "Auto Repuestos Blessing", email: null },
  { nombre: "Angie Avelarez", area: "Tecnicentro DIDASA", email: null },
  { nombre: "Eileen Sánchez", area: "Comercial", email: "analista.comercial@cap.hn" },
];

const TAREAS = [
  // ─── Consolidado semana 23-29 marzo (32 tareas) ───
  // Desarrollo y Tecnología (15)
  { area: "Desarrollo y Tecnología", tarea: "Implementar sistema ARIA de automatización de reuniones con dashboard de seguimiento", responsable: "Víctor Hernández", fecha: "11/04/2026", propuesta: '["Completar módulos de procesamiento de transcripciones","Integrar envío automático de correos post-reunión","Desplegar dashboard con acceso móvil para Sindy"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Configurar automatización de recordatorios de agenda quincenal vía Outlook", responsable: "Víctor Hernández", fecha: "04/04/2026", propuesta: '["Validar conexión MCP con Outlook Calendar","Programar envío automático cada lunes 8:00 AM CST","Incluir eventos adicionales del calendario en el recordatorio"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Configurar procesamiento diario de transcripciones de Google Drive a las 6:00 PM", responsable: "Víctor Hernández", fecha: "04/04/2026", propuesta: '["Automatizar lectura de carpeta Drive con archivos del día","Procesar con IA y generar ayudas memorias en PDF","Enviar resultados a gerencia@cap.hn si hay archivos nuevos"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Desarrollar módulo de Power BI para KPIs de Recursos Humanos", responsable: "Víctor Hernández", fecha: "18/04/2026", propuesta: '["Definir KPIs clave con Silvia Ruiz","Conectar fuentes de datos de planilla y asistencia","Crear dashboards interactivos con filtros por departamento"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Implementar sistema de gestión documental centralizado", responsable: "Víctor Hernández", fecha: "25/04/2026", propuesta: '["Evaluar plataformas de gestión documental compatibles","Definir estructura de carpetas y permisos por área","Migrar documentos críticos al nuevo sistema"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Capacitar al equipo en herramientas Microsoft 365 avanzadas", responsable: "Víctor Hernández", fecha: "11/04/2026", propuesta: '["Preparar módulos de capacitación por herramienta","Programar sesiones semanales de 1 hora por grupo","Crear guías rápidas de referencia para cada herramienta"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Configurar entorno de desarrollo para aplicaciones internas", responsable: "Víctor Hernández", fecha: "11/04/2026", propuesta: '["Estandarizar stack tecnológico del equipo","Configurar repositorios Git y CI/CD","Documentar procesos de desarrollo y despliegue"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Integrar sistema de grabación PLAUD con flujo de transcripción automática", responsable: "Víctor Hernández", fecha: "11/04/2026", propuesta: '["Configurar sincronización automática de audios PLAUD a Drive","Implementar transcripción automática post-sincronización","Validar calidad de transcripción con reuniones de prueba"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Desarrollar API de integración entre sistemas internos", responsable: "Víctor Hernández", fecha: "02/05/2026", propuesta: '["Mapear sistemas actuales y puntos de integración","Diseñar API RESTful con autenticación segura","Implementar endpoints prioritarios y documentar"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Implementar backup automático de bases de datos críticas", responsable: "Víctor Hernández", fecha: "04/04/2026", propuesta: '["Identificar bases de datos críticas de cada área","Configurar backups diarios automatizados","Establecer procedimiento de restauración y pruebas mensuales"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Optimizar infraestructura de red para oficinas principales", responsable: "Víctor Hernández", fecha: "18/04/2026", propuesta: '["Realizar auditoría de red actual y cuellos de botella","Proponer mejoras de hardware y configuración","Implementar monitoreo de red en tiempo real"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Crear portal de soporte técnico interno para empleados", responsable: "Víctor Hernández", fecha: "25/04/2026", propuesta: '["Diseñar sistema de tickets con categorías por tipo","Implementar base de conocimiento con soluciones frecuentes","Establecer SLAs de respuesta por prioridad"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Implementar sistema de monitoreo de seguridad informática", responsable: "Víctor Hernández", fecha: "02/05/2026", propuesta: '["Evaluar herramientas de monitoreo de seguridad","Configurar alertas para accesos no autorizados","Establecer política de contraseñas y acceso por roles"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Migrar correos corporativos a Microsoft 365", responsable: "Víctor Hernández", fecha: "18/04/2026", propuesta: '["Planificar migración por fases y departamentos","Capacitar usuarios en nuevo entorno de correo","Validar que todos los buzones migren correctamente"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Desarrollo y Tecnología", tarea: "Desarrollar aplicación móvil para consulta de inventarios", responsable: "Víctor Hernández", fecha: "16/05/2026", propuesta: '["Definir requerimientos con área de Compras","Desarrollar prototipo funcional con consulta en tiempo real","Realizar pruebas con usuarios clave antes del lanzamiento"]', source: "consolidado_semana_23_29_marzo" },
  // Contabilidad y Finanzas (6)
  { area: "Contabilidad y Finanzas", tarea: "Completar conciliaciones bancarias del mes de marzo 2026", responsable: "Wilfredo Martínez", fecha: "11/04/2026", propuesta: '["Revisar movimientos bancarios pendientes de conciliar","Identificar y resolver partidas en tránsito","Generar reporte de conciliación para revisión de Gerencia"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Contabilidad y Finanzas", tarea: "Preparar estados financieros del primer trimestre 2026", responsable: "Wilfredo Martínez", fecha: "18/04/2026", propuesta: '["Cerrar registros contables de enero-marzo","Preparar balance general y estado de resultados","Presentar análisis comparativo vs presupuesto"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Contabilidad y Finanzas", tarea: "Implementar nuevo formato de reporte de gastos por centro de costo", responsable: "Jeffrin Castro", fecha: "11/04/2026", propuesta: '["Diseñar plantilla con desglose por centro de costo","Capacitar a responsables de área en el nuevo formato","Automatizar generación mensual del reporte"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Contabilidad y Finanzas", tarea: "Revisar y actualizar catálogo de cuentas contables", responsable: "Wilfredo Martínez", fecha: "25/04/2026", propuesta: '["Identificar cuentas obsoletas o duplicadas","Proponer nueva estructura alineada a NIIF","Validar con auditoría antes de implementar"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Contabilidad y Finanzas", tarea: "Automatizar proceso de facturación electrónica", responsable: "Jeffrin Castro", fecha: "02/05/2026", propuesta: '["Evaluar proveedores de facturación electrónica","Configurar integración con sistema contable actual","Realizar pruebas piloto con facturas de bajo monto"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Contabilidad y Finanzas", tarea: "Preparar proyección de flujo de caja Q2 2026", responsable: "Jeffrin Castro", fecha: "11/04/2026", propuesta: '["Recopilar compromisos de pago y cobranzas esperadas","Modelar escenarios optimista, base y conservador","Presentar recomendaciones de gestión de liquidez"]', source: "consolidado_semana_23_29_marzo" },
  // Gerencia General (6)
  { area: "Gerencia General", tarea: "Definir objetivos estratégicos Q2 2026 por área", responsable: "Sindy Castro", fecha: "11/04/2026", propuesta: '["Revisar cumplimiento de objetivos Q1","Establecer metas medibles por departamento","Comunicar objetivos en reunión de coordinadores"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Gerencia General", tarea: "Evaluar propuesta de reestructuración organizacional", responsable: "Sindy Castro", fecha: "18/04/2026", propuesta: '["Analizar estructura actual vs necesidades de crecimiento","Identificar posiciones clave a crear o consolidar","Presentar propuesta con impacto presupuestario"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Gerencia General", tarea: "Revisar contratos de proveedores estratégicos para renovación", responsable: "Sindy Castro", fecha: "25/04/2026", propuesta: '["Listar contratos que vencen en Q2 2026","Evaluar desempeño de cada proveedor","Negociar mejores condiciones antes de renovar"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Gerencia General", tarea: "Implementar sistema de evaluación de desempeño trimestral", responsable: "Sindy Castro", fecha: "02/05/2026", propuesta: '["Definir criterios de evaluación por nivel jerárquico","Crear formulario digital de evaluación","Capacitar a líderes de área en el proceso"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Gerencia General", tarea: "Coordinar auditoría interna de procesos operativos", responsable: "Yenifer Carcamo", fecha: "18/04/2026", propuesta: '["Definir alcance y áreas a auditar","Establecer cronograma de visitas y revisiones","Preparar checklist de cumplimiento por proceso"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Gerencia General", tarea: "Actualizar manual de políticas y procedimientos corporativos", responsable: "Sindy Castro", fecha: "16/05/2026", propuesta: '["Revisar políticas vigentes con cada área","Incorporar nuevos procedimientos aprobados en 2026","Distribuir versión actualizada a todos los colaboradores"]', source: "consolidado_semana_23_29_marzo" },
  // Talento Humano (5)
  { area: "Talento Humano", tarea: "Completar proceso de reclutamiento para posiciones abiertas Q1", responsable: "Silvia Ruiz", fecha: "11/04/2026", propuesta: '["Revisar estado de cada vacante abierta","Agilizar entrevistas finales pendientes","Preparar ofertas laborales para candidatos seleccionados"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Talento Humano", tarea: "Implementar programa de capacitación continua 2026", responsable: "Silvia Ruiz", fecha: "18/04/2026", propuesta: '["Identificar necesidades de capacitación por área","Diseñar calendario anual de formación","Establecer alianzas con proveedores de capacitación"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Talento Humano", tarea: "Digitalizar expedientes de personal pendientes", responsable: "Silvia Ruiz", fecha: "25/04/2026", propuesta: '["Priorizar expedientes de empleados activos","Escanear y clasificar documentos en sistema digital","Validar integridad de la información digitalizada"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Talento Humano", tarea: "Preparar encuesta de clima organizacional 2026", responsable: "Silvia Ruiz", fecha: "02/05/2026", propuesta: '["Diseñar cuestionario con preguntas clave","Definir metodología de aplicación (anónima, digital)","Establecer plan de acción basado en resultados"]', source: "consolidado_semana_23_29_marzo" },
  { area: "Talento Humano", tarea: "Actualizar tabulador salarial y estructura de compensaciones", responsable: "Silvia Ruiz", fecha: "16/05/2026", propuesta: '["Investigar mercado salarial del sector","Comparar estructura actual vs mercado","Proponer ajustes con impacto presupuestario"]', source: "consolidado_semana_23_29_marzo" },
  // ─── Legal (17 tareas) ───
  { area: "Legal", tarea: "Revisar y actualizar contratos de arrendamiento de locales comerciales del grupo", responsable: "Ángel Aguirre", fecha: "09/04/2026", propuesta: '["Identificar contratos que vencen en los próximos 90 días","Revisar cláusulas de renovación automática y ajuste de canon","Preparar adendas de actualización para firma de Gerencia"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Completar registro de marcas comerciales pendientes ante el Instituto de Propiedad", responsable: "Ángel Aguirre", fecha: "16/04/2026", propuesta: '["Verificar estado de solicitudes en trámite","Preparar documentación faltante para marcas CAP, DIDASA y Blessing","Dar seguimiento semanal hasta obtener resolución"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Elaborar política interna de protección de datos personales", responsable: "Ángel Aguirre", fecha: "23/04/2026", propuesta: '["Revisar legislación hondureña vigente sobre datos personales","Redactar política con alcance a empleados, clientes y proveedores","Coordinar con TI la implementación de medidas técnicas"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Revisar contratos laborales para alinearlos con reformas al Código de Trabajo", responsable: "Ángel Aguirre", fecha: "09/04/2026", propuesta: '["Identificar cláusulas que requieren actualización","Redactar nuevos modelos de contrato por tipo de puesto","Coordinar con RRHH la firma de adendas con empleados actuales"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Preparar documentación legal para apertura de nueva sucursal", responsable: "Ángel Aguirre", fecha: "30/04/2026", propuesta: '["Verificar requisitos municipales y permisos de operación","Preparar escritura de arrendamiento o compraventa","Tramitar permisos sanitarios y de bomberos"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Resolver disputas pendientes con proveedores por incumplimiento contractual", responsable: "Ángel Aguirre", fecha: "16/04/2026", propuesta: '["Documentar incumplimientos con evidencia contractual","Enviar notificaciones formales de reclamo","Evaluar si procede mediación o acción legal directa"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Actualizar poderes legales y representaciones del grupo empresarial", responsable: "Ángel Aguirre", fecha: "09/04/2026", propuesta: '["Revisar vigencia de poderes actuales ante notario","Revocar poderes de ex-funcionarios","Otorgar nuevos poderes según estructura organizacional actual"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Elaborar manual de cumplimiento normativo (compliance) para el grupo", responsable: "Ángel Aguirre", fecha: "14/05/2026", propuesta: '["Mapear regulaciones aplicables por línea de negocio","Redactar políticas de prevención de lavado de activos","Diseñar programa de capacitación en compliance para directivos"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Revisar estructura societaria y actas de junta directiva pendientes", responsable: "Ángel Aguirre", fecha: "09/04/2026", propuesta: '["Verificar que libros de actas estén al día","Preparar actas de resoluciones pendientes de formalizar","Actualizar inscripciones en el Registro Mercantil"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Gestionar renovación de licencias y permisos operativos anuales", responsable: "Ángel Aguirre", fecha: "23/04/2026", propuesta: '["Listar todas las licencias que vencen en 2026","Preparar documentación para renovación anticipada","Calendarizar fechas límite con alertas automáticas"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Preparar contratos marco para nuevos proveedores estratégicos", responsable: "Ángel Aguirre", fecha: "16/04/2026", propuesta: '["Coordinar con Compras la lista de proveedores nuevos","Redactar contratos con cláusulas de protección estándar","Incluir penalizaciones por incumplimiento y confidencialidad"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Implementar sistema de gestión de contratos digitales", responsable: "Ángel Aguirre", fecha: "14/05/2026", propuesta: '["Evaluar plataformas de firma electrónica válidas en Honduras","Digitalizar contratos vigentes más relevantes","Capacitar a áreas en el uso del sistema de firma digital"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Revisar pólizas de seguros corporativos y cobertura actual", responsable: "Ángel Aguirre", fecha: "23/04/2026", propuesta: '["Solicitar resumen de coberturas actuales a la aseguradora","Identificar brechas de cobertura en activos y operaciones","Negociar mejores condiciones o ampliar coberturas"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Atender requerimientos de auditoría externa en materia legal", responsable: "Ángel Aguirre", fecha: "09/04/2026", propuesta: '["Preparar carpeta con documentación legal solicitada","Responder observaciones de auditoría anterior","Coordinar reunión con auditores para aclarar hallazgos"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Elaborar protocolo de respuesta ante contingencias legales", responsable: "Ángel Aguirre", fecha: "30/04/2026", propuesta: '["Identificar escenarios de riesgo legal más probables","Definir cadena de comunicación y toma de decisiones","Preparar plantillas de respuesta para cada escenario"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Revisar cumplimiento tributario y obligaciones fiscales del grupo", responsable: "Ángel Aguirre", fecha: "16/04/2026", propuesta: '["Verificar declaraciones fiscales al día con SAR","Revisar retenciones y pagos a cuenta pendientes","Coordinar con Contabilidad la conciliación fiscal"]', source: "legal_25_03_2026" },
  { area: "Legal", tarea: "Capacitar a coordinadores de área en aspectos legales básicos de su gestión", responsable: "Ángel Aguirre", fecha: "30/04/2026", propuesta: '["Diseñar módulo de capacitación legal por área","Cubrir temas de contratos, laboral y protección de datos","Programar sesiones de 1 hora por grupo quincenal"]', source: "legal_25_03_2026" },
];

async function seed() {
  console.log("Seeding responsables...");
  for (const r of RESPONSABLES) {
    try {
      await db.execute(sql`INSERT IGNORE INTO responsables (nombre, area, email) VALUES (${r.nombre}, ${r.area}, ${r.email})`);
    } catch (e) { console.warn("Skip responsable:", r.nombre, e); }
  }
  console.log(`${RESPONSABLES.length} responsables seeded.`);

  console.log("Seeding tareas...");
  for (const t of TAREAS) {
    const parts = t.fecha.split("/");
    const fechaTs = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    try {
      await db.execute(sql`INSERT INTO tareas (area, tarea, responsable, fecha, fechaTs, propuesta, status, source, reunion) VALUES (${t.area}, ${t.tarea}, ${t.responsable}, ${t.fecha}, ${fechaTs}, ${t.propuesta}, 'pendiente', ${t.source}, NULL)`);
    } catch (e) { console.warn("Skip tarea:", t.tarea.substring(0, 50), e); }
  }
  console.log(`${TAREAS.length} tareas seeded.`);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
