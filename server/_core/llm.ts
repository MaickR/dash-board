import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const shouldUseLocalFallback = () => !ENV.forgeApiKey && (!ENV.isProduction || ENV.allowLocalFallback);

const extractText = (content: MessageContent | MessageContent[]) =>
  ensureArray(content)
    .map(part => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      if (part.type === "file_url") return `[archivo:${part.file_url.mime_type ?? "desconocido"}]`;
      if (part.type === "image_url") return `[imagen]`;
      return "";
    })
    .join("\n");

const buildTaskExtractionPayload = () => ({
  tareas: [
    {
      nombre: "Dar seguimiento a acuerdos pendientes",
      tarea: "Revisar los acuerdos abiertos de la reunión y confirmar responsables y fechas compromiso.",
      responsable: "Coordinación del área",
      fecha: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("es-HN"),
      propuesta: [
        "Validar el estado actual de cada acuerdo",
        "Actualizar la fecha objetivo con el responsable",
        "Registrar el siguiente paso en el tablero",
      ],
      area: "General",
    },
  ],
});

const buildTaskArrayPayload = () => ([
  {
    nombre: "Dar seguimiento a acuerdos pendientes",
    descripcion: "Revisar acuerdos abiertos y definir siguiente acción concreta.",
    responsable: "Coordinación del área",
    area: "General",
    prioridad: "media",
    fechaLimite: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("es-HN"),
  },
]);

const buildFallbackText = (messages: Message[]) => {
  const userMessage = [...messages].reverse().find(message => message.role === "user");
  const promptText = messages.map(message => extractText(message.content)).join("\n\n").toLowerCase();

  if (promptText.includes("agenda sugerida") || promptText.includes("puntos de agenda")) {
    return [
      "1. Revisar el estado de los compromisos pendientes y sus bloqueos.",
      "2. Confirmar responsables y fechas de cierre de tareas críticas.",
      "3. Priorizar incidencias vencidas o con riesgo operativo.",
      "4. Validar próximos entregables y dependencias entre áreas.",
      "5. Definir acuerdos y seguimiento antes de la siguiente reunión.",
    ].join("\n");
  }

  if (promptText.includes("ayuda memoria")) {
    return [
      "# Ayuda memoria",
      "",
      "## Resumen",
      "Se consolidó un borrador local porque no hay proveedor de IA configurado en este entorno.",
      "",
      "## Acuerdos sugeridos",
      "- Validar tareas pendientes y responsables.",
      "- Confirmar fechas compromiso críticas.",
      "- Registrar próximos pasos en el tablero.",
    ].join("\n");
  }

  return `Respuesta local de ARIA: ${extractText(userMessage?.content ?? "Sin mensaje")}`;
};

const buildFallbackInvokeResult = (params: InvokeParams): InvokeResult => {
  const responseFormat = normalizeResponseFormat(params);
  let content: string;

  if (responseFormat?.type === "json_schema") {
    const schema = responseFormat.json_schema.schema as { properties?: Record<string, unknown> };
    if (schema?.properties && "tareas" in schema.properties) {
      content = JSON.stringify(buildTaskExtractionPayload());
    } else {
      content = JSON.stringify({ ok: true });
    }
  } else {
    const promptText = params.messages.map(message => extractText(message.content)).join("\n\n").toLowerCase();
    if (promptText.includes("json array") || promptText.includes("extrae todas las tareas") || promptText.includes("extraer tareas")) {
      content = JSON.stringify(buildTaskArrayPayload());
    } else {
      content = buildFallbackText(params.messages);
    }
  }

  return {
    id: "local-llm-fallback",
    created: Math.floor(Date.now() / 1000),
    model: "local-dev-fallback",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (shouldUseLocalFallback()) {
    return buildFallbackInvokeResult(params);
  }

  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768
  payload.thinking = {
    "budget_tokens": 128
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
