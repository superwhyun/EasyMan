import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        const path = join(process.cwd(), 'public/uploads', uniqueFilename);

        await writeFile(path, buffer);
        const publicPath = `/uploads/${uniqueFilename}`;

        return NextResponse.json({
            success: true,
            file: {
                name: file.name,
                path: publicPath,
                size: file.size,
                type: file.type
            }
        });

    } catch (error: any) {
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
