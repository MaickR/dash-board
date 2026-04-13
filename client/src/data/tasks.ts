/**
 * Datos iniciales: 49 tareas
 * - 32 del consolidado semana 23-29 marzo 2026
 * - 17 de la reunión de Legal 25/03/2026
 */

export type TaskStatus = "pendiente" | "en_progreso" | "completada" | "vencida";

export interface Task {
  id: number;
  area: string;
  tarea: string;
  responsable: string;
  fecha: string; // DD/MM/YYYY
  propuesta: string[];
  status: TaskStatus;
  source: string; // "consolidado" | "legal"
  reunion: string;
}

export const AREAS = [
  "Contabilidad y Finanzas",
  "Desarrollo y Tecnología",
  "Gerencia General",
  "Talento Humano",
  "Legal",
  "Compras y Logística",
  "Legal Laboral y RR.HH.",
  "Contratos y Coordinación Legal",
  "Vínculos Institucionales",
] as const;

export const AREA_COLORS: Record<string, string> = {
  "Contabilidad y Finanzas": "#3B82F6",
  "Desarrollo y Tecnología": "#8B5CF6",
  "Gerencia General": "#C0392B",
  "Talento Humano": "#EC4899",
  "Legal": "#F59E0B",
  "Compras y Logística": "#10B981",
  "Legal Laboral y RR.HH.": "#F97316",
  "Contratos y Coordinación Legal": "#6366F1",
  "Vínculos Institucionales": "#14B8A6",
};

export const REUNIONES_QUINCENALES = [
  { dia: "Lunes", hora: "8:30-10:00", area: "Coordinadores", responsable: "Todos" },
  { dia: "Martes", hora: "8:30-10:00", area: "Marketing", responsable: "Daniel Henríquez" },
  { dia: "Martes", hora: "10:00-11:30", area: "Talento Humano", responsable: "Silvia Ruiz" },
  { dia: "Miércoles", hora: "8:30-10:00", area: "Compras", responsable: "Samuel Ávila" },
  { dia: "Miércoles", hora: "10:00-11:30", area: "Legal", responsable: "Ángel Aguirre" },
  { dia: "Jueves", hora: "8:30-10:00", area: "Servicios Generales", responsable: "Ramiro Castejón" },
  { dia: "Jueves", hora: "10:00-11:30", area: "Contabilidad y Finanzas", responsable: "Wilfredo / Jeffrin" },
  { dia: "Viernes", hora: "8:30-10:00", area: "Procesos y Mejora Continua", responsable: "Carlos Rosales" },
  { dia: "Viernes", hora: "10:00-11:30", area: "Programación y Tecnología", responsable: "Víctor Hernández" },
];

function getStatusByDate(fecha: string): TaskStatus {
  const parts = fecha.split("/");
  const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return "vencida";
  return "pendiente";
}

