"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import Swagger UI (avoids SSR issues)
const SwaggerUI = dynamic(() => import("swagger-ui-react") as any, { ssr: false });

type OpenAPISpec = {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, any>;
  components?: Record<string, any>;
};

export default function SwaggerPage() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);

  useEffect(() => {
    fetch("/openapi.json")
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error("Failed to load Swagger JSON", err));
  }, []);

  if (!spec) return <p>Loading Swagger...</p>;

  // Explicitly cast SwaggerUI as any to avoid type errors
  const SwaggerComponent = SwaggerUI as any;

  return <SwaggerComponent spec={spec} />;
}
