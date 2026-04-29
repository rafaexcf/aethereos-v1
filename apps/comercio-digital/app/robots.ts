import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://comercio.digital";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/precos", "/sobre"],
        disallow: ["/app/", "/api/", "/embed/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
