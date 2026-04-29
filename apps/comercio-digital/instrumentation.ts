export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    const { startSdk } = await import("@aethereos/observability");
    // OTEL_EXPORTER_OTLP_ENDPOINT is read from env by startSdk when not passed
    startSdk({
      serviceName: "comercio-digital",
      serviceVersion: process.env["npm_package_version"] ?? "0.0.0",
    });
  }
}
