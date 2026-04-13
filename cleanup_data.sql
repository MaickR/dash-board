-- ARIA Dashboard Data Cleanup Script
-- Removes all work records while preserving structure and master data

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete work records (preserve master data and structure)
DELETE FROM briefs;
DELETE FROM brief_enviados;
DELETE FROM tarea_borradores;
DELETE FROM prompt_templates_am;
DELETE FROM prompt_templates;
DELETE FROM acuerdos;
DELETE FROM task_followers;
DELETE FROM task_sections;
DELETE FROM tiempo_registros;
DELETE FROM notificaciones;
DELETE FROM correos;
DELETE FROM etiquetas;
DELETE FROM actividad_tarea;
DELETE FROM adjuntos;
DELETE FROM archivos;
DELETE FROM notas;
DELETE FROM tareas;
DELETE FROM reuniones;
DELETE FROM automatizaciones;
DELETE FROM informes_mensuales;
DELETE FROM informes;
DELETE FROM departamento_historial;
DELETE FROM drive_archivos;

-- Keep master data intact:
-- - departamentos (master data)
-- - responsables (master data)
-- - organizacion (structure)
-- - config_brief (configuration)
-- - system_config (configuration)
-- - users (system users)

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify cleanup
SELECT 'Cleanup complete. Record counts:' as status;
SELECT 'tareas' as table_name, COUNT(*) as record_count FROM tareas
UNION ALL
SELECT 'reuniones', COUNT(*) FROM reuniones
UNION ALL
SELECT 'acuerdos', COUNT(*) FROM acuerdos
UNION ALL
SELECT 'tareas_borradores', COUNT(*) FROM tarea_borradores
UNION ALL
SELECT 'notificaciones', COUNT(*) FROM notificaciones
UNION ALL
SELECT 'briefs', COUNT(*) FROM briefs
UNION ALL
SELECT 'departamentos', COUNT(*) FROM departamentos
UNION ALL
SELECT 'responsables', COUNT(*) FROM responsables;
