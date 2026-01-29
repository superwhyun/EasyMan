import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const data = await req.json();

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: data.status,
                progress: data.progress,
                priority: data.priority,
                title: data.title,
                description: data.description,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            },
        });

        return NextResponse.json({ success: true, task: updatedTask });
    } catch (error: any) {
        console.error('Update Task Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.task.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Task Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
