// This file is deprecated. Using /app/api/swagger/route.ts instead.

import { NextApiRequest, NextApiResponse } from "next";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import options from "../lib/swagger";

const specs = swaggerJsdoc(options);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.send(swaggerUi.generateHTML(specs));
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
