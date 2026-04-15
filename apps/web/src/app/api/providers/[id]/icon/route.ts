import fs from "node:fs/promises";
import path from "node:path";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_MIME_TYPES = new Set([
	"image/svg+xml",
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/x-icon",
	"image/vnd.microsoft.icon",
]);
const EXT_MAP: Record<string, string> = {
	"image/svg+xml": "svg",
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/x-icon": "ico",
	"image/vnd.microsoft.icon": "ico",
};
const MAX_SIZE_BYTES = 512 * 1024; // 512 KB

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) return csrfError;

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const { id } = await context.params;

	// Check provider exists
	const provider = await db.provider.findUnique({ where: { id } });
	if (!provider) {
		return NextResponse.json(
			{ message: "Provider not found." },
			{ status: 404 },
		);
	}

	// Parse multipart form data
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json(
			{ message: "Invalid multipart form data." },
			{ status: 400 },
		);
	}

	const file = formData.get("file");
	if (!(file instanceof Blob)) {
		return NextResponse.json(
			{ message: "Missing 'file' field in form data." },
			{ status: 400 },
		);
	}

	// Validate MIME type
	if (!ALLOWED_MIME_TYPES.has(file.type)) {
		return NextResponse.json(
			{
				message: `Unsupported file type: ${file.type}. Allowed: SVG, PNG, JPEG, WEBP, ICO.`,
			},
			{ status: 415 },
		);
	}

	// Validate size
	if (file.size > MAX_SIZE_BYTES) {
		return NextResponse.json(
			{ message: "File too large. Maximum allowed: 512 KB." },
			{ status: 413 },
		);
	}

	const ext = EXT_MAP[file.type] ?? "png";
	const fileName = `custom-${id}.${ext}`;
	const publicDir = path.join(process.cwd(), "public", "providers");
	const filePath = path.join(publicDir, fileName);

	// Remove any previous custom icon for this provider
	const prevExt = ["svg", "png", "jpg", "webp", "ico"];
	for (const e of prevExt) {
		try {
			await fs.unlink(path.join(publicDir, `custom-${id}.${e}`));
		} catch {
			// Ignore — file may not exist
		}
	}

	// Write file
	const buffer = Buffer.from(await file.arrayBuffer());
	await fs.writeFile(filePath, buffer);

	const iconPath = `/providers/${fileName}`;

	// Update provider record
	const updated = await db.provider.update({
		where: { id },
		data: { icon: iconPath },
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "provider",
		entityId: id,
		eventType: "provider_icon_updated",
		message: `Provider ${provider.name} custom icon uploaded`,
		metadata: { fileName, size: file.size, mimeType: file.type },
	});

	return NextResponse.json({ provider: updated }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) return csrfError;

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const { id } = await context.params;

	const provider = await db.provider.findUnique({ where: { id } });
	if (!provider) {
		return NextResponse.json(
			{ message: "Provider not found." },
			{ status: 404 },
		);
	}

	// Remove custom icon file
	const exts = ["svg", "png", "jpg", "webp", "ico"];
	const publicDir = path.join(process.cwd(), "public", "providers");
	for (const ext of exts) {
		try {
			await fs.unlink(path.join(publicDir, `custom-${id}.${ext}`));
		} catch {
			// Ignore
		}
	}

	// Clear icon in DB
	const updated = await db.provider.update({
		where: { id },
		data: { icon: null },
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "provider",
		entityId: id,
		eventType: "provider_icon_removed",
		message: `Provider ${provider.name} icon removed`,
		metadata: {},
	});

	return NextResponse.json({ provider: updated }, { status: 200 });
}
