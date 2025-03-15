import { NextApiRequest, NextApiResponse } from "next";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import options from "../lib/swagger";

const specs = swaggerJsdoc(options);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
