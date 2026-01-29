import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const assigneeId = searchParams.get('assigneeId');
        const status = searchParams.get('status');

        const where: any = {};
        if (assigneeId) where.assigneeId = assigneeId;
        if (status) where.status = status;

        const tasks = await prisma.task.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                assignee: {
                    select: { name: true, avatar: true }
                }
            }
        });

        return NextResponse.json(tasks);
    } catch (error: any) {
        console.error('Fetch Tasks Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
