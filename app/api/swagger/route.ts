import { NextRequest, NextResponse } from "next/server";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerConfig from "./swaggerConfig";

export async function GET(req: NextRequest) {
  const swaggerSpec = swaggerJsdoc(swaggerConfig);

  return NextResponse.json(swaggerSpec);
}
