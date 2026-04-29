import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

export interface SdkConfig {
  serviceName: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
}

let _sdk: NodeSDK | null = null;

export function startSdk(config: SdkConfig): void {
  if (_sdk !== null) return;

  const endpoint =
    config.otlpEndpoint ??
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ??
    "http://localhost:4318";

  _sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion ?? "0.0.0",
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    // Metrics auto-configured from OTEL_METRICS_EXPORTER=otlp env var at runtime
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  _sdk.start();

  process.on("SIGTERM", () => {
    void _sdk?.shutdown();
  });
}

export function stopSdk(): Promise<void> {
  return _sdk?.shutdown() ?? Promise.resolve();
}
