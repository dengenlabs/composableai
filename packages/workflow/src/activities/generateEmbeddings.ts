import { md5 } from '@composableai/blobs';
import { StudioClient } from "@composableai/client";
import { DSLActivityExecutionPayload, DSLActivitySpec } from "@composableai/common";
import { EmbeddingsResult } from "@llumiverse/core";
import { log } from "@temporalio/activity";
import * as tf from '@tensorflow/tfjs-node';
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { NoDocumentFound } from '../errors.js';
import { countTokens } from "../utils/tokens.js";


export interface GenerateEmbeddingsParams {
    model?: string;
    environment?: string;
    force?: boolean;
}

export interface GenerateEmbeddings extends DSLActivitySpec<GenerateEmbeddingsParams> {
    name: 'generateEmbeddings';
}

export async function generateEmbeddings(payload: DSLActivityExecutionPayload) {
    const { params, client, objectId, fetchProject } = await setupActivity<GenerateEmbeddingsParams>(payload);
    const force = params.force;
    const projectData = await fetchProject();
    const embeddingsConfig = projectData?.configuration.embeddings;
    const maxTokens = embeddingsConfig?.max_tokens ?? 4000;

    if (!projectData) {
        throw new NoDocumentFound('Project not found', [payload.project_id]);
    }

    if (!projectData?.configuration.generate_embeddings) {
        log.info(`Embeddings generation disabled for project: ${projectData?.id}`);
        return { id: objectId, status: "skipped", message: "Embeddings generation is disabled (generated_embeddings is false)" }
    }

    log.info(`Object ${objectId} embedding generation starting`, { force, config: embeddingsConfig });

    const env = embeddingsConfig?.environment;
    if (!env) {
        throw new Error('No environment found in project configuration. Set environment in project configuration to generate embeddings.');
    }

    const document = await client.objects.retrieve(objectId, "+text +parts +embedding +tokens");

    if (!document) {
        return { id: objectId, status: "failed", message: "object not found" }
    }

    if (!document.text) {
        return { id: objectId, status: "failed", message: "no text found" }
    }

    if (!force && document.embedding?.etag === (document.text_etag ?? md5(document.text))) {
        return { id: objectId, status: "skipped", message: "embeddings already generated" }
    }

    // Count tokens if not already done
    if (!document.tokens?.count) {
        log.debug('Updating token count for document: ' + objectId);
        const tokensData = countTokens(document.text);
        await client.objects.update(document.id, {
            tokens: {
                ...tokensData,
                etag: document.text_etag ?? md5(document.text)
            }
        });
        document.tokens = {
            ...tokensData,
            etag: document.text_etag ?? md5(document.text)
        };
    }

    //generate embeddings for the main doc if document isn't too large
    //if too large, we'll just generate embeddings for the parts
    //then we can generate embeddings for the main document by averaging the tensors
    log.info(`Generating embeddings for document ${objectId} - ${document.tokens?.count} tokens - ${document.text.length} chars`);
    if (document.tokens?.count && document.tokens.count > maxTokens) {
        log.info('Document too large, generating embeddings for parts');

        if (!document.parts || document.parts.length === 0) {
            return { id: objectId, status: "failed", message: "no parts found" }
        }

        const docParts = await Promise.all(document.parts?.map(async (partId) => client.objects.retrieve(partId, "+text +embedding +tokens")));

        const res = await Promise.all(docParts.map(async (part, i) => {
            if (!part.text) {
                return { id: part.id, number: i, result: null, message: "no text found"}
            }

            if (part.tokens?.count && part.tokens.count > maxTokens) {
                log.info('Part too large, skipping embeddings generation for part', { part: part.id, tokens: part.tokens.count });
                return { id: part.id, number: i, result: null, message: "part too large" }
            }


            if (!force && part.embedding?.etag === (part.text_etag ?? md5(part.text))) {
                return { id: part.id, number: i, result: part.embedding }
            }

            const e = await generateEmbeddingsFromStudio(part.text, env, client).catch(e => {
                log.error('Error generating embeddings for part', { part: part.id, tokens: part.tokens, text_length: part.text?.length, error: e });
                return null;
            });

            if (!e || !e.values) {
                return { id: part.id, number: i, result: null, message: "no embeddings generated" }
            }

            const updated = await client.objects.update(part.id, {
                embedding: {
                    content: e.values,
                    model: e.model,
                    etag: e.etag
                }
            });

            log.debug('Generated embeddings for part:', { result: updated });
            return { id: part.id, number: i, result: e }
        }));

        log.info('Got embeddings generated for parts:', res);

        // Filter out parts without embeddings
        const validEmbeddings = res.filter(item => item.result !== null) as { id: string, number: number, result: EmbeddingsResult }[];

        // Compute the document-level embedding using TensorFlow for attention mechanism
        log.info('Computing document-level embedding using TF');
        const documentEmbedding = computeAttentionEmbedding(validEmbeddings.map(item => item.result.values));

        // Save the document-level embedding
        await client.objects.update(objectId, {
            embedding: {
                content: documentEmbedding,
                model: "attention",
                etag: document.text_etag ?? md5(document.text)
            }
        });
        return { id: objectId, status: "completed", part: docParts.map(i => i.id), len: documentEmbedding.length }

    } else {
        log.info('Generating embeddings for document');
        const res = await generateEmbeddingsFromStudio(document.text, env, client);
        if (!res || !res.values) {
            return { id: objectId, status: "failed", message: "no embeddings generated" }
        }

        await client.objects.update(objectId, {
            embedding: {
                content: res.values,
                model: res.model,
                etag: document.text_etag ?? md5(document.text)
            }
        });

        return { id: objectId, status: "completed", len: res.values.length }
    }

}



async function generateEmbeddingsFromStudio(text: string, env: string, client: StudioClient): Promise<EmbeddingsResult> {

    log.info(`Generating embeddings for text of ${text.length} chars with environment ${env}`);

    return client.environments.embeddings(env, {
        content: text,
    }).then(res => res).catch(e => {
        log.error('Error generating embeddings for text', { error: e })
        throw e;
    });

}

function computeAttentionEmbedding(embeddingsArray: number[][], axis: number = 0) {
    if (embeddingsArray.length === 0) return [];
    log.info('Computing attention embedding for', { embeddingsArrays: embeddingsArray.map(a => a.length) });
    const start = new Date().getTime();

    // Convert embeddings array to TensorFlow tensor
    const embeddingsTensor = tf.tensor(embeddingsArray);

    // Initialize trainable attention weights
    const attentionWeights = tf.variable(tf.randomNormal([embeddingsArray.length]), true);

    // Compute attention scoresje sui
    const attentionScores = tf.softmax(attentionWeights);

    // Compute weighted sum of embeddings
    const weightedEmbeddings = tf.mul(embeddingsTensor.transpose(), attentionScores).transpose();
    const documentEmbeddingTensor = tf.sum(weightedEmbeddings, axis);

    // Convert the result back to a JavaScript array
    const documentEmbedding = documentEmbeddingTensor.arraySync() as number[];
    const duration = (new Date().getTime() - start);
    log.info(`Computed attention embeddings in ${duration}ms - array size: ${documentEmbedding.length}`, { length: documentEmbedding.length });

    // Clean up tensors
    embeddingsTensor.dispose();
    attentionWeights.dispose();
    attentionScores.dispose();
    weightedEmbeddings.dispose();
    documentEmbeddingTensor.dispose();

    return documentEmbedding;
}