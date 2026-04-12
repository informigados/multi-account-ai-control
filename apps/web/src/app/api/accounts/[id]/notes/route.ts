import { presentNote } from "@/features/notes/note-presenter";
import { writeActivityLog } from "@/lib/audit/log";
import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { enforceCsrfProtection } from "@/lib/security/csrf";
import { noteCreateSchema, noteListQuerySchema } from "@/schemas/note";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

type RouteContext = {
	params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const rawParams = await context.params;
	const parsedParams = paramsSchema.safeParse(rawParams);
	if (!parsedParams.success) {
		return NextResponse.json(
			{ message: "Invalid account id." },
			{ status: 400 },
		);
	}

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	const query = noteListQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);
	if (!query.success) {
		return NextResponse.json(
			{ message: "Invalid notes query." },
			{ status: 400 },
		);
	}

	const notes = await db.note.findMany({
		where: { accountId: account.id },
		take: query.data.limit + 1,
		...(query.data.cursor
			? {
					cursor: { id: query.data.cursor },
					skip: 1,
				}
			: {}),
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
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
	const hasMore = notes.length > query.data.limit;
	const slice = hasMore ? notes.slice(0, query.data.limit) : notes;
	const nextCursor = hasMore ? (slice[slice.length - 1]?.id ?? null) : null;

	return NextResponse.json(
		{
			notes: slice.map(presentNote),
			page: {
				limit: query.data.limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}

export async function POST(request: NextRequest, context: RouteContext) {
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
		return NextResponse.json(
			{ message: "Invalid account id." },
			{ status: 400 },
		);
	}

	const parseResult = noteCreateSchema.safeParse(await request.json());
	if (!parseResult.success) {
		return NextResponse.json(
			{
				message: "Invalid note payload.",
				issues: parseResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const account = await db.account.findUnique({
		where: { id: parsedParams.data.id },
		select: { id: true, displayName: true },
	});

	if (!account) {
		return NextResponse.json(
			{ message: "Account not found." },
			{ status: 404 },
		);
	}

	const note = await db.note.create({
		data: {
			accountId: account.id,
			noteType: parseResult.data.noteType,
			content: parseResult.data.content,
			createdBy: user.id,
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
		entityId: account.id,
		eventType: "note_created",
		message: `Note created for ${account.displayName}`,
		metadata: {
			accountId: account.id,
			noteId: note.id,
			noteType: note.noteType,
		},
	});

	return NextResponse.json({ note: presentNote(note) }, { status: 201 });
}
