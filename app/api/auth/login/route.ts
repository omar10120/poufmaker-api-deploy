import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and return JWT token
 *     description: Logs in a user and returns a JWT token for authentication
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "securepassword"
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: string
 *                     Email:
 *                       type: string
 *                     FullName:
 *                       type: string
 *                     Role:
 *                       type: string
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Invalid credentials
 */

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Login attempt for email:", body.email);

    const { email, password } = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { Email: email },
      select: {
        Id: true,
        Email: true,
        FullName: true,
        Role: true,
        PasswordHash: true,
        PasswordSalt: true,
      },
    });

    if (!user) {
      console.log("User not found:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
    if (!isValidPassword) {
      console.log("Invalid password for user:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login date
    await prisma.users.update({
      where: { Id: user.Id },
      data: { LastLoginDate: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.Id,
        email: user.Email,
        role: user.Role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Get client IP address from headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    // Create user session
    await prisma.usersessions.create({
      data: {
        Id: crypto.randomUUID(),
        UserId: user.Id,
        Token: token,
        ExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Create login history entry
    await prisma.userloginhistory.create({
      data: {
        Id: crypto.randomUUID(),
        UserId: user.Id,
        LoginDate: new Date(),
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "unknown",
        Successful: true,
      },
    });

    console.log("Login successful for user:", email);

    return NextResponse.json({
      token,
      user: {
        Id: user.Id,
        Email: user.Email,
        FullName: user.FullName,
        Role: user.Role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
