"use client";

import dynamic from "next/dynamic";
import type SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const DynamicSwaggerUI = dynamic<typeof SwaggerUI>(() => import("swagger-ui-react"), { ssr: false });

export default function SwaggerPage() {
  return (
    <DynamicSwaggerUI
      url="/api/swagger"
      docExpansion="list"
      defaultModelExpandDepth={3}
      persistAuthorization={true}
    />
  );
}
