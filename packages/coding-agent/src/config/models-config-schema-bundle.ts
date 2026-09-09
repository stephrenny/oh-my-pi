import { type } from "@oh-my-pi/omptype";
import { THINKING_EFFORTS } from "@oh-my-pi/pi-catalog/effort";
import type { ResolvedAnthropicCompat, ResolvedOpenAIResponsesCompat } from "@oh-my-pi/pi-catalog/types";
import { once } from "@oh-my-pi/pi-utils";

export const getModelsConfigSchemaBundle = once(() => {
	const OpenRouterRoutingSchema = type({
		"only?": "string[]",
		"order?": "string[]",
	});

	const VercelGatewayRoutingSchema = type({
		"only?": "string[]",
		"order?": "string[]",
	});

	const ReasoningEffortMapSchema = type({
		"minimal?": "string",
		"low?": "string",
		"medium?": "string",
		"high?": "string",
		"xhigh?": "string",
		"max?": "string",
	});

	const OpenAICompatFields = {
		"supportsStore?": "boolean",
		"supportsDeveloperRole?": "boolean",
		"supportsMultipleSystemMessages?": "boolean",
		"supportsReasoningEffort?": "boolean",
		"reasoningEffortMap?": ReasoningEffortMapSchema,
		"maxTokensField?": '"max_completion_tokens" | "max_tokens"',
		"supportsUsageInStreaming?": "boolean",
		"requiresToolResultName?": "boolean",
		"requiresMistralToolIds?": "boolean",
		"requiresAssistantAfterToolResult?": "boolean",
		"requiresThinkingAsText?": "boolean",
		"reasoningContentField?": '"reasoning_content" | "reasoning" | "reasoning_text"',
		"requiresReasoningContentForToolCalls?": "boolean",
		"allowsSyntheticReasoningContentForToolCalls?": "boolean",
		"requiresAssistantContentForToolCalls?": "boolean",
		"supportsToolChoice?": "boolean",
		"supportsForcedToolChoice?": "boolean",
		"disableReasoningOnForcedToolChoice?": "boolean",
		"disableReasoningOnToolChoice?": "boolean",
		"thinkingFormat?": '"openai" | "openrouter" | "zai" | "qwen" | "qwen-chat-template"',
		"qwenTemplateReasoningEffort?": "boolean",
		"openRouterRouting?": OpenRouterRoutingSchema,
		"vercelGatewayRouting?": VercelGatewayRoutingSchema,
		"extraBody?": { "[string]": "unknown" },
		"cacheControlFormat?": '"anthropic"',
		"supportsStrictMode?": "boolean",
		"toolStrictMode?": '"all_strict" | "none"',
		"streamIdleTimeoutMs?": "number >= 0",
		"streamMarkupHealingPattern?": '"kimi" | "dsml" | "qwen" | "thinking"',
		"supportsLongPromptCacheRetention?": "boolean",
		"supportsReasoningParams?": "boolean",
		"supportsReasoningSummary?": "boolean",
		"alwaysSendMaxTokens?": "boolean",
		"strictResponsesPairing?": "boolean",
		"supportsImageDetailOriginal?": "boolean",
		// anthropic-messages compat flags (same `compat` slot, per-api interpretation)
		"supportsContextManagement?": "boolean",
		"supportsEagerToolInputStreaming?": "boolean",
		"allowAnthropicHeaderOverrides?": "boolean",
		"requiresToolResultId?": "boolean",
		"replayUnsignedThinking?": "boolean",
	} as const;

	const OpenAICompatFieldsSchema = type(OpenAICompatFields);

	const OpenAICompatSchema = type({
		...OpenAICompatFields,
		"whenThinking?": OpenAICompatFieldsSchema,
	});

	const BedrockCompatSchema = type({
		"promptCacheMode?": '"none" | "automatic" | "explicit"',
		"supportsLongPromptCacheRetention?": "boolean",
		"promptCacheMinimumTokens?": "number >= 0",
		"promptCacheMaximumCheckpoints?": "number >= 0",
	});

	// Provider-level overrides can target bundled models whose API is not repeated
	// in models.yml, so preserve the sparse compat shape for each supported API.
	const ApiCompatSchema = OpenAICompatSchema.and(BedrockCompatSchema);

	const ApiSchema = type(
		'"openai-completions" | "openai-responses" | "openai-codex-responses" | "azure-openai-responses" | "anthropic-messages" | "bedrock-converse-stream" | "google-generative-ai" | "google-gemini-cli" | "google-vertex"',
	);

	const EffortSchema = type('"minimal" | "low" | "medium" | "high" | "xhigh" | "max"');

	const ThinkingControlModeSchema = type(
		'"effort" | "budget" | "google-level" | "anthropic-adaptive" | "anthropic-budget-effort"',
	);

	const EFFORT_ORDER = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;

	/**
	 * Accepts the canonical `efforts` vocabulary plus the legacy
	 * `minLevel`/`maxLevel`/`levels` range shape, normalizing both to
	 * `ThinkingConfig` (ordered `efforts`, never empty). Precedence mirrors the
	 * old runtime: explicit `levels` beat the min..max range; `efforts` beats both.
	 */
	const ModelThinkingSchema = type({
		mode: ThinkingControlModeSchema,
		"efforts?": EffortSchema.array(),
		"defaultLevel?": EffortSchema,
		"effortMap?": ReasoningEffortMapSchema,
		"supportsDisplay?": "boolean",
		"requiresEffort?": "boolean",
		// Legacy range vocabulary (pre-efforts configs).
		"minLevel?": EffortSchema,
		"maxLevel?": EffortSchema,
		"levels?": EffortSchema.array(),
	})
		.narrow(
			(value, ctx) =>
				value.efforts !== undefined ||
				value.levels !== undefined ||
				(value.minLevel !== undefined && value.maxLevel !== undefined) ||
				ctx.mustBe("thinking with `efforts` (or legacy `levels`/`minLevel`+`maxLevel`)"),
		)
		.pipe((value: any) => {
			let resolved = value.efforts ?? value.levels;
			if (!resolved) {
				const minIndex = EFFORT_ORDER.indexOf(value.minLevel!);
				const maxIndex = EFFORT_ORDER.indexOf(value.maxLevel!);
				resolved = EFFORT_ORDER.slice(minIndex, Math.max(minIndex, maxIndex) + 1);
			}
			return {
				mode: value.mode,
				efforts: resolved,
				...(value.defaultLevel !== undefined && { defaultLevel: value.defaultLevel }),
				...(value.effortMap !== undefined && { effortMap: value.effortMap }),
				...(value.supportsDisplay !== undefined && { supportsDisplay: value.supportsDisplay }),
				...(value.requiresEffort !== undefined && { requiresEffort: value.requiresEffort }),
			};
		});

	const ModelTokenizerSchema = type(
		'"claude-v3" | "claude-v47" | "claude-v5" | "claude-v5-sonnet" | "qwen3" | "deepseek-v3" | "kimi-k2" | "glm5"',
	);

	const RemoteCompactionSchema = type({
		"enabled?": "boolean",
		"api?": ApiSchema,
		"endpoint?": "string",
		"model?": "string",
		"v2StreamingEnabled?": "boolean",
		"v2Endpoint?": "string",
		"streamingEndpoint?": "string",
	}).narrow((value, ctx) => {
		if (value.endpoint !== undefined && typeof value.endpoint === "string" && value.endpoint.length === 0) {
			return ctx.mustBe("remoteCompaction.endpoint a non-empty string");
		}
		if (value.model !== undefined && typeof value.model === "string" && value.model.length === 0) {
			return ctx.mustBe("remoteCompaction.model a non-empty string");
		}
		if (value.v2Endpoint !== undefined && typeof value.v2Endpoint === "string" && value.v2Endpoint.length === 0) {
			return ctx.mustBe("remoteCompaction.v2Endpoint a non-empty string");
		}
		if (
			value.streamingEndpoint !== undefined &&
			typeof value.streamingEndpoint === "string" &&
			value.streamingEndpoint.length === 0
		) {
			return ctx.mustBe("remoteCompaction.streamingEndpoint a non-empty string");
		}
		return true;
	});

	const ModelDefinitionSchema = type({
		id: "string",
		"name?": "string",
		"api?": ApiSchema,
		"baseUrl?": "string",
		"reasoning?": "boolean",
		"thinking?": ModelThinkingSchema,
		"input?": '("text" | "image")[]',
		"imageInputDecoder?": '"stb"',
		"tokenizer?": ModelTokenizerSchema,
		"supportsTools?": "boolean",
		"cost?": {
			input: "number",
			output: "number",
			cacheRead: "number",
			cacheWrite: "number",
		},
		"premiumMultiplier?": "number",
		"contextWindow?": "number",
		"maxTokens?": "number",
		"omitMaxOutputTokens?": "boolean",
		"preferWebsockets?": "boolean",
		"headers?": { "[string]": "string" },
		"compat?": ApiCompatSchema,
		"contextPromotionTarget?": "string",
		"compactionModel?": "string",
		"remoteCompaction?": RemoteCompactionSchema,
	}).narrow((value, ctx) => {
		// Enforce id non-empty
		if (typeof value.id === "string" && value.id.length === 0) {
			return ctx.mustBe("id a non-empty string");
		}
		if (value.name !== undefined && typeof value.name === "string" && value.name.length === 0) {
			return ctx.mustBe("name a non-empty string");
		}
		if (value.baseUrl !== undefined && typeof value.baseUrl === "string" && value.baseUrl.length === 0) {
			return ctx.mustBe("baseUrl a non-empty string");
		}
		if (
			value.contextPromotionTarget !== undefined &&
			typeof value.contextPromotionTarget === "string" &&
			value.contextPromotionTarget.length === 0
		) {
			return ctx.mustBe("contextPromotionTarget a non-empty string");
		}
		if (
			value.compactionModel !== undefined &&
			typeof value.compactionModel === "string" &&
			value.compactionModel.length === 0
		) {
			return ctx.mustBe("compactionModel a non-empty string");
		}
		return true;
	});

	const ModelOverrideSchema = type({
		"name?": "string",
		"reasoning?": "boolean",
		"thinking?": ModelThinkingSchema,
		"input?": '("text" | "image")[]',
		"imageInputDecoder?": '"stb"',
		"tokenizer?": ModelTokenizerSchema,
		"supportsTools?": "boolean",
		"cost?": {
			"input?": "number",
			"output?": "number",
			"cacheRead?": "number",
			"cacheWrite?": "number",
		},
		"premiumMultiplier?": "number",
		"contextWindow?": "number",
		"maxTokens?": "number",
		"omitMaxOutputTokens?": "boolean",
		"preferWebsockets?": "boolean",
		"headers?": { "[string]": "string" },
		"compat?": ApiCompatSchema,
		"contextPromotionTarget?": "string",
		"compactionModel?": "string",
		"remoteCompaction?": RemoteCompactionSchema,
	}).narrow((value, ctx) => {
		if (value.name !== undefined && typeof value.name === "string" && value.name.length === 0) {
			return ctx.mustBe("name a non-empty string");
		}
		if (
			value.contextPromotionTarget !== undefined &&
			typeof value.contextPromotionTarget === "string" &&
			value.contextPromotionTarget.length === 0
		) {
			return ctx.mustBe("contextPromotionTarget a non-empty string");
		}
		if (
			value.compactionModel !== undefined &&
			typeof value.compactionModel === "string" &&
			value.compactionModel.length === 0
		) {
			return ctx.mustBe("compactionModel a non-empty string");
		}
		return true;
	});

	const ProviderDiscoverySchema = type({
		type: '"ollama" | "llama.cpp" | "lm-studio" | "openai-models-list" | "proxy" | "litellm" | "provider-wire"',
		"timeoutMs?": "number",
		/**
		 * Defaults to `true`. Set `false` to fetch the model list from
		 * `{baseUrl}/models` without injecting `/v1` — for gateways that root
		 * their OpenAI-compatible surface at a versioned path (e.g.
		 * `https://api.opper.ai/v3/compat`) where the forced `/v1/models`
		 * returns a different, smaller model list.
		 */
		"injectV1?": "boolean",
	}).narrow((value, ctx) => {
		if (value.injectV1 !== undefined && value.type !== "openai-models-list") {
			return ctx.mustBe("injectV1 only on openai-models-list discovery");
		}
		if (
			value.timeoutMs !== undefined &&
			(typeof value.timeoutMs !== "number" || value.timeoutMs <= 0 || !Number.isFinite(value.timeoutMs))
		) {
			return ctx.mustBe("timeoutMs a positive finite number");
		}
		return true;
	});

	const ProviderAuthSchema = type('"apiKey" | "none" | "oauth"');

	const ProviderConfigSchema = type({
		"baseUrl?": "string",
		"apiKey?": "string",
		"api?": ApiSchema,
		"headers?": { "[string]": "string" },
		"compat?": ApiCompatSchema,
		"remoteCompaction?": RemoteCompactionSchema,
		"authHeader?": "boolean",
		"auth?": ProviderAuthSchema,
		"discovery?": ProviderDiscoverySchema,
		"models?": ModelDefinitionSchema.array(),
		"modelOverrides?": { "[string]": ModelOverrideSchema },
		"disableStrictTools?": "boolean",
		/**
		 * Amazon Bedrock Guardrail id or ARN attached to every Converse request under
		 * this provider. Required by accounts that gate `bedrock:InvokeModel*` on the
		 * `bedrock:GuardrailIdentifier` condition key.
		 */
		"guardrailIdentifier?": "string",
		/** Bedrock guardrail version (defaults to `"DRAFT"` when a guardrail is set). */
		"guardrailVersion?": "string",
		/** Bedrock guardrail trace verbosity. */
		"guardrailTrace?": '"enabled" | "disabled" | "enabled_full"',
		/**
		 * Bedrock invocation-log tags attached to every Converse request under this
		 * provider (max 16 entries; keys/values limited to `[a-zA-Z0-9\s:_@$#=/+,-.]`).
		 */
		"requestMetadata?": { "[string]": "string" },
		/**
		 * Gateway transport for every model under this provider. `"pi-native"`
		 * delegates provider codecs to `/v1/pi/stream`; `"provider-wire"` runs
		 * Anthropic/Codex codecs locally over `/v1/provider-wire/:provider`.
		 * `baseUrl` points at the gateway and `apiKey` carries its bearer,
		 * never the provider credential.
		 */
		"transport?": '"pi-native" | "provider-wire"',
	}).narrow((value, ctx) => {
		if (value.baseUrl !== undefined && typeof value.baseUrl === "string" && value.baseUrl.length === 0) {
			return ctx.mustBe("baseUrl a non-empty string");
		}
		if (value.apiKey !== undefined && typeof value.apiKey === "string" && value.apiKey.length === 0) {
			return ctx.mustBe("apiKey a non-empty string");
		}
		if (value.discovery?.type === "provider-wire" &&
			(value.transport !== "provider-wire" || !value.baseUrl || !value.apiKey)) {
			return ctx.mustBe("provider-wire discovery with transport: provider-wire, gateway baseUrl and gateway apiKey");
		}
		return true;
	});

	const ModelsConfigSchema = type({
		"providers?": { "[string]": ProviderConfigSchema },
	});

	return {
		OpenAICompatSchema,
		ModelOverrideSchema,
		ProviderDiscoverySchema,
		ProviderAuthSchema,
		ModelsConfigSchema,
	};
});

