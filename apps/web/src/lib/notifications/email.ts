import { getEnv } from "@/lib/env";
import nodemailer from "nodemailer";

type SendEmailInput = {
	to: string;
	subject: string;
	text: string;
	html: string;
};

function getSmtpConfig() {
	const env = getEnv();
	if (
		!env.SMTP_HOST ||
		!env.SMTP_PORT ||
		!env.SMTP_USER ||
		!env.SMTP_PASS ||
		!env.SMTP_FROM
	) {
		return null;
	}

	return {
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS,
		},
		from: env.SMTP_FROM,
	};
}

export function canSendEmail() {
	return Boolean(getSmtpConfig());
}

export async function sendEmail(input: SendEmailInput) {
	const smtpConfig = getSmtpConfig();
	if (!smtpConfig) {
		throw new Error("SMTP configuration is incomplete.");
	}

	const transporter = nodemailer.createTransport({
		host: smtpConfig.host,
		port: smtpConfig.port,
		secure: smtpConfig.port === 465,
		auth: smtpConfig.auth,
	});

	await transporter.sendMail({
		from: smtpConfig.from,
		to: input.to,
		subject: input.subject,
		text: input.text,
		html: input.html,
	});
}
