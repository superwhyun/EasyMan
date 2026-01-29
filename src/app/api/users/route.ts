import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });

        return NextResponse.json(users);
    } catch (error: any) {
        console.error('Fetch Users Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, email, role, avatar } = await req.json();

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
        }

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                role: role || 'Member',
                avatar: avatar || null,
            }
        });

        return NextResponse.json({ success: true, user: newUser });
    } catch (error: any) {
        console.error('Create User Error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
