import { NextResponse } from "next/server";
import swaggerJsdoc from "swagger-jsdoc";
import options from "../lib/swagger";

const specs = swaggerJsdoc(options);

export async function GET() {
  return new NextResponse(JSON.stringify(specs), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
