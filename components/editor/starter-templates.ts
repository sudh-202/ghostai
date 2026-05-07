import {
  CANVAS_NODE_COLOR_THEMES,
  DEFAULT_CANVAS_NODE_COLOR_THEME,
} from "@/types/canvas"
import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeColorTheme,
  CanvasNodeShape,
  CanvasShapeSize,
} from "@/types/canvas"

export type CanvasTemplate = {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

const CANVAS_THEME_BY_ID = new Map(
  CANVAS_NODE_COLOR_THEMES.map((theme) => [theme.id, theme] as const)
)

function getTemplateTheme(themeId: string): CanvasNodeColorTheme {
  return CANVAS_THEME_BY_ID.get(themeId) ?? DEFAULT_CANVAS_NODE_COLOR_THEME
}

function createTemplateNode({
  id,
  label,
  shape,
  size,
  themeId,
  x,
  y,
}: {
  id: string
  label: string
  shape: CanvasNodeShape
  size: CanvasShapeSize
  themeId: string
  x: number
  y: number
}): CanvasNode {
  const theme = getTemplateTheme(themeId)

  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width: size.width,
    height: size.height,
    data: {
      label,
      color: theme.color,
      textColor: theme.textColor,
      shape,
    },
  }
}

function createTemplateEdge({
  id,
  source,
  target,
  label = "",
}: {
  id: string
  source: string
  target: string
  label?: string
}): CanvasEdge {
  return {
    id,
    source,
    target,
    type: "canvasEdge",
    data: {
      label,
    },
  }
}

