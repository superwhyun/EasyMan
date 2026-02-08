import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        let settings = await prisma.settings.findUnique({
            where: { id: 'global' },
            include: { llmConfigs: true }
        });

        // Initialize global settings if not exists
        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 'global' },
                include: { llmConfigs: true }
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
        const body = await req.text();
        let data;
        try {
            data = JSON.parse(body);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        console.log('Saving Settings Data:', JSON.stringify(data, null, 2));

        const updatedSettings = await prisma.$transaction(async (tx) => {
            // 1. Update Global Settings
            const settings = await tx.settings.upsert({
                where: { id: 'global' },
                update: {
                    llmProvider: data.llmProvider || 'openai',
                    llmApiKey: data.llmApiKey || null, // Active provider's key
                    llmModel: data.llmModel || 'gpt-5.2', // Active provider's model
                    systemPrompt: data.systemPrompt || null,
                    reportPrompt: data.reportPrompt || null,
                    emailEnabled: data.emailEnabled ?? true,
                    emailFrequency: data.emailFrequency || 'daily',
                    deliveryTime: data.deliveryTime || '09:00 AM',
                },
                create: {
                    id: 'global',
                    llmProvider: data.llmProvider || 'openai',
                    llmApiKey: data.llmApiKey || null,
                    llmModel: data.llmModel || 'gpt-5.2',
                    systemPrompt: data.systemPrompt || null,
                    reportPrompt: data.reportPrompt || null,
                    emailEnabled: data.emailEnabled ?? true,
                    emailFrequency: data.emailFrequency || 'daily',
                    deliveryTime: data.deliveryTime || '09:00 AM',
                },
            });

            // 2. Update Provider Specific Config
            if (data.llmProvider) {
                await tx.lLMConfig.upsert({
                    where: { provider: data.llmProvider },
                    update: {
                        apiKey: data.llmApiKey || null,
                        model: data.llmModel || 'gpt-5.2',
                    },
                    create: {
                        provider: data.llmProvider,
                        apiKey: data.llmApiKey || null,
                        model: data.llmModel || 'gpt-5.2',
                        settingsId: 'global'
                    }
                });
            }

            return settings;
        });

        return NextResponse.json({ success: true, settings: updatedSettings });
    } catch (error: any) {
        console.error('Save Settings Error Details:', error);
        return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
    }
}
