import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  Email: z.string().email("Invalid email format"),
  Password: z.string().min(1, "Password is required"),
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: Authenticate a user and return a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email
 *               - Password
 *             properties:
 *               Email:
 *                 type: string
 *                 format: email
 *               Password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     PhoneNumber:
 *                       type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = loginSchema.parse(body);
    const { Email, Password } = validatedData;

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { Email },
      select: {
        Id: true,
        Email: true,
        FullName: true,
        PasswordHash: true,
        Role: true,
        PhoneNumber: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(Password, user.PasswordHash);
    if (!validPassword) {
      // Get client IP from headers
      const forwardedFor = request.headers.get("x-forwarded-for");
      const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

      // Log failed login attempt
      await prisma.userloginhistory.create({
        data: {
          Id: uuidv4(),
          UserId: user.Id,
          Successful: false,
          FailureReason: "Invalid password",
          IpAddress: clientIp,
          UserAgent: request.headers.get("user-agent") || "",
        },
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.Id,
        email: user.Email,
        role: user.Role,
      },
      process.env.JWT_SECRET || "",
      { expiresIn: "24h" }
    );

    // Get client IP for logging
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    // Create user session
    await prisma.usersessions.create({
      data: {
        Id: uuidv4(),
        UserId: user.Id,
        Token: token,
        ExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "",
      },
    });

    // Log successful login
    await prisma.userloginhistory.create({
      data: {
        Id: uuidv4(),
        UserId: user.Id,
        Successful: true,
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "",
      },
    });

    // Update last login date
    await prisma.users.update({
      where: { Id: user.Id },
      data: { 
        LastLoginDate: new Date(),
        UpdatedAt: new Date(),
      },
    });

    const { PasswordHash, ...userWithoutPassword } = user;
    return NextResponse.json(
      {
        token,
        user: userWithoutPassword,
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