const WIDE_NODE = { width: 188, height: 96 }
const RECTANGLE_NODE = { width: 180, height: 104 }
const ROUND_NODE = { width: 156, height: 156 }
const BUS_NODE = { width: 212, height: 132 }
const SERVICE_NODE = { width: 172, height: 100 }

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description:
      "A service-oriented system with a gateway, shared event stream, and supporting data services.",
    nodes: [
      createTemplateNode({
        id: "gateway",
        label: "API Gateway",
        shape: "pill",
        size: WIDE_NODE,
        themeId: "steel",
        x: 272,
        y: 0,
      }),
      createTemplateNode({
        id: "auth",
        label: "Auth Service",
        shape: "rectangle",
        size: SERVICE_NODE,
        themeId: "plum",
        x: 28,
        y: 168,
      }),
      createTemplateNode({
        id: "orders",
        label: "Orders Service",
        shape: "rectangle",
        size: SERVICE_NODE,
        themeId: "steel",
        x: 250,
        y: 168,
      }),
      createTemplateNode({
        id: "catalog",
        label: "Catalog Service",
        shape: "rectangle",
        size: SERVICE_NODE,
        themeId: "mint",
        x: 472,
        y: 168,
      }),
      createTemplateNode({
        id: "payments",
        label: "Payments Service",
        shape: "rectangle",
        size: SERVICE_NODE,
        themeId: "rose",
        x: 694,
        y: 168,
      }),
      createTemplateNode({
        id: "events",
        label: "Event Bus",
        shape: "cylinder",
        size: BUS_NODE,
        themeId: "amber",
        x: 270,
        y: 364,
      }),
      createTemplateNode({
        id: "users-db",
        label: "Users DB",
        shape: "cylinder",
        size: { width: 164, height: 122 },
        themeId: "mint",
        x: 24,
        y: 394,
      }),
      createTemplateNode({
        id: "audit",
        label: "Audit Log",
        shape: "hexagon",
        size: { width: 194, height: 142 },
        themeId: "slate",
        x: 620,
        y: 358,
      }),
    ],
    edges: [
      createTemplateEdge({ id: "gateway-auth", source: "gateway", target: "auth" }),
      createTemplateEdge({ id: "gateway-orders", source: "gateway", target: "orders" }),
      createTemplateEdge({ id: "gateway-catalog", source: "gateway", target: "catalog" }),
      createTemplateEdge({ id: "gateway-payments", source: "gateway", target: "payments" }),
      createTemplateEdge({ id: "auth-users-db", source: "auth", target: "users-db" }),
      createTemplateEdge({ id: "orders-events", source: "orders", target: "events" }),
      createTemplateEdge({ id: "catalog-events", source: "catalog", target: "events" }),
      createTemplateEdge({ id: "payments-events", source: "payments", target: "events" }),
      createTemplateEdge({ id: "events-audit", source: "events", target: "audit" }),
    ],
  },
  {
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "A release flow from source commit through build, test, validation, and production deploy.",
    nodes: [
      createTemplateNode({
        id: "commit",
        label: "Commit",
        shape: "circle",
        size: ROUND_NODE,
        themeId: "plum",
        x: 0,
        y: 118,
      }),
      createTemplateNode({
        id: "build",
        label: "Build",
        shape: "rectangle",
        size: RECTANGLE_NODE,
        themeId: "steel",
        x: 222,
        y: 144,
      }),
      createTemplateNode({
        id: "test",
        label: "Test Suite",
        shape: "diamond",
        size: { width: 172, height: 172 },
        themeId: "mint",
        x: 452,
        y: 108,
      }),
      createTemplateNode({
        id: "package",
        label: "Package",
        shape: "pill",
        size: WIDE_NODE,
        themeId: "slate",
        x: 692,
        y: 148,
      }),
      createTemplateNode({
        id: "staging",
        label: "Deploy Staging",
        shape: "rectangle",
        size: { width: 196, height: 108 },
        themeId: "amber",
        x: 930,
        y: 0,
      }),
      createTemplateNode({
        id: "smoke",
        label: "Smoke Test",
        shape: "hexagon",
        size: { width: 194, height: 142 },
        themeId: "steel",
        x: 930,
        y: 214,
      }),
      createTemplateNode({
        id: "prod",
        label: "Deploy Prod",
        shape: "cylinder",
        size: BUS_NODE,
        themeId: "rose",
        x: 1180,
        y: 104,
      }),
    ],
    edges: [
      createTemplateEdge({ id: "commit-build", source: "commit", target: "build" }),
      createTemplateEdge({ id: "build-test", source: "build", target: "test" }),
      createTemplateEdge({ id: "test-package", source: "test", target: "package" }),
      createTemplateEdge({
        id: "package-staging",
        source: "package",
        target: "staging",
      }),
      createTemplateEdge({ id: "staging-smoke", source: "staging", target: "smoke" }),
      createTemplateEdge({ id: "smoke-prod", source: "smoke", target: "prod" }),
    ],
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description:
      "An event pipeline with producers, a broker, background consumers, and downstream sinks.",
    nodes: [
      createTemplateNode({
        id: "frontend",
        label: "Frontend App",
        shape: "rectangle",
        size: { width: 188, height: 104 },
        themeId: "steel",
        x: 0,
        y: 148,
      }),
      createTemplateNode({
        id: "ingest",
        label: "Ingestion API",
        shape: "pill",
        size: WIDE_NODE,
        themeId: "mint",
        x: 248,
        y: 148,
      }),
      createTemplateNode({
        id: "broker",
        label: "Message Broker",
        shape: "cylinder",
        size: { width: 236, height: 148 },
        themeId: "amber",
        x: 534,
        y: 124,
      }),
      createTemplateNode({
        id: "workers",
        label: "Worker Pool",
        shape: "hexagon",
        size: { width: 210, height: 154 },
        themeId: "plum",
        x: 854,
        y: 0,
      }),
      createTemplateNode({
        id: "notifications",
        label: "Notifications",
        shape: "rectangle",
        size: { width: 200, height: 108 },
        themeId: "rose",
        x: 850,
        y: 236,
      }),
      createTemplateNode({
        id: "analytics",
        label: "Analytics",
        shape: "diamond",
        size: { width: 182, height: 182 },
        themeId: "steel",
        x: 1120,
        y: 20,
      }),
      createTemplateNode({
        id: "dlq",
        label: "Dead Letter Queue",
        shape: "cylinder",
        size: { width: 198, height: 132 },
        themeId: "slate",
        x: 1130,
        y: 246,
      }),
    ],
    edges: [
      createTemplateEdge({ id: "frontend-ingest", source: "frontend", target: "ingest" }),
      createTemplateEdge({ id: "ingest-broker", source: "ingest", target: "broker" }),
      createTemplateEdge({ id: "broker-workers", source: "broker", target: "workers" }),
      createTemplateEdge({
        id: "broker-notifications",
        source: "broker",
        target: "notifications",
      }),
      createTemplateEdge({
        id: "workers-analytics",
        source: "workers",
        target: "analytics",
      }),
      createTemplateEdge({ id: "workers-dlq", source: "workers", target: "dlq" }),
      createTemplateEdge({
        id: "notifications-analytics",
        source: "notifications",
        target: "analytics",
      }),
    ],
  },
]

export function cloneCanvasTemplate(template: CanvasTemplate): CanvasTemplate {
  return {
    ...template,
    nodes: template.nodes.map((node) => ({
      ...node,
      position: {
        ...node.position,
      },
      data: {
        ...node.data,
      },
    })),
    edges: template.edges.map((edge) => ({
      ...edge,
      data: edge.data
        ? {
            ...edge.data,
          }
        : {
            label: "",
          },
    })),
  }
}
