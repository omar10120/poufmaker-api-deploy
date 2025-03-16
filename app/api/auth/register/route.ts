import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  Email: z.string().email("Invalid email format"),
  Password: z.string().min(8, "Password must be at least 8 characters"),
  FullName: z.string().min(1, "Full name is required"),
  PhoneNumber: z.string().optional(),
  Role: z.enum(["client", "admin", "upholsterer"]).default("client"),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register new user
 *     description: Create a new user account and return authentication token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Email
 *               - Password
 *               - FullName
 *             properties:
 *               Email:
 *                 type: string
 *                 format: email
 *               Password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               FullName:
 *                 type: string
 *               PhoneNumber:
 *                 type: string
 *               Role:
 *                 type: string
 *                 enum: [client, admin, upholsterer]
 *                 default: client
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    const { Email, Password, FullName, PhoneNumber, Role } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { Email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // Create user
    const user = await prisma.users.create({
      data: {
        Id: uuidv4(),
        Email,
        FullName,
        PhoneNumber,
        Role,
        PasswordHash: hashedPassword,
        PasswordSalt: salt,
        EmailConfirmed: false,
        ConfirmationToken: uuidv4(),
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      },
      select: {
        Id: true,
        Email: true,
        FullName: true,
        Role: true,
        PhoneNumber: true,
      },
    });

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

    // Log registration
    await prisma.userloginhistory.create({
      data: {
        Id: uuidv4(),
        UserId: user.Id,
        Successful: true,
        IpAddress: clientIp,
        UserAgent: request.headers.get("user-agent") || "",
      },
    });

    // Format response to match Swagger schema
    const response = {
      message: "User registered successfully",
      user: {
        id: user.Id,
        email: user.Email,
        fullName: user.FullName,
        role: user.Role,
      },
      token,
    };

    return NextResponse.json(response, { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