export const getModelsConfigSchema = () => getModelsConfigSchemaBundle().ModelsConfigSchema;

/** Strict native catalog boundary, separate from permissive user-authored model overrides. */
export const getProviderWireModelCardSchema = once(() => {
	const rate = type("number >= 0").narrow(value => Number.isFinite(value));
	const limit = type("number > 0").narrow(value => Number.isSafeInteger(value));
	const tokenCount = type("number >= 0").narrow(value => Number.isSafeInteger(value));
	const rawId = type("string").narrow(value => /^[\x21-\x7e]{1,256}$/.test(value));
	const effort = type('"minimal" | "low" | "medium" | "high" | "xhigh" | "max"');
	const effortOrder: readonly string[] = THINKING_EFFORTS;
	const effortMap = type({
		"minimal?": "string",
		"low?": "string",
		"medium?": "string",
		"high?": "string",
		"xhigh?": "string",
		"max?": "string",
	});
	const thinking = type({
		mode: '"effort" | "budget" | "google-level" | "anthropic-adaptive" | "anthropic-budget-effort"',
		efforts: effort.array(),
		"defaultLevel?": effort,
		"effortMap?": effortMap,
		"supportsDisplay?": "boolean",
		"prefixBinding?": "boolean",
		"effortRouting?": {
			"off?": rawId,
			"minimal?": rawId,
			"low?": rawId,
			"medium?": rawId,
			"high?": rawId,
			"xhigh?": rawId,
			"max?": rawId,
		},
		"effortBudgets?": {
			"minimal?": tokenCount,
			"low?": tokenCount,
			"medium?": tokenCount,
			"high?": tokenCount,
			"xhigh?": tokenCount,
			"max?": tokenCount,
		},
		"suppressWhenOff?": "boolean",
		"requiresEffort?": "boolean",
	}).narrow((value, ctx) => {
		if (
			value.efforts.length === 0 ||
			value.efforts.some((entry, index) => index > 0 &&
				effortOrder.indexOf(entry) <= effortOrder.indexOf(value.efforts[index - 1])) ||
			(value.defaultLevel !== undefined && !value.efforts.includes(value.defaultLevel))
		) {
			return ctx.mustBe("nonempty ascending thinking efforts containing the default level");
		}
		return true;
	});
	const rates = { input: rate, output: rate, cacheRead: rate, cacheWrite: rate };
	const routing = type({ "only?": "string[]", "order?": "string[]" });
	const sharedCompat = {
		"officialEndpoint?": "boolean",
		"stripImageInput?": "boolean",
		"supportsForcedToolChoice?": "boolean",
		"supportsSamplingParams?": "boolean",
		"streamIdleTimeoutMs?": rate,
		"thinkingLoopGuard?": '"gemini" | "deepseek" | "xai"',
	} as const;
	const anthropicCompat = type({
		...sharedCompat,
		"signingEndpoint?": "boolean",
		"supportsContextManagement?": "boolean",
		"supportsOutputEffort?": "boolean",
		"disableStrictTools?": "boolean",
		"disableAdaptiveThinking?": "boolean",
		"allowAnthropicHeaderOverrides?": "boolean",
		"supportsEagerToolInputStreaming?": "boolean",
		"supportsLongCacheRetention?": "boolean",
		"supportsMidConversationSystem?": "boolean",
		"supportsTurnScopedSystem?": "boolean",
		"supportsMidConversationToolChanges?": "boolean",
		"supportsPerMessageEffort?": "boolean",
		"supportsThinkingBindingControls?": "boolean",
		"requiresToolResultId?": "boolean",
		"requiresThinkingEnabled?": "boolean",
		"replayUnsignedThinking?": "boolean",
		"escapeBuiltinToolNames?": "boolean",
		"injectClaudeCodeInstruction?": "boolean",
	} satisfies Record<`${keyof ResolvedAnthropicCompat}?`, unknown>);
	const responsesCompat = type({
		...sharedCompat,
		"supportsDeveloperRole?": "boolean",
		"supportsStrictMode?": "boolean",
		"supportsReasoningEffort?": "boolean",
		"reasoningEffortMap?": effortMap,
		"supportsReasoningParams?": "boolean",
		"supportsPenaltyAndStopParams?": "boolean",
		"thinkingFormat?": '"openai" | "openrouter" | "zai" | "kimi" | "qwen" | "qwen-chat-template" | "chat-template"',
		"kimiApiFormat?": '"openai" | "anthropic"',
		"reasoningDisableMode?": '"omit" | "lowest-effort" | "none-effort" | "openrouter-enabled-false" | "cline-enabled-false" | "venice-disable-thinking" | "zai-thinking-disabled" | "qwen-enable-thinking-false" | "qwen-template-false" | "chat-template-thinking-false"',
		"omitReasoningEffort?": "boolean",
		"includeEncryptedReasoning?": "boolean",
		"filterReasoningHistory?": "boolean",
		"disableReasoningOnForcedToolChoice?": "boolean",
		"disableReasoningOnToolChoice?": "boolean",
		"supportsToolChoice?": "boolean",
		"supportsNamedToolChoice?": "boolean",
		"reasoningContentField?": '"reasoning_content" | "reasoning" | "reasoning_text"',
		"requiresReasoningContentForToolCalls?": "boolean",
		"requiresReasoningContentForAllAssistantTurns?": "boolean",
		"allowsSyntheticReasoningContentForToolCalls?": "boolean",
		"replayReasoningContent?": "boolean",
		"qwenPreserveThinking?": "boolean",
		"qwenTemplateReasoningEffort?": "boolean",
		"requiresThinkingAsText?": "boolean",
		"requiresMistralToolIds?": "boolean",
		"requiresToolResultName?": "boolean",
		"requiresAssistantAfterToolResult?": "boolean",
		"requiresAssistantContentForToolCalls?": "boolean",
		"stripDeepseekSpecialTokens?": "boolean",
		"streamMarkupHealingPattern?": '"kimi" | "dsml" | "qwen" | "thinking"',
		"streamFirstEventTimeoutMs?": rate,
		"reasoningDeltasMayBeCumulative?": "boolean",
		"emptyLengthFinishIsContextError?": "boolean",
		"usesOpenAIToolCallIdLimit?": "boolean",
		"promptCacheSessionHeader?": '"x-grok-conv-id"',
		"supportsPromptCacheBreakpoints?": "boolean",
		"promptCacheBreakpointTtl?": '"30m"',
		"isOpenRouterHost?": "boolean",
		"alwaysSendMaxTokens?": "boolean",
		"clampOutputToModelMax?": "boolean",
		"openRouterRouting?": routing,
		"wireModelIdMode?": '"raw" | "cline-pass" | "firepass" | "fireworks" | "openrouter"',
		"toolSchemaFlavor?": '"moonshot-mfjs"',
		"rejectRootObjectUnion?": "boolean",
		"retryWithoutStrictOnGrammarError?": "boolean",
		"supportsLongPromptCacheRetention?": "boolean",
		"strictResponsesPairing?": "boolean",
		"supportsImageDetailOriginal?": "boolean",
		"supportsObfuscationOptOut?": "boolean",
		"supportsAllTurnsReasoningContext?": "boolean",
		"supportsConfigurationUpdate?": "boolean",
		"requiresReasoningOffJuiceInstruction?": "boolean",
		"supportsReasoningSummary?": "boolean",
		"vercelGatewayRouting?": routing,
		"isVercelGatewayHost?": "boolean",
		"harmonyLeakMitigation?": "boolean",
		"cacheControlFormat?": '"anthropic"',
	} satisfies Record<`${keyof ResolvedOpenAIResponsesCompat}?`, unknown>);
	const fields = {
		id: "string",
		object: '"model"',
		owned_by: "string",
		"_provider?": "string",
		display_name: "string > 0",
		input_modalities: type('("text" | "image")[]').narrow(value => value.length > 0),
		context_length: limit,
		max_output_tokens: limit,
		reasoning: "boolean",
		"thinking?": thinking,
		"request_model_id?": rawId,
		cost: { ...rates, "longContext?": { ...rates, inputThreshold: tokenCount, "inputThresholdInclusive?": "boolean" } },
		"service_tier_cost?": { "flex?": rate, "priority?": rate },
	} as const;
	return type({ ...fields, api: '"anthropic-messages"', "compat?": anthropicCompat })
		.or(type({ ...fields, api: '"openai-codex-responses"', "compat?": responsesCompat }))
		.onDeepUndeclaredKey("reject")
		.narrow((value, ctx) => value.reasoning || !value.thinking || ctx.mustBe("thinking only on a reasoning model"));
});
