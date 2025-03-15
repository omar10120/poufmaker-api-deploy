import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user in the database.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 example: "securepassword"
 *               phoneNumber:
 *                 type: string
 *                 example: "1234567890"
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Validation error or user already exists.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { fullName, email, password, phoneNumber } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const confirmationToken = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        fullName,
        email,
        phoneNumber,
        passwordHash,
        passwordSalt: salt,
        confirmationToken,
      },
    });

    res.status(201).json({ message: "User registered successfully. Please confirm your email." });
  } catch (error) {
    res.status(400).json({ error: "Something went wrong" });
  }
}
