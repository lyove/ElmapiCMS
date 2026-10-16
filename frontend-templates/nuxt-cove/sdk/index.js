import superagent from 'superagent';
export class ElmapiError extends Error {
    constructor(message, statusCode, code, details, requestInfo) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.requestInfo = requestInfo;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export class AuthenticationError extends ElmapiError {
    constructor(message = 'Authentication failed. Please check your token.', requestInfo) {
        super(message, 401, 'AUTHENTICATION_ERROR', undefined, requestInfo);
    }
}
export class AuthorizationError extends ElmapiError {
    constructor(message = 'You do not have permission to perform this action.', details, requestInfo) {
        super(message, 403, 'AUTHORIZATION_ERROR', details, requestInfo);
    }
}
export class NotFoundError extends ElmapiError {
    constructor(resourceOrMessage, requestInfo) {
        const normalized = resourceOrMessage.trim();
        const message = /not found/i.test(normalized) ? normalized : `${normalized} not found.`;
        super(message, 404, 'NOT_FOUND', undefined, requestInfo);
    }
}
export class ValidationError extends ElmapiError {
    constructor(message, details, requestInfo) {
        super(message, 422, 'VALIDATION_ERROR', details, requestInfo);
    }
}
export class RateLimitError extends ElmapiError {
    constructor(message = 'Rate limit exceeded. Please try again later.', requestInfo) {
        super(message, 429, 'RATE_LIMIT_ERROR', undefined, requestInfo);
    }
}
export class ServerError extends ElmapiError {
    constructor(message = 'Server error occurred. Please try again later.', requestInfo) {
        super(message, 500, 'SERVER_ERROR', undefined, requestInfo);
    }
}
export class NetworkError extends ElmapiError {
    constructor(message = 'Network error occurred. Please check your connection.', requestInfo) {
        super(message, undefined, 'NETWORK_ERROR', undefined, requestInfo);
    }
}
export class TimeoutError extends ElmapiError {
    constructor(timeout, requestInfo) {
        super(`Request timed out after ${timeout}ms.`, undefined, 'TIMEOUT_ERROR', undefined, requestInfo);
    }
}
function resolveApiBasePath(options) {
    const baseUrl = typeof options.baseUrl === 'string' ? options.baseUrl.trim() : '';
    if (!baseUrl) {
        throw new ValidationError('baseUrl is required (your ElmapiCMS instance API root, e.g. https://cms.example.com/api).');
    }
    return baseUrl.replace(/\/+$/, '');
}
function createApiError(error, requestInfo) {
    const typedError = error;
    const statusCode = typedError.response?.status;
    const responseBody = typedError.response?.body ?? typedError.response?.text;
    let errorData = {};
    if (responseBody !== undefined) {
        if (typeof responseBody === 'string') {
            try {
                errorData = JSON.parse(responseBody);
            }
            catch {
                errorData = { message: responseBody };
            }
        }
        else {
            errorData = responseBody;
        }
    }
    const message = errorData.message ?? errorData.error ?? typedError.message ?? 'An unknown error occurred';
    const baseDetails = errorData.details ?? errorData.errors;
    const details = errorData.verification_token !== undefined || errorData.verification_required !== undefined
        ? {
            ...(typeof baseDetails === 'object' && baseDetails !== null && !Array.isArray(baseDetails)
                ? baseDetails
                : {}),
            ...(errorData.verification_token !== undefined ? { verification_token: errorData.verification_token } : {}),
            ...(errorData.verification_required !== undefined ? { verification_required: errorData.verification_required } : {}),
            ...(errorData.code !== undefined ? { code: errorData.code } : {}),
        }
        : baseDetails;
    const code = errorData.code;
    switch (statusCode) {
        case 401:
            return new AuthenticationError(message, requestInfo);
        case 403:
            return new AuthorizationError(message, details, requestInfo);
        case 404:
            return new NotFoundError(message, requestInfo);
        case 422:
            return new ValidationError(message, details, requestInfo);
        case 429:
            return new RateLimitError(message, requestInfo);
        case 500:
        case 502:
        case 503:
        case 504:
            return new ServerError(message, requestInfo);
        default:
            return new ElmapiError(message, statusCode, code, details, requestInfo);
    }
}
function createNetworkError(error, requestInfo) {
    const typedError = error;
    if (typedError.code === 'ECONNABORTED' || typedError.timeout) {
        return new TimeoutError(requestInfo?.data && typeof requestInfo.data === 'object' ? 30000 : 30000, requestInfo);
    }
    if (typedError.code === 'ENOTFOUND' || typedError.code === 'ECONNREFUSED') {
        return new NetworkError('Unable to connect to the server. Please check your internet connection and API URL.', requestInfo);
    }
    return new NetworkError(typedError.message ?? 'Network error occurred', requestInfo);
}
export class ApiClient {
    constructor(options) {
        this.project = {
            get: (params) => this.projectGet(params),
            locales: {
                add: (locale) => this.projectLocalesAdd(locale),
                setDefault: (locale) => this.projectLocalesSetDefault(locale),
                remove: (locale) => this.projectLocalesRemove(locale),
            },
        };
        this.collections = {
            list: () => this.collectionsList(),
            get: (collectionSlug) => this.collectionsGet(collectionSlug),
            create: (payload) => this.collectionsCreate(payload),
            update: (collectionSlug, payload) => this.collectionsUpdate(collectionSlug, payload),
            delete: (collectionSlug) => this.collectionsDelete(collectionSlug),
            reorder: (payload) => this.collectionsReorder(payload),
        };
        this.fields = {
            create: (collectionSlug, payload) => this.fieldsCreate(collectionSlug, payload),
            update: (collectionSlug, fieldId, payload) => this.fieldsUpdate(collectionSlug, fieldId, payload),
            delete: (collectionSlug, fieldId) => this.fieldsDelete(collectionSlug, fieldId),
            reorder: (collectionSlug, payload) => this.fieldsReorder(collectionSlug, payload),
        };
        this.content = {
            list: (collectionSlug, params) => this.contentList(collectionSlug, params),
            get: (collectionSlug, uuid, params) => this.contentGet(collectionSlug, uuid, params),
            create: (collectionSlug, payload) => this.contentCreate(collectionSlug, payload),
            update: (collectionSlug, uuid, payload) => this.contentUpdate(collectionSlug, uuid, payload),
            patch: (collectionSlug, uuid, payload) => this.contentPatch(collectionSlug, uuid, payload),
            delete: (collectionSlug, uuid, force) => this.contentDelete(collectionSlug, uuid, force),
            bulkCreate: (collectionSlug, payload) => this.contentBulkCreate(collectionSlug, payload),
            bulkUpdate: (collectionSlug, payload) => this.contentBulkUpdate(collectionSlug, payload),
            bulkDelete: (collectionSlug, payload) => this.contentBulkDelete(collectionSlug, payload),
            linkTranslation: (collectionSlug, uuid, payload) => this.contentLinkTranslation(collectionSlug, uuid, payload),
            publish: (collectionSlug, uuid) => this.contentPublish(collectionSlug, uuid),
            unpublish: (collectionSlug, uuid) => this.contentUnpublish(collectionSlug, uuid),
            discardDraft: (collectionSlug, uuid) => this.contentDiscardDraft(collectionSlug, uuid),
            versions: {
                list: (collectionSlug, uuid) => this.contentVersionsList(collectionSlug, uuid),
                get: (collectionSlug, uuid, versionNumber) => this.contentVersionsGet(collectionSlug, uuid, versionNumber),
                revert: (collectionSlug, uuid, versionNumber) => this.contentVersionsRevert(collectionSlug, uuid, versionNumber),
                updateLabel: (collectionSlug, uuid, versionNumber, payload) => this.contentVersionsUpdateLabel(collectionSlug, uuid, versionNumber, payload),
            },
        };
        this.assets = {
            list: (params) => this.assetsList(params),
            get: (identifier) => this.assetsGet(identifier),
            getByFilename: (filename) => this.assetsGetByFilename(filename),
            upload: (file, metadata) => this.assetsUpload(file, metadata),
            delete: (identifier, force) => this.assetsDelete(identifier, force),
            bulkUpload: (files) => this.assetsBulkUpload(files),
            bulkUpdateMetadata: (payload) => this.assetsBulkUpdateMetadata(payload),
        };
        this.webhooks = {
            list: () => this.webhooksList(),
            get: (uuid) => this.webhooksGet(uuid),
            create: (payload) => this.webhooksCreate(payload),
            update: (uuid, payload) => this.webhooksUpdate(uuid, payload),
            delete: (uuid) => this.webhooksDelete(uuid),
            logs: (uuid, params) => this.webhooksLogs(uuid, params),
        };
        this.authStateListeners = [];
        this.basePath = resolveApiBasePath(options);
        this.projectId = options.projectId;
        this.timeout = options.timeout ?? 30000;
        this.apiKey = options.apiKey ?? options.cmsApiToken ?? options.projectApiToken;
        this.userAccessToken = options.projectUserAuth?.accessToken;
        this.userRefreshToken = options.projectUserAuth?.refreshToken;
        this.autoRefresh = options.projectUserAuth?.autoRefresh !== false;
        this.tokenStorage = options.projectUserAuth?.tokenStorage;
        if (this.tokenStorage) {
            this.userAccessToken = this.tokenStorage.getAccessToken() ?? this.userAccessToken;
            this.userRefreshToken = this.tokenStorage.getRefreshToken() ?? this.userRefreshToken;
        }
        this.validateConfiguration();
    }
    getSession() {
        return {
            accessToken: this.getProjectUserAccessToken(),
            refreshToken: this.getProjectUserRefreshToken(),
            expiresAt: this.sessionExpiresAt,
            refreshTokenExpiresAt: this.refreshSessionExpiresAt,
            user: this.sessionUser,
        };
    }
    getUser() {
        return this.getSession().user;
    }
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        return () => {
            this.authStateListeners = this.authStateListeners.filter((listener) => listener !== callback);
        };
    }
    async signUp(payload) {
        const result = await this.request({
            method: 'POST',
            path: '/auth/signup',
            params: undefined,
            data: payload,
            tokenKind: 'none',
            allowUserRefresh: false,
        });
        if (result.access_token) {
            this.setProjectUserTokensFromAuthPayload(result);
            this.emitAuthStateChange('signed_in');
        }
        return result;
    }
    async signInWithPassword(payload) {
        const result = await this.request({
            method: 'POST',
            path: '/auth/login',
            params: undefined,
            data: payload,
            tokenKind: 'none',
            allowUserRefresh: false,
        });
        if (result.access_token) {
            this.setProjectUserTokensFromAuthPayload(result);
            this.emitAuthStateChange('signed_in');
        }
        return result;
    }
    /**
     * Sign in with a provider OIDC id_token (e.g. Google). The app completes OAuth with the
     * provider client-side; this exchanges the id_token for Elmapi project user session tokens.
     */
    async signInWithSocial(payload) {
        const result = await this.request({
            method: 'POST',
            path: '/auth/login/social',
            params: undefined,
            data: payload,
            tokenKind: 'none',
            allowUserRefresh: false,
        });
        if (result.access_token) {
            this.setProjectUserTokensFromAuthPayload(result);
            this.emitAuthStateChange('signed_in');
        }
        return result;
    }
    async refreshSession() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        const refreshToken = this.getProjectUserRefreshToken();
        if (!refreshToken) {
            throw new AuthenticationError('No refresh token available.');
        }
        this.refreshPromise = this.request({
            method: 'POST',
            path: '/auth/refresh',
            params: undefined,
            data: { refresh_token: refreshToken },
            tokenKind: 'none',
            allowUserRefresh: false,
            retryOnAuthError: false,
        })
            .then((result) => {
            this.setProjectUserTokensFromAuthPayload(result);
            this.emitAuthStateChange('token_refreshed');
            return result;
        })
            .finally(() => {
            this.refreshPromise = undefined;
        });
        return this.refreshPromise;
    }
    async signOut() {
        try {
            await this.request({
                method: 'POST',
                path: '/auth/logout',
                params: undefined,
                tokenKind: 'projectUser',
                allowUserRefresh: false,
            });
        }
        finally {
            this.clearProjectUserTokens();
            this.emitAuthStateChange('signed_out');
        }
    }
    async signOutAll() {
        try {
            await this.request({
                method: 'POST',
                path: '/auth/logout-all',
                params: undefined,
                tokenKind: 'projectUser',
                allowUserRefresh: false,
            });
        }
        finally {
            this.clearProjectUserTokens();
            this.emitAuthStateChange('signed_out');
        }
    }
    me() {
        return this.request({
            method: 'GET',
            path: '/auth/me',
            params: undefined,
            tokenKind: 'projectUser',
            allowUserRefresh: true,
        });
    }
    changePassword(payload) {
        return this.request({
            method: 'POST',
            path: '/auth/change-password',
            params: undefined,
            tokenKind: 'projectUser',
            data: payload,
            allowUserRefresh: true,
        });
    }
    /**
     * Request a new verification token for an email. Use `verification_token` from the response
     * (when present) in your own delivery flow (email, SMS, etc.).
     */
    resendVerificationEmail(payload) {
        return this.request({
            method: 'POST',
            path: '/auth/verify-email/resend',
            params: undefined,
            tokenKind: 'none',
            data: payload,
            allowUserRefresh: false,
        });
    }
    confirmVerificationEmail(payload) {
        return this.request({
            method: 'POST',
            path: '/auth/verify-email/confirm',
            params: undefined,
            tokenKind: 'none',
            data: payload,
            allowUserRefresh: false,
        });
    }
    listUserApiKeys() {
        return this.request({
            method: 'GET',
            path: '/auth/api-keys',
            params: undefined,
            tokenKind: 'projectUser',
            allowUserRefresh: true,
        });
    }
    createUserApiKey(payload) {
        return this.request({
            method: 'POST',
            path: '/auth/api-keys',
            params: undefined,
            tokenKind: 'projectUser',
            allowUserRefresh: true,
            data: payload,
        });
    }
    revokeUserApiKey(keyId) {
        return this.request({
            method: 'POST',
            path: `/auth/api-keys/${keyId}/revoke`,
            params: undefined,
            tokenKind: 'projectUser',
            allowUserRefresh: true,
        });
    }
    getDebugInfo() {
        return {
            basePath: this.basePath,
            projectId: this.projectId,
            timeout: this.timeout,
            hasApiKey: !!this.apiKey,
            hasProjectUserToken: !!this.getProjectUserAccessToken(),
        };
    }
    async projectGet(params) {
        return this.request({ method: 'GET', path: '/', params, tokenKind: 'apiKey', allowUserRefresh: false });
    }
    async projectLocalesAdd(locale) {
        return this.request({
            method: 'POST',
            path: '/project/locales',
            params: undefined,
            data: { locale },
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async projectLocalesSetDefault(locale) {
        return this.request({
            method: 'PUT',
            path: '/project/locales/default',
            params: undefined,
            data: { locale },
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async projectLocalesRemove(locale) {
        return this.request({
            method: 'DELETE',
            path: `/project/locales/${encodeURIComponent(locale)}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async collectionsList() {
        return this.request({ method: 'GET', path: '/collections', params: undefined, tokenKind: 'apiKey', allowUserRefresh: false });
    }
    async collectionsGet(collectionSlug) {
        return this.request({
            method: 'GET',
            path: `/collections/${collectionSlug}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async collectionsCreate(payload) {
        return this.request({
            method: 'POST',
            path: '/collections',
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async collectionsUpdate(collectionSlug, payload) {
        return this.request({
            method: 'PUT',
            path: `/collections/${collectionSlug}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async collectionsDelete(collectionSlug) {
        const data = { slug: collectionSlug };
        return this.request({
            method: 'DELETE',
            path: `/collections/${collectionSlug}`,
            params: undefined,
            data,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async collectionsReorder(payload) {
        return this.request({
            method: 'POST',
            path: '/collections/reorder',
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async fieldsCreate(collectionSlug, payload) {
        return this.request({
            method: 'POST',
            path: `/collections/${collectionSlug}/fields`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async fieldsUpdate(collectionSlug, fieldId, payload) {
        return this.request({
            method: 'PUT',
            path: `/collections/${collectionSlug}/fields/${fieldId}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async fieldsDelete(collectionSlug, fieldId) {
        return this.request({
            method: 'DELETE',
            path: `/collections/${collectionSlug}/fields/${fieldId}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async fieldsReorder(collectionSlug, payload) {
        return this.request({
            method: 'POST',
            path: `/collections/${collectionSlug}/fields/reorder`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentList(collectionSlug, params) {
        return this.request({ method: 'GET', path: `/${collectionSlug}`, params, tokenKind: 'apiKey', allowUserRefresh: false });
    }
    async contentGet(collectionSlug, uuid, params) {
        return this.request({ method: 'GET', path: `/${collectionSlug}/${uuid}`, params, tokenKind: 'apiKey', allowUserRefresh: false });
    }
    async contentCreate(collectionSlug, payload) {
        return this.request({
            method: 'POST',
            path: `/${collectionSlug}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentUpdate(collectionSlug, uuid, payload) {
        return this.request({
            method: 'PUT',
            path: `/${collectionSlug}/${uuid}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentPatch(collectionSlug, uuid, payload) {
        return this.request({
            method: 'PATCH',
            path: `/${collectionSlug}/${uuid}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentDelete(collectionSlug, uuid, force) {
        return this.request({
            method: 'DELETE',
            path: `/${collectionSlug}/${uuid}`,
            params: force ? { force } : {},
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentBulkCreate(collectionSlug, payload) {
        return this.request({
            method: 'POST',
            path: `/bulk/${collectionSlug}/entries`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentBulkUpdate(collectionSlug, payload) {
        return this.request({
            method: 'PATCH',
            path: `/bulk/${collectionSlug}/entries`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentBulkDelete(collectionSlug, payload) {
        return this.request({
            method: 'DELETE',
            path: `/bulk/${collectionSlug}/entries`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentLinkTranslation(collectionSlug, uuid, payload) {
        return this.request({
            method: 'POST',
            path: `/${collectionSlug}/${uuid}/link-translation`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentPublish(collectionSlug, uuid) {
        return this.request({
            method: 'POST',
            path: `/${collectionSlug}/${uuid}/publish`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentUnpublish(collectionSlug, uuid) {
        return this.request({
            method: 'POST',
            path: `/${collectionSlug}/${uuid}/unpublish`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentDiscardDraft(collectionSlug, uuid) {
        return this.request({
            method: 'POST',
            path: `/${collectionSlug}/${uuid}/discard-draft`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentVersionsList(collectionSlug, uuid) {
        return this.request({
            method: 'GET',
            path: `/${collectionSlug}/${uuid}/versions`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentVersionsGet(collectionSlug, uuid, versionNumber) {
        return this.request({
            method: 'GET',
            path: `/${collectionSlug}/${uuid}/versions/${versionNumber}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentVersionsRevert(collectionSlug, uuid, versionNumber) {
        return this.request({
            method: 'POST',
            path: `/${collectionSlug}/${uuid}/versions/${versionNumber}/revert`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async contentVersionsUpdateLabel(collectionSlug, uuid, versionNumber, payload) {
        return this.request({
            method: 'PATCH',
            path: `/${collectionSlug}/${uuid}/versions/${versionNumber}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async assetsList(params) {
        return this.request({ method: 'GET', path: '/files', params, tokenKind: 'apiKey', allowUserRefresh: false });
    }
    async assetsGet(identifier) {
        return this.request({
            method: 'GET',
            path: `/files/${identifier}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async assetsGetByFilename(filename) {
        return this.request({
            method: 'GET',
            path: `/files/name/${encodeURIComponent(filename)}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async assetsUpload(file, metadata) {
        const url = `${this.basePath}/files`;
        let request = superagent.post(url);
        request = request.set('project-id', this.projectId);
        request = request.set('Accept', 'application/json');
        if (this.apiKey) {
            request = request.set('Authorization', `Bearer ${this.apiKey}`);
        }
        let fileName = 'upload.bin';
        if (typeof File !== 'undefined' && file instanceof File) {
            fileName = file.name || fileName;
            request = request.attach('file', Buffer.from(await file.arrayBuffer()), {
                filename: fileName,
                contentType: file.type || 'application/octet-stream',
            });
        }
        else if (Buffer.isBuffer(file)) {
            request = request.attach('file', file, fileName);
        }
        else {
            throw new ValidationError('Invalid file payload for upload.');
        }
        if (metadata) {
            request = request.field('metadata', JSON.stringify(metadata));
        }
        request = request.timeout(this.timeout);
        const requestInfo = {
            method: 'POST',
            url,
            params: {},
            data: { file: fileName, metadata },
        };
        try {
            const response = await request;
            return response.body;
        }
        catch (error) {
            const typedError = error;
            if (typedError.response) {
                throw createApiError(error, requestInfo);
            }
            throw createNetworkError(error, requestInfo);
        }
    }
    async assetsDelete(identifier, force) {
        return this.request({
            method: 'DELETE',
            path: `/files/${identifier}`,
            params: force ? { force } : {},
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async assetsBulkUpload(files) {
        const url = `${this.basePath}/files/bulk/upload`;
        let request = superagent.post(url);
        request = request.set('project-id', this.projectId);
        request = request.set('Accept', 'application/json');
        if (this.apiKey) {
            request = request.set('Authorization', `Bearer ${this.apiKey}`);
        }
        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            let fileName = `upload-${index}.bin`;
            if (typeof File !== 'undefined' && file instanceof File) {
                fileName = file.name || fileName;
                request = request.attach('files[]', Buffer.from(await file.arrayBuffer()), {
                    filename: fileName,
                    contentType: file.type || 'application/octet-stream',
                });
            }
            else if (Buffer.isBuffer(file)) {
                request = request.attach('files[]', file, fileName);
            }
            else {
                throw new ValidationError('Invalid file payload for bulk upload.');
            }
        }
        request = request.timeout(this.timeout);
        const requestInfo = {
            method: 'POST',
            url,
            params: {},
            data: { files: files.length },
        };
        try {
            const response = await request;
            return response.body;
        }
        catch (error) {
            const typedError = error;
            if (typedError.response) {
                throw createApiError(error, requestInfo);
            }
            throw createNetworkError(error, requestInfo);
        }
    }
    async assetsBulkUpdateMetadata(payload) {
        return this.request({
            method: 'PATCH',
            path: '/files/bulk/metadata',
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async webhooksList() {
        return this.request({
            method: 'GET',
            path: '/webhooks',
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async webhooksGet(uuid) {
        return this.request({
            method: 'GET',
            path: `/webhooks/${uuid}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async webhooksCreate(payload) {
        return this.request({
            method: 'POST',
            path: '/webhooks',
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async webhooksUpdate(uuid, payload) {
        return this.request({
            method: 'PUT',
            path: `/webhooks/${uuid}`,
            params: undefined,
            data: payload,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async webhooksDelete(uuid) {
        return this.request({
            method: 'DELETE',
            path: `/webhooks/${uuid}`,
            params: undefined,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    async webhooksLogs(uuid, params) {
        return this.request({
            method: 'GET',
            path: `/webhooks/${uuid}/logs`,
            params,
            tokenKind: 'apiKey',
            allowUserRefresh: false,
        });
    }
    getProjectUserAccessToken() {
        if (this.tokenStorage) {
            return this.tokenStorage.getAccessToken() ?? this.userAccessToken;
        }
        return this.userAccessToken;
    }
    getProjectUserRefreshToken() {
        if (this.tokenStorage) {
            return this.tokenStorage.getRefreshToken() ?? this.userRefreshToken;
        }
        return this.userRefreshToken;
    }
    setProjectUserTokensFromAuthPayload(payload) {
        this.userAccessToken = payload.access_token;
        this.userRefreshToken = payload.refresh_token;
        this.sessionExpiresAt = payload.expires_at;
        this.refreshSessionExpiresAt = payload.refresh_token_expires_at;
        this.sessionUser = payload.user;
        if (this.tokenStorage) {
            this.tokenStorage.setAccessToken(payload.access_token);
            this.tokenStorage.setRefreshToken(payload.refresh_token);
        }
    }
    clearProjectUserTokens() {
        this.userAccessToken = undefined;
        this.userRefreshToken = undefined;
        this.sessionExpiresAt = undefined;
        this.refreshSessionExpiresAt = undefined;
        this.sessionUser = undefined;
        if (this.tokenStorage) {
            this.tokenStorage.clear();
        }
    }
    emitAuthStateChange(event) {
        const session = this.getSession();
        for (const listener of this.authStateListeners) {
            listener(event, session);
        }
    }
    getTokenForKind(tokenKind) {
        if (tokenKind === 'apiKey') {
            return this.apiKey;
        }
        if (tokenKind === 'projectUser') {
            return this.getProjectUserAccessToken();
        }
        return undefined;
    }
    async request(options) {
        const { method, path, params = {}, data, tokenKind, allowUserRefresh = false, retryOnAuthError = true } = options;
        const url = `${this.basePath}${path}`;
        let request = superagent(method, url);
        request = request.set('project-id', this.projectId);
        request = request.set('Accept', 'application/json');
        const token = this.getTokenForKind(tokenKind);
        if (token) {
            request = request.set('Authorization', `Bearer ${token}`);
        }
        request = request.query(this.serializeQuery(params ?? {}));
        if (data !== undefined && data !== null) {
            request = request.send(data);
        }
        request = request.timeout(this.timeout);
        const requestInfo = {
            method,
            url,
            params,
            data: this.redactSensitiveData(path, data),
        };
        try {
            const response = await request;
            return response.body;
        }
        catch (error) {
            const typedError = error;
            if (typedError.response?.status === 401 &&
                allowUserRefresh &&
                retryOnAuthError &&
                this.autoRefresh &&
                this.getProjectUserRefreshToken() &&
                !path.startsWith('/auth/refresh')) {
                try {
                    await this.refreshSession();
                    return this.request({
                        method,
                        path,
                        params,
                        data,
                        tokenKind,
                        allowUserRefresh,
                        retryOnAuthError: false,
                    });
                }
                catch {
                    this.emitAuthStateChange('auth_error');
                    throw createApiError(error, requestInfo);
                }
            }
            if (typedError.response) {
                throw createApiError(error, requestInfo);
            }
            throw createNetworkError(error, requestInfo);
        }
    }
    serializeQuery(params) {
        const processedParams = { ...params };
        const where = processedParams['where'];
        if (where && typeof where === 'object' && !Array.isArray(where)) {
            delete processedParams['where'];
            const appendWhere = (key, value) => {
                if (Array.isArray(value)) {
                    value.forEach((item, index) => appendWhere(`${key}[${index}]`, item));
                    return;
                }
                if (value && typeof value === 'object') {
                    for (const [childKey, childValue] of Object.entries(value)) {
                        appendWhere(`${key}[${childKey}]`, childValue);
                    }
                    return;
                }
                processedParams[key] = value;
            };
            for (const [field, condition] of Object.entries(where)) {
                appendWhere(`where[${field}]`, condition);
            }
        }
        return processedParams;
    }
    redactSensitiveData(path, payload) {
        if (!payload || typeof payload !== 'object') {
            return payload;
        }
        if (!path.startsWith('/auth/')) {
            return payload;
        }
        const redacted = { ...payload };
        const sensitiveFields = ['password', 'id_token', 'refresh_token', 'token', 'client_secret', 'code_verifier'];
        for (const field of sensitiveFields) {
            if (field in redacted) {
                redacted[field] = '[REDACTED]';
            }
        }
        return redacted;
    }
    validateConfiguration() {
        const errors = [];
        if (!this.basePath) {
            errors.push('Base URL is required');
        }
        if (!this.projectId) {
            errors.push('Project ID is required');
        }
        if (errors.length > 0) {
            throw new ValidationError(`Invalid client configuration: ${errors.join(', ')}`, { errors });
        }
    }
}
export function createClient(options) {
    return new ApiClient(options);
}
export default createClient;
//# sourceMappingURL=index.js.map