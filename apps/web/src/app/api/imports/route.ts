import { requireApiUser } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { importHistoryQuerySchema } from "@/schemas/import-export";
import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

type ImportHistoryCursor = {
	importedAt: Date;
	id: string;
};

function encodeCursor(cursor: ImportHistoryCursor) {
	const payload = `${cursor.importedAt.toISOString()}|${cursor.id}`;
	return Buffer.from(payload, "utf8").toString("base64url");
}

function decodeCursor(rawCursor: string): ImportHistoryCursor | null {
	try {
		const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
		const [importedAtIso, id] = decoded.split("|");
		if (!importedAtIso || !id) return null;
		const importedAt = new Date(importedAtIso);
		if (Number.isNaN(importedAt.getTime())) return null;
		return { importedAt, id };
	} catch {
		return null;
	}
}

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	const queryResult = importHistoryQuerySchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams.entries()),
	);
	if (!queryResult.success) {
		return NextResponse.json(
			{
				message: "Invalid imports query.",
				issues: queryResult.error.flatten(),
			},
			{ status: 400 },
		);
	}

	const { limit, cursor, fileType, status, search } = queryResult.data;
	const decodedCursor = cursor ? decodeCursor(cursor) : null;
	if (cursor && !decodedCursor) {
		return NextResponse.json({ message: "Invalid cursor." }, { status: 400 });
	}

	const where: Prisma.ImportWhereInput = {
		AND: [
			fileType ? { fileType } : {},
			status ? { status } : {},
			search ? { fileName: { contains: search } } : {},
			decodedCursor
				? {
						OR: [
							{ importedAt: { lt: decodedCursor.importedAt } },
							{
								importedAt: decodedCursor.importedAt,
								id: { lt: decodedCursor.id },
							},
						],
					}
				: {},
		],
	};

	const imports = await db.import.findMany({
		where,
		orderBy: [{ importedAt: "desc" }, { id: "desc" }],
		take: limit + 1,
	});

	const hasMore = imports.length > limit;
	const slice = hasMore ? imports.slice(0, limit) : imports;
	const nextCursor = hasMore
		? encodeCursor({
				importedAt: slice[slice.length - 1].importedAt,
				id: slice[slice.length - 1].id,
			})
		: null;

	return NextResponse.json(
		{
			imports: slice,
			page: {
				limit,
				nextCursor,
			},
		},
		{ status: 200 },
	);
}
