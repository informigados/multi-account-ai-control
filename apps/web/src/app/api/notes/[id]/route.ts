import { presentNote } from "@/features/notes/note-presenter";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { noteUpdateSchema } from "@/schemas/note";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawParams = await context.params;
	const parsedParams = paramsSchema.safeParse(rawParams);
	if (!parsedParams.success) {
		return NextResponse.json({ message: "Invalid note id." }, { status: 400 });
	}

	const parseResult = noteUpdateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid note payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const note = await db.note.findUnique({
		where: { id: parsedParams.data.id },
		select: {
			id: true,
			accountId: true,
		},
	});

	if (!note) {
		return NextResponse.json({ message: "Note not found." }, { status: 404 });
	}

	const updated = await db.note.update({
		where: { id: note.id },
		data: {
			noteType: parseResult.data.noteType,
			content: parseResult.data.content,
		},
		include: {
			author: {
				select: {
					id: true,
					username: true,
					email: true,
				},
			},
		},
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		entityId: note.accountId,
		eventType: "note_updated",
		message: `Note ${note.id} updated`,
		metadata: {
			accountId: note.accountId,
			noteId: note.id,
			noteType: updated.noteType,
		},
	});

	return NextResponse.json({ note: presentNote(updated) }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const csrfError = enforceCsrfProtection(request);
	if (csrfError) {
		return csrfError;
	}

	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawParams = await context.params;
	const parsedParams = paramsSchema.safeParse(rawParams);
	if (!parsedParams.success) {
		return NextResponse.json({ message: "Invalid note id." }, { status: 400 });
	}

	const note = await db.note.findUnique({
		where: { id: parsedParams.data.id },
		select: {
			id: true,
			accountId: true,
			noteType: true,
		},
	});

	if (!note) {
		return NextResponse.json({ message: "Note not found." }, { status: 404 });
	}

	await db.note.delete({
		where: { id: note.id },
	});

	await writeActivityLog({
		actorUserId: user.id,
		entityType: "account",
		entityId: note.accountId,
		eventType: "note_deleted",
		message: `Note ${note.id} deleted`,
		metadata: {
			accountId: note.accountId,
			noteId: note.id,
			noteType: note.noteType,
		},
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
