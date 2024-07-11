import { StudioClient } from "@composableai/studio-client";
import { Command } from "commander";
import { config } from "./profiles/index.js";
import { ZenoClient } from "@composableai/zeno-client";


let _client: StudioClient | undefined;
export function getClient(program: Command) {
    if (!_client) {
        _client = createClient(program);
    }
    return _client;
}

function createClient(program: Command) {
    const profile = config.current;
    const options = program.opts();

    const env = {
        apikey: options.apikey || profile?.apikey || process.env.COMPOSABLE_PROMPTS_APIKEY,
        serverUrl: options.server || profile?.studio_server_url || process.env.COMPOSABLE_PROMPTS_SERVER_URL || 'https://api.composableprompts.com',
        projectId: options.project || profile?.project || process.env.COMPOSABLE_PROMPTS_PROJECT_ID || undefined,
        sessionTags: profile?.session_tags ? profile.session_tags.split(/\s*,\s*/) : 'cli',
    }

    return new StudioClient(env)

}


let _store: ZenoClient | undefined;
export function getStore(program: Command) {
    if (!_store) {
        _store = createStoreClient(program);
    }
    return _store;
}

function createStoreClient(program: Command) {
    const profile = config.current;
    const env = {
        apikey: profile?.apikey || process.env.ZENO_APIKEY,
        serverUrl: profile?.zeno_server_url || process.env.ZENO_SERVER_URL,
    }

    const serverUrl = program.getOptionValue('server');
    if (serverUrl) {
        env.serverUrl = serverUrl;
    }
    const apikey = program.getOptionValue('apikey');
    if (apikey) {
        env.apikey = apikey;
    }

    if (apikey) {
        env.apikey = apikey;
    }
    if (serverUrl) {
        env.serverUrl = serverUrl;
    }

    return new ZenoClient(env)
}