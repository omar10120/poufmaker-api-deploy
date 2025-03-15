"use client";

import dynamic from "next/dynamic";
import type SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUIComponent = dynamic<typeof SwaggerUI>(
  () => import("swagger-ui-react"),
  { ssr: false }
);

export default function SwaggerPage() {
  return (
    <div className="swagger-container">
      <SwaggerUIComponent
        url="/api/swagger"
        docExpansion="list"
        defaultModelsExpandDepth={-1}
      />
      <style jsx global>{`
        html {
          height: 100vh;
        }
        body {
          height: 100vh;
          margin: 0;
        }
        .swagger-container {
          height: 100vh;
          padding: 1rem;
        }
        .swagger-ui {
          font-family: system-ui, -apple-system, sans-serif;
        }
        .swagger-ui .info .title {
          color: #000;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.2rem;
          padding: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
