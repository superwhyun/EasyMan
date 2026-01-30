import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const templates = await prisma.promptTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(templates);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, description, content } = await req.json();

        if (!name || !content) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
        }

        const template = await prisma.promptTemplate.create({
            data: { name, description, content }
        });

        return NextResponse.json(template);
    } catch (error: any) {
        console.error('Prompt Template POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    // This could be combined with a dynamic [id] route, but for simplicity we'll handle update via passing ID in body or separate route
    // Let's assume we might need a specific [id] route later, but for now we'll handle basic CRUD.
    return NextResponse.json({ error: 'Specific ID required for PATCH' }, { status: 400 });
}
