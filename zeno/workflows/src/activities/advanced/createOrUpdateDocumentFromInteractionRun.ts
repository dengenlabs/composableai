import { UploadContentObjectPayload } from "@composableai/zeno-client";
import { ContentObjectStatus, DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/zeno-common";
import { log } from "@temporalio/activity";
import { setupActivity } from "../../dsl/setup/ActivityContext.js";
import { ActivityParamNotFound, NoDocumentFound } from "../../errors.js";



interface CreateOrUpdateObjectFromInteractionRunParams {
    /**
     * The execution run object to use. Required.
     * Not required in params since it is usually fetched
     */
    run_id?: string,
    /**
     * The document type to use. Required if updateExistingId is false.
     * Not required in params since it is usually fetched
     */
    object_type?: string,

    updateExistingId?: string,
    fallbackName?: string, // a name to use if no one was generated by the interaction
}

export interface CreateOrUpdateObjectFromInteractionRun extends DSLActivitySpec<CreateOrUpdateObjectFromInteractionRunParams> {
    name: 'createOrUpdateDocumentFromInteractionRun';
}

export async function createOrUpdateDocumentFromInteractionRun(payload: DSLActivityExecutionPayload) {

    const { params, zeno, studio } = await setupActivity<CreateOrUpdateObjectFromInteractionRunParams>(payload);

    const runId = params.run_id;
    const objectTypeName = params.object_type;

    if (!runId) {
        throw new ActivityParamNotFound("run", payload.activity);
    }
    if (!objectTypeName && !params.updateExistingId) {
        throw new ActivityParamNotFound("object_type", payload.activity);
    }

    log.info("Creating document from interaction result", { runId, objectTypeName });

    const run = await studio.runs.retrieve(runId).catch((e) => {
        throw new NoDocumentFound(`Error fetching run ${runId}: ${e.message}`);
    });

    const type = objectTypeName ?
        await zeno.types.getTypeByName(objectTypeName).catch((e) => {
            throw new NoDocumentFound(`Error fetching type ${objectTypeName}: ${e.message}`);
        })
        : undefined;


    const result = run.result;
    const resultIsObject = typeof result === 'object';
    const inputData = run.parameters;
    const parent = payload.objectIds.length > 1 ? undefined : payload.objectIds[0];

    let name: string;
    if (resultIsObject) {
        name = result['name'] || result["title"] || inputData['name'] || params.fallbackName || 'Untitled';
    } else {
        name = inputData['name'] || params.fallbackName || 'Untitled';
    }

    const docPayload: UploadContentObjectPayload = {
        name,
        parent: parent,
        properties: resultIsObject ? result : {},
        text: !resultIsObject ? result : undefined,
        type: type?.id,
        status: ContentObjectStatus.completed,
    };
    log.info("Creating document with payload", docPayload);

    //create or update the document
    let newDoc: boolean = false;
    let doc = undefined;
    if (params.updateExistingId) {
        doc = await zeno.objects.update(params.updateExistingId, docPayload);
    } else {
        doc = await zeno.objects.create(docPayload);
        newDoc = true;
    }

    log.info(`Document ${objectTypeName + ' '}${doc.id}(${doc.name}) ${newDoc ? 'created' : 'updated'}`);
    return { id: doc.id, isNew: newDoc, type: name }
}