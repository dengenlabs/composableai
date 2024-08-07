import { DSLActivityExecutionPayload, DSLActivitySpec } from "@becomposable/common";
import { log } from "@temporalio/activity";
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { TruncateSpec } from "../utils/tokens.js";
import { InteractionExecutionParams, executeInteractionFromActivity } from "./executeInteraction.js";

export interface GenerateDocumentPropertiesParams extends InteractionExecutionParams {
    typesHint?: string[];
    /**
     * truncate the input doc text to the specified max_tokens
     */
    truncate?: TruncateSpec;
}
export interface GenerateDocumentProperties extends DSLActivitySpec<GenerateDocumentPropertiesParams> {
    name: 'generateDocumentProperties';
}

export async function generateDocumentProperties(payload: DSLActivityExecutionPayload) {
    const context = await setupActivity<GenerateDocumentPropertiesParams>(payload);
    const { params, client, objectId } = context;

    const project = await context.fetchProject();

    const doc = await client.objects.retrieve(objectId, "+text");
    const type = doc.type ? await client.types.retrieve(doc.type.id) : undefined;

    if (!doc?.text && !doc?.content?.type?.startsWith("image/")) {
        log.warn(`Object ${objectId} not found or text is empty`, { doc });
        return { status: "failed", error: "no-text" }
    }

    if (!type || !type.object_schema) {
        log.warn(`Object ${objectId} has no schema`);
        return { status: "failed", error: "no-schema" };
    }

    /*if (!force && doc.properties?.etag === (doc.text_etag ?? md5(doc.text))) {
        log.info("Properties already extracted", { objectId: objectId });
        return { status: "skipped" };
    }*/

    const getImageRef = () => {
        if (!doc.content?.type?.startsWith("image/")) {
            return undefined;
        }

        return "store:" + doc.id;
    }

    const promptData = {
        content: doc.text ?? undefined,
        image: getImageRef() ?? undefined,
        human_context: project?.configuration?.human_context ?? undefined,
    }

    log.info(` Extracting information from object ${objectId} with type ${type.name}`, payload.debug_mode ? { params, } : undefined);

    const infoRes = await executeInteractionFromActivity(
        client,
        "ExtractInformation",
        {
            ...params,
            include_previous_error: true,
            result_schema: type.object_schema,
        },
        promptData,
        payload.debug_mode ?? false
    );

    log.info(`Extracted information from object ${objectId} with type ${type.name}`, { infoRes });
    await client.objects.update(doc.id, {
        properties: {
            ...infoRes.result,
            etag: doc.text_etag
        }
    });


    return { status: "completed" };

}