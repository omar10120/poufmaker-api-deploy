'use client';

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUIComponent = dynamic<typeof SwaggerUI>(
  () => import("swagger-ui-react"),
  { ssr: false }
);

export default function SwaggerPage() {
  return <SwaggerUIComponent url="/api/swagger" />;
}
