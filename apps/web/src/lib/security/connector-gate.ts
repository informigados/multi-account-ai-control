import type { ProviderConnectorType } from "@prisma/client";

export const HIGH_RISK_CONNECTOR_CONFIRMATION_PHRASE =
	"ENABLE HIGH-RISK CONNECTOR";
export const SENSITIVE_CONNECTOR_CONFIRMATION_HEADER =
	"x-maac-sensitive-confirmation";

const NON_MANUAL_CONNECTORS = new Set<ProviderConnectorType>([
	"api",
	"cookie_session",
	"web_automation",
	"custom_script",
]);

const HIGH_RISK_CONNECTORS = new Set<ProviderConnectorType>([
	"web_automation",
	"custom_script",
]);

type ConnectorGateResult =
	| {
			ok: true;
			level: "none" | "restricted" | "high_risk";
	  }
	| {
			ok: false;
			status: 400 | 403;
			code: "forbidden_role" | "missing_confirmation";
			message: string;
	  };

type EvaluateConnectorGateInput = {
	actorRole: string;
	nextConnectorType: ProviderConnectorType;
	previousConnectorType?: ProviderConnectorType;
	confirmationPhrase?: string | null;
};

function isNonManualConnector(type: ProviderConnectorType) {
	return NON_MANUAL_CONNECTORS.has(type);
}

function isHighRiskConnector(type: ProviderConnectorType) {
	return HIGH_RISK_CONNECTORS.has(type);
}

export function evaluateConnectorGate(
	input: EvaluateConnectorGateInput,
): ConnectorGateResult {
	const {
		actorRole,
		nextConnectorType,
		previousConnectorType,
		confirmationPhrase,
	} = input;

	const isChanged =
		previousConnectorType === undefined
			? true
			: previousConnectorType !== nextConnectorType;

	if (!isChanged) {
		return { ok: true, level: "none" };
	}

	const touchesSensitiveConnector =
		isNonManualConnector(nextConnectorType) ||
		(previousConnectorType
			? isNonManualConnector(previousConnectorType)
			: false);

	if (!touchesSensitiveConnector) {
		return { ok: true, level: "none" };
	}

	if (actorRole !== "admin") {
		return {
			ok: false,
			status: 403,
			code: "forbidden_role",
			message:
				"Only administrators can configure non-manual provider connectors.",
		};
	}

	if (isHighRiskConnector(nextConnectorType)) {
		const normalized = confirmationPhrase?.trim();
		if (normalized !== HIGH_RISK_CONNECTOR_CONFIRMATION_PHRASE) {
			return {
				ok: false,
				status: 400,
				code: "missing_confirmation",
				message: `High-risk connector change requires confirmation phrase "${HIGH_RISK_CONNECTOR_CONFIRMATION_PHRASE}".`,
			};
		}
		return { ok: true, level: "high_risk" };
	}

	return { ok: true, level: "restricted" };
}
