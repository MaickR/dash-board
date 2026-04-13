# Brainstorm — Dashboard de Control de Reuniones CAP

<response>
<text>
## Idea 1: "Corporate Command Center" — Estilo Swiss/International Typographic

**Design Movement:** Swiss/International Typographic Style con influencia de paneles de control industrial.

**Core Principles:**
1. Jerarquía tipográfica extrema — los números y estados dominan visualmente
2. Grid rígido con módulos funcionales claramente delimitados
3. Información densa pero legible — cada píxel tiene propósito
4. Contraste alto entre estados (rojo CAP como acento dominante)

**Color Philosophy:** Negro #1a1a1a como fondo principal (autoridad, seriedad ejecutiva), rojo #C0392B como acento para estados críticos y acciones, blanco para texto y tarjetas elevadas. Gris #2a2a2a para tarjetas secundarias. Verde esmeralda #27AE60 para "Realizada", ámbar #F39C12 para "Pendiente".

**Layout Paradigm:** Dashboard de panel lateral fijo izquierdo (sidebar con identidad CAP + navegación de semanas) y área principal con grid asimétrico de tarjetas. Cada día de la semana es una columna con sus reuniones apiladas verticalmente.

**Signature Elements:**
1. Indicadores de estado tipo "semáforo" con animación de pulso para pendientes
2. Barra de progreso semanal en el header que muestra % de reuniones completadas
3. Micro-badges con conteo de tareas por área

**Interaction Philosophy:** Clicks directos en tarjetas para cambiar estado. Transiciones suaves tipo slide. Hover revela detalles adicionales.

**Animation:** Entrada escalonada de tarjetas (stagger), counters animados, transiciones de estado con morphing de color.

**Typography System:** DM Sans (bold, 700) para títulos y números grandes. DM Sans (regular, 400) para cuerpo. Monospace para fechas y contadores.
</text>
<probability>0.08</probability>
</response>

<response>
<text>
## Idea 2: "Executive Briefing Board" — Estilo Editorial/Magazine

**Design Movement:** Editorial design con influencia de dashboards financieros tipo Bloomberg Terminal simplificado.

**Core Principles:**
1. Lectura rápida tipo "briefing matutino" — escaneable en 30 segundos
2. Datos tabulares con acentos visuales mínimos pero impactantes
3. Separación clara entre semana actual y anterior
4. Acciones inmediatas sin modales ni pasos extra

**Color Philosophy:** Fondo blanco cremoso #FAFAF8 para lectura prolongada, negro #1a1a1a para texto principal, rojo #C0392B exclusivamente para alertas y el logo. Gris cálido #F5F0EB para secciones alternas. Verde #2ECC71 discreto para completado.

**Layout Paradigm:** Layout de una columna principal tipo periódico con secciones horizontales. Header con resumen ejecutivo, luego tabla expandida por día con filas de reuniones. Sidebar derecho colapsable con estadísticas.

**Signature Elements:**
1. "Ticker" superior con resumen: "5/9 reuniones completadas esta semana"
2. Línea temporal horizontal que marca el día actual
3. Badges tipográficos (no iconos) para estados

**Interaction Philosophy:** Interacciones mínimas — un click cambia estado. Sin animaciones distractoras. Feedback inmediato con cambio de color.

**Animation:** Transiciones CSS puras de 200ms. Sin animaciones de entrada. Solo feedback de estado.

**Typography System:** Playfair Display para el título principal. Source Sans 3 para todo el contenido. Tabular numbers para alineación en tablas.
</text>
<probability>0.05</probability>
</response>

<response>
<text>
## Idea 3: "Kanban Ejecutivo" — Estilo Notion/Linear Meets Corporate

**Design Movement:** Product design moderno (Linear, Notion) adaptado a identidad corporativa hondureña.

**Core Principles:**
1. Cada día es un "carril" visual con sus reuniones como tarjetas
2. Estados como chips de color con transición fluida
3. Vista comparativa lado a lado (esta semana vs anterior)
4. Densidad informativa alta con jerarquía clara

**Color Philosophy:** Fondo #0F0F0F (casi negro) con tarjetas en #1a1a1a elevadas con sutil borde. Rojo #C0392B como color primario de acción y brand. Blanco #FFFFFF para texto. Gris #6B7280 para metadata. Verde #10B981 para completado, ámbar #F59E0B para pendiente.

**Layout Paradigm:** Grid de 5 columnas (lun-vie) con scroll horizontal en mobile. Header fijo con KPIs. Cada columna tiene las reuniones del día como tarjetas apiladas con estado visible.

**Signature Elements:**
1. Progress ring circular en el header mostrando completitud semanal
2. Tarjetas con borde izquierdo de color según estado
3. Comparativa visual con flechas de tendencia (↑↓) vs semana anterior

**Interaction Philosophy:** Drag-free — solo clicks para cambiar estado. Dropdown para seleccionar semana. Tooltips para detalles de ayuda memoria.

**Animation:** Framer Motion para entrada de tarjetas, transiciones de estado con spring physics, counters con animación numérica.

**Typography System:** Geist Sans para todo (moderna, técnica, legible). Weights: 700 para títulos, 500 para labels, 400 para cuerpo. Geist Mono para números y fechas.
</text>
<probability>0.07</probability>
</response>
