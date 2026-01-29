import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        let settings = await prisma.settings.findUnique({
            where: { id: 'global' },
        });

        // Initialize global settings if not exists
        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 'global' },
            });
        }

        return NextResponse.json(settings);
    } catch (error: any) {
        console.error('Fetch Settings API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        console.log('Saving Settings Data:', JSON.stringify(data, null, 2));

        const updatedSettings = await prisma.settings.upsert({
            where: { id: 'global' },
            update: {
                llmProvider: data.llmProvider,
                llmApiKey: data.llmApiKey,
                llmModel: data.llmModel,
                systemPrompt: data.systemPrompt,
                emailEnabled: data.emailEnabled,
                emailFrequency: data.emailFrequency,
                deliveryTime: data.deliveryTime,
            },
            create: {
                id: 'global',
                llmProvider: data.llmProvider || 'openai',
                llmApiKey: data.llmApiKey,
                llmModel: data.llmModel || 'gpt-5.2',
                systemPrompt: data.systemPrompt,
                emailEnabled: data.emailEnabled ?? true,
                emailFrequency: data.emailFrequency || 'daily',
                deliveryTime: data.deliveryTime || '09:00 AM',
            },
        });

        return NextResponse.json({ success: true, settings: updatedSettings });
    } catch (error: any) {
        console.error('Save Settings Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
