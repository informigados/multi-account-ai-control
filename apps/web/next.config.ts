import type { NextConfig } from "next";

function getContentSecurityPolicy() {
	const isDevelopment = process.env.NODE_ENV !== "production";
	const scriptDirectives = isDevelopment
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
		: "script-src 'self' 'unsafe-inline'";

	return [
		"default-src 'self'",
		"base-uri 'self'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"img-src 'self' data: blob:",
		scriptDirectives,
		"style-src 'self' 'unsafe-inline'",
		"connect-src 'self'",
		"font-src 'self' data:",
		"object-src 'none'",
	].join("; ");
}

const contentSecurityPolicy = getContentSecurityPolicy();

const nextConfig: NextConfig = {
	reactStrictMode: true,
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Content-Security-Policy",
						value: contentSecurityPolicy,
					},
					{
						key: "Referrer-Policy",
						value: "no-referrer",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "Permissions-Policy",
						value:
							"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
					},
				],
			},
		];
	},
};

export default nextConfig;
