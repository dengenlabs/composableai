import { AIModel } from "@llumiverse/core";


export enum SupportedProviders {
    // from llumiverse
    openai = 'openai',
    azure_openai = 'azure_openai',
    huggingface_ie = 'huggingface_ie',
    replicate = 'replicate',
    bedrock = 'bedrock',
    vertexai = 'vertexai',
    togetherai = 'togetherai',
    mistralai = 'mistralai',
    groq = 'groq',
    watsonx = 'watsonx',
    // from studio
    virtual_lb = 'virtual_lb',
    virtual_mediator = 'virtual_mediator',
    test = 'test'
}

export interface SupportedProviderParams {
    id: string;
    name: SupportedProviders;
    requiresApiKey: boolean;
    requiresEndpointUrl: boolean;
    supportSearch?: boolean;
}

export const SupportedProvidersList: Record<SupportedProviders, SupportedProviderParams> = {
    'openai':
    {
        id: 'openai',
        name: SupportedProviders.openai,
        requiresApiKey: true,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    'azure_openai':
    {
        id: 'azure_openai',
        name: SupportedProviders.azure_openai,
        requiresApiKey: true,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    'huggingface_ie':
    {
        id: 'huggingface_ie',
        name: SupportedProviders.huggingface_ie,
        requiresApiKey: true,
        requiresEndpointUrl: true,
    },
    'replicate':
    {
        id: 'replicate',
        name: SupportedProviders.replicate,
        requiresApiKey: true,
        requiresEndpointUrl: false,
        supportSearch: true,
    },
    'bedrock':
    {
        id: 'bedrock',
        name: SupportedProviders.bedrock,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    vertexai: {
        id: 'vertexai',
        name: SupportedProviders.vertexai,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    togetherai: {
        id: 'togetherai',
        name: SupportedProviders.togetherai,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    mistralai: {
        id: 'mistralai',
        name: SupportedProviders.mistralai,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    groq: {
        id: 'groq',
        name: SupportedProviders.groq,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    watsonx: {
        id: 'watsonx',
        name: SupportedProviders.watsonx,
        requiresApiKey: true,
        requiresEndpointUrl: true,
        supportSearch: false
    },
    /*'cohere': {
        id: 'cohere',
        name: SupportedProviders.cohere,
        requiresApiKey: true,
        requiresEndpointUrl: false,
        supportSearch: false,
    },*/
    'virtual_lb':
    {
        id: 'virtual_lb',
        name: SupportedProviders.virtual_lb,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    'virtual_mediator':
    {
        id: 'virtual_mediator',
        name: SupportedProviders.virtual_mediator,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
    'test': {
        id: 'test',
        name: SupportedProviders.test,
        requiresApiKey: false,
        requiresEndpointUrl: false,
        supportSearch: false,
    },
};


export interface VirtualEnvEntry {
    model: string;
}

/**
 * Custom configuration for virtual environments
 **/
export interface LoadBalancingEnvConfig {
    entries?: LoadBalancingEnvEntryConfig[];
    balance_if_failed?: boolean;
}

export interface LoadBalancingEnvEntryConfig extends VirtualEnvEntry {
    weight: number;
}

export interface MediatorEnvConfig {
    entries?: VirtualEnvEntry[];
    max_concurrent_requests?: number;
    // optional max tokens to be sued for mediation
    max_tokens?: number;
    // optional temperature to be used for mediation
    temperature?: number;
    // the model used to evaluate the repsonses. If not specified all entries will mediates the response
    // and the best response will be picked
    mediators?: VirtualEnvEntry[];
}

export interface ExecutionEnvironment {
    id: string;
    name: string;
    provider: SupportedProviders;
    description?: string;
    endpoint_url?: string;
    default_model?: string;
    enabled_models?: AIModel[];
    apiKey?: string;
    config?: any;
    account: string;
    allowed_projects?: string[];
    created_by: string,
    updated_by: string,
    created_at: string;
    updated_at: string;
}

export interface ExecutionEnvironmentRef {
    id: string;
    name: string;
    provider: SupportedProviders;
    enabled_models?: AIModel[];
    default_model?: string;
    endpoint_url?: string;
    allowed_projects?: string[];
    account: string;
    created_by: string;
    updated_by: string;
    created_at: string;
    updated_at: string;
}

export const ExecutionEnvironmentRefPopulate = "id name provider enabled_models default_model endpoint_url allowed_projects account created_at updated_at";

export interface ExecutionEnvironmentCreatePayload extends Omit<ExecutionEnvironment, 'id' | 'account' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'project'> { }
export interface ExecutionEnvironmentUpdatePayload extends Partial<Omit<ExecutionEnvironment, 'id' | 'account' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>> { }