export const INITIAL_TASKS: Task[] = [
  // ═══ CONSOLIDADO: Contabilidad y Finanzas (6) ═══
  {
    id: 1, area: "Contabilidad y Finanzas", reunion: "Contabilidad 27/03",
    tarea: "Copiar cifras de ingreso total y utilidad/pérdida de enero y febrero desde estados de resultados por empresa en plantilla",
    responsable: "Equipo de Contabilidad", fecha: "09/04/2026",
    propuesta: ["Acceder a los estados de resultados de cada empresa para enero y febrero", "Copiar las tres cifras clave (ingreso total, utilidad/pérdida del mes y acumulado)", "Pegar los datos en la plantilla con fórmulas para automatizar cálculos"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 2, area: "Contabilidad y Finanzas", reunion: "Contabilidad 27/03",
    tarea: "Preparar plantilla del resumen ejecutivo con fórmulas que automaticen cálculos de enero, febrero y acumulado por empresa",
    responsable: "Equipo de Contabilidad", fecha: "09/04/2026",
    propuesta: ["Diseñar plantilla en Excel con columnas para enero, febrero y acumulado", "Incorporar fórmulas que sumen y ordenen datos por tamaño de empresa", "Validar que la plantilla sea clara y permita resumen breve para gerencia"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 3, area: "Contabilidad y Finanzas", reunion: "Contabilidad 27/03",
    tarea: "Imprimir estados financieros de ocho empresas y limpiar saldos desde diciembre hasta febrero",
    responsable: "Equipo de Contabilidad", fecha: "09/04/2026",
    propuesta: ["Imprimir estados financieros completos de las ocho empresas", "Revisar y limpiar saldos iniciales desde diciembre hasta febrero", "Documentar ajustes realizados para seguimiento"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 4, area: "Contabilidad y Finanzas", reunion: "Contabilidad 27/03",
    tarea: "Cuadrar conciliaciones pendientes en solución Marlowe y otras empresas no revisadas",
    responsable: "Equipo de Contabilidad", fecha: "09/04/2026",
    propuesta: ["Identificar cuentas pendientes y conciliaciones en Marlowe", "Revisar y cuadrar cada cuenta pendiente en orden cronológico", "Registrar conciliaciones completadas y reportar incidencias"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 5, area: "Contabilidad y Finanzas", reunion: "Contabilidad 27/03",
    tarea: "Ordenar empresas en resumen ejecutivo de mayor a menor tamaño, incluyendo Blessing, S&M, Manciago y Daza",
    responsable: "Equipo de Contabilidad", fecha: "09/04/2026",
    propuesta: ["Listar todas las empresas con sus respectivos tamaños financieros", "Ordenar la lista de mayor a menor según ingreso o utilidad", "Incorporar esta ordenación en la plantilla del resumen ejecutivo"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 6, area: "Contabilidad y Finanzas", reunion: "Contabilidad 27/03",
    tarea: "Preparar documentación y material necesario para viaje relacionado con reunión en Japón",
    responsable: "Wilfredo Martinez Romero", fecha: "09/04/2026",
    propuesta: ["Reunir toda la documentación relevante para la reunión en Japón", "Preparar material de apoyo para presentación y logística", "Confirmar itinerario y requerimientos de viaje"],
    status: "pendiente", source: "consolidado"
  },
  // ═══ CONSOLIDADO: Desarrollo y Tecnología (15) ═══
  {
    id: 7, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Modificar el front para transferencia directa de candidatos a la plataforma de reclutamiento sin envío de correo",
    responsable: "CAP EMPRESARIAL", fecha: "07/04/2026",
    propuesta: ["Revisar el flujo actual que envía enlaces por correo para subir CV", "Implementar la función que descargue información o CV desde las fuentes y suba directamente a la plataforma interna", "Realizar pruebas internas para validar la transferencia directa sin correos"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 8, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Implementar reglas de filtrado automático para candidatos (ej. ajuste >70%)",
    responsable: "CAP EMPRESARIAL", fecha: "07/04/2026",
    propuesta: ["Definir criterios de filtrado basados en porcentaje de ajuste", "Programar el sistema para aceptar automáticamente candidatos que cumplan el corte", "Testear la reducción de candidatos para optimizar costos de IA"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 9, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Continuar pruebas en servidor propio y planificar migración a VPS de producción",
    responsable: "CAP EMPRESARIAL", fecha: "14/04/2026",
    propuesta: ["Ejecutar pruebas funcionales y de carga en servidor propio", "Documentar resultados y posibles ajustes", "Coordinar con Víctor la migración al VPS para ambiente productivo"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 10, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Mostrar al equipo funcionamiento de TeamTaylor en sesión posterior",
    responsable: "CAP EMPRESARIAL", fecha: "07/04/2026",
    propuesta: ["Preparar demo funcional de TeamTaylor", "Agendar sesión con el equipo involucrado", "Recoger feedback para mejoras"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 11, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Migrar sistema de recursos humanos al VPS para validar estructura y generar datos iniciales",
    responsable: "CAP EMPRESARIAL", fecha: "14/04/2026",
    propuesta: ["Coordinar con Víctor el acceso y configuración del VPS", "Realizar migración de base de datos y aplicaciones", "Validar integridad y generación de datos iniciales"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 12, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Definir y documentar criterios de contratación de sistemas, lenguaje, servidores y políticas de ciberseguridad",
    responsable: "CAP EMPRESARIAL", fecha: "14/04/2026",
    propuesta: ["Reunir requerimientos técnicos y normativos", "Elaborar documento con criterios y políticas", "Compartir con áreas involucradas para aprobación"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 13, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Elaborar plan de Business Intelligence definiendo orígenes de datos, reportes, accesos y arquitectura Power BI/SharePoint",
    responsable: "CAP EMPRESARIAL", fecha: "14/04/2026",
    propuesta: ["Identificar fuentes de datos relevantes", "Diseñar estructura de reportes y accesos", "Proponer arquitectura técnica para BI con Power BI y SharePoint"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 14, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Enviar solicitud de acceso a cuentas necesarias para integrar herramientas y grabaciones/traducciones de reuniones",
    responsable: "CAP EMPRESARIAL", fecha: "31/03/2026",
    propuesta: ["Listar cuentas y accesos requeridos", "Formalizar solicitud a Sindy o responsable", "Confirmar recepción y acceso concedido"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 15, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Compartir video instructivo de la aplicación con el equipo",
    responsable: "Emanuel (CAP EMPRESARIAL)", fecha: "07/04/2026",
    propuesta: ["Revisar y editar video instructivo", "Distribuir enlace o archivo a equipo involucrado", "Recoger dudas o comentarios para aclarar"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 16, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Integrar salida del bot consolidado con Planner para volcar tareas y acciones derivadas",
    responsable: "Emanuel (CAP EMPRESARIAL)", fecha: "14/04/2026",
    propuesta: ["Analizar formato de salida actual del bot", "Configurar integración con Microsoft Planner", "Testear creación automática de tareas"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 17, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Poner en productivo proceso de generación y consolidación de informes (Copilot) y programar capacitaciones",
    responsable: "Emanuel (CAP EMPRESARIAL)", fecha: "14/04/2026",
    propuesta: ["Validar aprobación final del proceso", "Implementar en ambiente productivo", "Coordinar y calendarizar capacitaciones por área"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 18, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Configurar flujo automático para enviar correos/recordatorios con link de plataforma a coordinadores",
    responsable: "Emanuel (CAP EMPRESARIAL)", fecha: "14/04/2026",
    propuesta: ["Crear plantilla de correo con link e instructivo", "Programar envío automático según calendario", "Verificar recepción y seguimiento"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 19, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Implementar solución OCR (Tesseract en Python) para procesar PDFs de relojes biométricos",
    responsable: "Emanuel (CAP EMPRESARIAL)", fecha: "14/04/2026",
    propuesta: ["Desarrollar script OCR con Tesseract para extracción de datos", "Probar con PDFs reales de relojes biométricos", "Integrar resultados con sistema de asistencia"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 20, area: "Desarrollo y Tecnología", reunion: "Tecnología 27/03",
    tarea: "Contactar a Recursos Humanos (Silvia) para definir suministro de información de relojes biométricos",
    responsable: "Emanuel (CAP EMPRESARIAL)", fecha: "31/03/2026",
    propuesta: ["Coordinar reunión con Silvia de RRHH", "Identificar método actual de entrega de datos", "Definir solución técnica óptima para integración"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 21, area: "Desarrollo y Tecnología", reunion: "Procesos 27/03",
    tarea: "Continuar pruebas en servidor propio y planificar migración a VPS",
    responsable: "CAP EMPRESARIAL", fecha: "14/04/2026",
    propuesta: ["Ejecutar pruebas funcionales y de carga", "Documentar resultados", "Coordinar migración al VPS"],
    status: "pendiente", source: "consolidado"
  },
  // ═══ CONSOLIDADO: Gerencia General (6) ═══
  {
    id: 22, area: "Gerencia General", reunion: "Coordinadores 24/03",
    tarea: "Coordinar con Víctor definición del mock-up del módulo de reclutamiento dentro del ERP",
    responsable: "Sindy Sarahi Castro", fecha: "07/04/2026",
    propuesta: ["Revisar mock-up actual y posibles mejoras", "Reunirse con Víctor para definir detalles técnicos y funcionales", "Documentar plan de sincronización y próximos pasos"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 23, area: "Gerencia General", reunion: "Coordinadores 24/03",
    tarea: "Presentar mock-up del flujo de reclutamiento a Vanessa a las 2 p.m.",
    responsable: "Sindy Sarahi Castro", fecha: "24/03/2026",
    propuesta: ["Preparar presentación clara y detallada", "Realizar presentación puntual a Vanessa", "Recoger feedback para ajustes"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 24, area: "Gerencia General", reunion: "Coordinadores 24/03",
    tarea: "Contactar al desarrollador responsable de la plataforma de reclutamiento para solicitar incrustar información",
    responsable: "Sindy Sarahi Castro", fecha: "07/04/2026",
    propuesta: ["Identificar contacto del desarrollador", "Enviar solicitud formal con requerimientos", "Coordinar seguimiento para implementación"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 25, area: "Gerencia General", reunion: "Coordinadores 24/03",
    tarea: "Coordinar sesión técnica con Víctor para revisar y optimizar dashboards de Power BI",
    responsable: "Sindy Sarahi Castro", fecha: "07/04/2026",
    propuesta: ["Agendar sesión con Víctor", "Preparar puntos de mejora y datos históricos", "Revisar dashboards y definir optimizaciones"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 26, area: "Gerencia General", reunion: "Coordinadores 24/03",
    tarea: "Preparar datos históricos operativos para apoyar confección del presupuesto 2027",
    responsable: "Sindy Sarahi Castro", fecha: "15/10/2026",
    propuesta: ["Recopilar datos históricos relevantes", "Organizar y validar información para análisis", "Entregar datos a equipo financiero para presupuesto"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 27, area: "Gerencia General", reunion: "Coordinadores 24/03",
    tarea: "Revisar dashboard de colaboradores y enviar observaciones cuando mejore conexión a internet",
    responsable: "Sindy Sarahi Castro", fecha: "07/04/2026",
    propuesta: ["Acceder al dashboard de colaboradores", "Documentar observaciones y mejoras necesarias", "Enviar feedback al equipo técnico"],
    status: "pendiente", source: "consolidado"
  },
  // ═══ CONSOLIDADO: Talento Humano (5) ═══
  {
    id: 28, area: "Talento Humano", reunion: "Capacitación 25/03",
    tarea: "Realizar una prueba de programación de reunión y verificación de recordatorios en el calendario",
    responsable: "Usuarios de capacitación", fecha: "08/04/2026",
    propuesta: ["Programar una reunión de prueba usando Outlook/Teams", "Verificar que los recordatorios funcionen correctamente", "Reportar cualquier problema al equipo de TI"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 29, area: "Talento Humano", reunion: "Capacitación 25/03",
    tarea: "Crear tareas en Planner y asignar fecha de vencimiento para entregas acordadas",
    responsable: "Usuarios de capacitación", fecha: "08/04/2026",
    propuesta: ["Acceder a Planner y crear las tareas correspondientes", "Asignar responsables y fechas de vencimiento claras", "Monitorear el progreso y actualizar el estado regularmente"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 30, area: "Talento Humano", reunion: "Capacitación 25/03",
    tarea: "Revisar en Outlook el apartado 'Asignado a mí' para verificar tareas y fechas de vencimiento",
    responsable: "Usuarios de capacitación", fecha: "08/04/2026",
    propuesta: ["Abrir Outlook y navegar a 'Asignado a mí'", "Revisar las tareas asignadas y sus fechas límite", "Priorizar y planificar la ejecución según fechas"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 31, area: "Talento Humano", reunion: "Capacitación 25/03",
    tarea: "Usar autenticación multifactor en la cuenta de Microsoft para aumentar la seguridad",
    responsable: "Usuarios de capacitación", fecha: "08/04/2026",
    propuesta: ["Acceder a la configuración de seguridad de Microsoft 365", "Activar la autenticación multifactor", "Confirmar el correcto funcionamiento con un inicio de sesión de prueba"],
    status: "pendiente", source: "consolidado"
  },
  {
    id: 32, area: "Talento Humano", reunion: "Capacitación 25/03",
    tarea: "Enviar al ponente cualquier consulta por chat de Teams o teléfono según contacto compartido",
    responsable: "Usuarios de capacitación", fecha: "08/04/2026",
    propuesta: ["Anotar dudas o consultas surgidas tras la capacitación", "Contactar al ponente vía chat de Teams o teléfono", "Registrar respuestas para compartir con el equipo"],
    status: "pendiente", source: "consolidado"
  },
  // ═══ LEGAL: Permisos y trámites operativos (8) ═══
  {
    id: 33, area: "Legal", reunion: "Legal 25/03",
    tarea: "Verificar expediente y estatus del trámite UGA/UBA para permisos de operación en el complejo de bodegas",
    responsable: "Abogado / Gestión Administrativa", fecha: "28/03/2026",
    propuesta: ["Revisar expediente en la UGA/UBA in situ y documentar pendientes", "Contactar a Ricardo y Garetto de Alcaldía para destrabe", "Enviar reporte con próximos pasos y fechas comprometidas"],
    status: "pendiente", source: "legal"
  },
  {
    id: 34, area: "Legal", reunion: "Legal 25/03",
    tarea: "Dar seguimiento a compatibilidad/factibilidad (post-Semana Santa) para sucursales Castaños y otras",
    responsable: "Operaciones / Abogado", fecha: "01/04/2026",
    propuesta: ["Confirmar recepción de compatibilidades y remitir a área legal", "Preparar solicitudes de apertura por sucursal en Alcaldía", "Consolidar requisitos por sucursal"],
    status: "pendiente", source: "legal"
  },
  {
    id: 35, area: "Legal", reunion: "Legal 25/03",
    tarea: "Gestionar inspección y recomendaciones para Plan de Emergencia/Contingencia",
    responsable: "Seguridad y Salud / Abogado", fecha: "05/04/2026",
    propuesta: ["Solicitar supervisión al proyecto vía CODEM", "Coordinar con contacto referido en CODEM", "Agendar capacitación posterior según recomendaciones"],
    status: "pendiente", source: "legal"
  },
  {
    id: 36, area: "Legal", reunion: "Legal 25/03",
    tarea: "Rehabilitar conexión eléctrica (robo de cable en Farías) y validar bancada de energía",
    responsable: "Mantenimiento / Compras", fecha: "29/03/2026",
    propuesta: ["Verificar expediente con la empresa eléctrica (TVN)", "Gestionar reposición de cableado y seguridad perimetral", "Obtener confirmación de conexión y prueba de carga"],
    status: "pendiente", source: "legal"
  },
  {
    id: 37, area: "Legal", reunion: "Legal 25/03",
    tarea: "Consultar y cerrar firma de contrato con DNI",
    responsable: "Jessica / Abogado", fecha: "27/03/2026",
    propuesta: ["Confirmar disponibilidad de firma con Jessica", "Preparar minuta final y validar condiciones", "Enviar copias firmadas y resguardo en archivo legal"],
    status: "pendiente", source: "legal"
  },
  {
    id: 38, area: "Legal", reunion: "Legal 25/03",
    tarea: "Solicitar constancias del Ministerio Público y gestionar 'pronto despacho' con fiscales",
    responsable: "Abogado", fecha: "26/03/2026",
    propuesta: ["Preparar expediente y oficios para constancias", "Coordinar con fiscales (Ana y contacto adicional)", "Remitir acuse y tiempos estimados a gerencia"],
    status: "pendiente", source: "legal"
  },
  {
    id: 39, area: "Legal", reunion: "Legal 25/03",
    tarea: "Revisar RTN/RTM y posibles impactos en historial y bancos",
    responsable: "Contabilidad / Legal", fecha: "02/04/2026",
    propuesta: ["Verificar cambios en RTM y concordancia con escrituras", "Actualizar datos en bancos y cámaras de comercio", "Documentar evidencias de actualización para auditoría"],
    status: "pendiente", source: "legal"
  },
  {
    id: 40, area: "Legal", reunion: "Legal 25/03",
    tarea: "Explorar apertura de sucursales vía Alcaldía (orientación y costos)",
    responsable: "Abogado / Enlace local", fecha: "01/04/2026",
    propuesta: ["Consultar con amigo en Alcaldía sobre procedimiento y tasas", "Armar checklist por sucursal", "Presentar estimación de costos y plazos a gerencia"],
    status: "pendiente", source: "legal"
  },
  // ═══ LEGAL: Compras y logística (2) ═══
  {
    id: 41, area: "Compras y Logística", reunion: "Legal 25/03",
    tarea: "Adquirir GPS para vehículo (Yaris/moto) y coordinar instalación",
    responsable: "Compras (Samuel) / Flota", fecha: "27/03/2026",
    propuesta: ["Solicitar cotizaciones y elegir proveedor con instalación incluida", "Coordinar instalación en Yaris o moto según disponibilidad", "Registrar dispositivo y accesos con Jessica"],
    status: "pendiente", source: "legal"
  },
  {
    id: 42, area: "Compras y Logística", reunion: "Legal 25/03",
    tarea: "Confirmar apoyo para compras en China y definición de roles",
    responsable: "Jessica / Compras (Samuel)", fecha: "29/03/2026",
    propuesta: ["Contactar a la persona referida para sourcing en China", "Definir división de tareas", "Acordar SLA de tiempos, calidad y validaciones"],
    status: "pendiente", source: "legal"
  },
  // ═══ LEGAL: Legal laboral y RR.HH. (4) ═══
  {
    id: 43, area: "Legal Laboral y RR.HH.", reunion: "Legal 25/03",
    tarea: "Diseñar y aprobar protocolo de separación de personal",
    responsable: "RR.HH. / Abogado", fecha: "03/04/2026",
    propuesta: ["Elaborar flujo: evaluación, preaviso, cálculo, validación, conciliación", "Coordinar validación en Secretaría de Trabajo", "Establecer fechas de separación para ordenar nómina"],
    status: "pendiente", source: "legal"
  },
  {
    id: 44, area: "Legal Laboral y RR.HH.", reunion: "Legal 25/03",
    tarea: "Preparar expedientes completos para próximas separaciones (3-4 personas)",
    responsable: "RR.HH.", fecha: "05/04/2026",
    propuesta: ["Reunir contratos, evaluaciones, vacaciones, horas extra y cálculos finales", "Obtener aprobación gerencial y agenda de conciliación", "Definir forma y fecha de pago y notificación formal"],
    status: "pendiente", source: "legal"
  },
  {
    id: 45, area: "Legal Laboral y RR.HH.", reunion: "Legal 25/03",
    tarea: "Consultar en Secretaría de Trabajo sobre liquidación anual y fondo de reserva laboral",
    responsable: "Abogado / RR.HH.", fecha: "29/03/2026",
    propuesta: ["Solicitar criterio escrito sobre liquidación anual vs. fondo de reserva", "Cuantificar impacto de aportes (RAP 1.5% + fondo reserva 500 HNL)", "Proponer política interna y cronograma de cumplimiento"],
    status: "pendiente", source: "legal"
  },
  {
    id: 46, area: "Legal Laboral y RR.HH.", reunion: "Legal 25/03",
    tarea: "Coordinar conciliaciones pendientes (Gabriel Sierra y otros)",
    responsable: "Abogado / RR.HH.", fecha: "30/03/2026",
    propuesta: ["Contactar a las partes y confirmar pagos adeudados", "Programar citas de conciliación en Secretaría de Trabajo", "Recabar firmas de finiquito y archivo de evidencias"],
    status: "pendiente", source: "legal"
  },
  // ═══ LEGAL: Contratos y coordinación legal (2) ═══
  {
    id: 47, area: "Contratos y Coordinación Legal", reunion: "Legal 25/03",
    tarea: "Consolidar detalles del acuerdo con Ramiro Castemón y reunión con abogado",
    responsable: "Ramiro / Abogado", fecha: "28/03/2026",
    propuesta: ["Definir alcance, honorarios, condiciones y plazos", "Agendar reunión abogado-Ramiro para firma/ajustes", "Enviar resumen ejecutivo a gerencia con hitos y costos"],
    status: "pendiente", source: "legal"
  },
  {
    id: 48, area: "Contratos y Coordinación Legal", reunion: "Legal 25/03",
    tarea: "Gestionar firmas y seguimiento de compatibilidad del kit y biodivisor de los MAPS",
    responsable: "Proyectos / Legal", fecha: "31/03/2026",
    propuesta: ["Verificar pase a área legal y requerimientos complementarios", "Dar seguimiento semanal hasta resolución", "Presentar recibos/documentos requeridos en MAPS"],
    status: "pendiente", source: "legal"
  },
  // ═══ LEGAL: Vínculos institucionales (1) ═══
  {
    id: 49, area: "Vínculos Institucionales", reunion: "Legal 25/03",
    tarea: "Activar red de apoyo en CODEM/COPECO/Alcaldía para trámites críticos",
    responsable: "Dirección / Abogado", fecha: "29/03/2026",
    propuesta: ["Contactar a amigo con enlace en CODEM y evaluar apoyo", "Si COPECO se mantiene complejo, priorizar CODEM y Alcaldía", "Definir calendario de visitas y responsables por institución"],
    status: "pendiente", source: "legal"
  },
].map(t => ({ ...t, status: getStatusByDate(t.fecha) as TaskStatus }));
