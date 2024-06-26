import { AuthTokenResponse } from "@composableai/studio-common";
import { AbstractFetchClient } from "api-fetch-client";
import AccountApi from "./AccountApi.js";
import AccountsApi from "./AccountsApi.js";
import AnalyticsApi from "./AnalyticsApi.js";
import { ApiKeysApi } from "./ApiKeysApi.js";
import EnvironmentsApi from "./EnvironmentsApi.js";
import InteractionsApi from "./InteractionsApi.js";
import ProjectsApi from "./ProjectsApi.js";
import PromptsApi from "./PromptsApi.js";
import { RunsApi } from "./RunsApi.js";
import TrainingApi from "./TrainingApi.js";

export interface StudioClientProps {
    serverUrl?: string;
    apikey?: string;
    projectId?: string;
    sessionTags?: string | string[];
    onRequest?: (request: Request) => void;
    onResponse?: (response: Response) => void;
}

export class StudioClient extends AbstractFetchClient<StudioClient> {

    /**
     * The session name will be sent when executing an interaction as a tag
     */
    sessionTags?: string | string[];

    constructor(
        opts: StudioClientProps = {}
    ) {
        super(opts.serverUrl || "https://api.composableprompts.com");
        if (opts.apikey) {
            this.withApiKey(opts.apikey);
        }
        if (opts.projectId) {
            this.headers["x-project-id"] = opts.projectId;
        }
        this.onRequest = opts.onRequest;
        this.onResponse = opts.onResponse;
        this.sessionTags = opts.sessionTags;
    }

    withApiKey(apiKey: string | null) {
        return this.withAuthCallback(
            apiKey ? () => Promise.resolve(`Bearer ${apiKey}`) : undefined
        );
    }

    set project(projectId: string | null) {
        if (projectId) {
            this.headers["x-project-id"] = projectId;
        } else {
            delete this.headers["x-project-id"];
        }
    }

    get project() {
        return this.headers["x-project-id"] || null;
    }

    /**
     *
     * Generate a token for use with other Composable's services
     *
     * @param accountId: selected account to generate the token for
     * @returns AuthTokenResponse
     */
    async getAuthToken(token?: string, accountId?: string): Promise<AuthTokenResponse> {
        const query = {
            accountId,
            token
        };

        return this.get('/auth/token', { query: query });
    }

    projects = new ProjectsApi(this);
    environments = new EnvironmentsApi(this);
    interactions = new InteractionsApi(this);
    prompts = new PromptsApi(this);
    runs = new RunsApi(this);
    account = new AccountApi(this);
    accounts = new AccountsApi(this);
    apikeys = new ApiKeysApi(this);
    analytics = new AnalyticsApi(this);
    training = new TrainingApi(this);

}
