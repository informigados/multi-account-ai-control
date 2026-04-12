import { requireApiUser } from "@/lib/auth/require-auth";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const user = await requireApiUser(request);
	if (!user) {
		return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
	}

	return NextResponse.json({
		status: "ok",
		service: "multi-account-ai-control-web",
		timestamp: new Date().toISOString(),
	});
}
