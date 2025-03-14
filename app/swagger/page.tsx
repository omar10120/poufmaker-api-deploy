"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import SwaggerUIReact from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI with proper typing
const SwaggerUI = dynamic<typeof SwaggerUIReact>(
  () => import("swagger-ui-react"),
  { ssr: false }
);

export default function SwaggerPage() {
  const [swaggerSpec, setSwaggerSpec] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetch("/api/swagger")
      .then((res) => res.json())
      .then((data) => setSwaggerSpec(data))
      .catch((err) => console.error("Error loading Swagger Spec:", err));
  }, []);

  if (!swaggerSpec) return <p>Loading Swagger...</p>;

  return <SwaggerUI url="/api/swagger" />;
 }
