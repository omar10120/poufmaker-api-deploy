import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import crypto from "crypto";

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user in the database
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
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
 *                 format: password
 *                 example: "securepassword"
 *               phoneNumber:
 *                 type: string
 *                 example: "1234567890"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Register request body:", body);

    const { fullName, email, password, phoneNumber } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { Email: email },
      select: { Email: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = await prisma.users.create({
      data: {
        Id: crypto.randomUUID(),
        FullName: fullName,
        Email: email,
        PhoneNumber: phoneNumber,
        PasswordHash: hashedPassword,
        PasswordSalt: salt,
        Role: "client",
        EmailConfirmed: false,
        ConfirmationToken: crypto.randomUUID(),
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      },
      select: {
        Id: true,
        Email: true,
        FullName: true,
        Role: true,
      },
    });

    console.log("User registered successfully:", user.Email);

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user.Id,
          email: user.Email,
          fullName: user.FullName,
          role: user.Role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
