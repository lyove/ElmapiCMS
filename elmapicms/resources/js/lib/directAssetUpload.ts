import axios from 'axios';

export type AssetDirectUploadShared = {
	enabled: boolean;
	multipart_threshold_bytes: number;
};

export type DirectUploadEndpoints = {
	uploadUrl: string;
	uploadFinalizeUrl: string;
	multipartInitiateUrl: string;
	multipartPartUrl: string;
	multipartCompleteUrl: string;
};

function normalizeUploadHeaders(headers: unknown): Record<string, string> {
	if (!headers || typeof headers !== 'object') {
		return {};
	}
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
		if (typeof value === 'string') {
			out[key] = value;
		}
	}

	return out;
}

type InitiateSingleResponse = {
	success: boolean;
	url: string;
	headers: Record<string, string>;
	intent_uuid: string;
	expires_at: string;
};

type InitiateMultipartResponse = {
	success: boolean;
	intent_uuid: string;
	storage_key: string;
	upload_id: string;
	part_size: number;
	part_count: number;
	expires_at: string;
};

type PartUrlResponse = {
	success: boolean;
	url: string;
	headers: Record<string, string>;
	expires_at: string;
};

type FinalizeResponse = {
	success: boolean;
	asset: unknown;
};

/**
 * Cross-origin PUT to S3/Spaces often fails with axios "Network Error" and no response when CORS is wrong.
 */
function rethrowStorageNetworkError(error: unknown): never {
	if (axios.isAxiosError(error) && !error.response && error.code === 'ERR_NETWORK') {
		throw new Error(
			'Upload to storage was blocked or failed before a response (browser "Network Error"). ' +
				'Most often: bucket CORS must allow your exact app origin, PUT, and Expose ETag. ' +
				'Check DevTools → Network for the failed PUT to the storage host.',
		);
	}
	throw error instanceof Error ? error : new Error(String(error));
}

/**
 * Direct upload to S3-compatible storage (presigned URLs). Uses web session routes under the project.
 */
export async function uploadProjectAssetDirect(
	file: File,
	flags: AssetDirectUploadShared,
	onProgress: (percent: number) => void,
	endpoints: DirectUploadEndpoints,
): Promise<unknown> {
	if (!flags.enabled) {
		throw new Error('Direct upload is not enabled.');
	}

	if (file.size > flags.multipart_threshold_bytes) {
		return uploadMultipart(file, onProgress, endpoints);
	}

	return uploadSinglePut(file, onProgress, endpoints);
}

async function uploadSinglePut(
	file: File,
	onProgress: (percent: number) => void,
	endpoints: DirectUploadEndpoints,
): Promise<unknown> {
	const { data: initiated } = await axios.post<InitiateSingleResponse>(endpoints.uploadUrl, {
		original_filename: file.name,
		client_mime_type: file.type || null,
		byte_size: file.size,
	});

	const headers = normalizeUploadHeaders(initiated.headers);

	try {
		await axios.put(initiated.url, file, {
			headers,
			withCredentials: false,
			onUploadProgress: (event) => {
				const total = event.total || file.size;
				if (!total) {
					return;
				}
				onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
			},
		});
	} catch (error: unknown) {
		rethrowStorageNetworkError(error);
	}

	const { data: finalized } = await axios.post<FinalizeResponse>(endpoints.uploadFinalizeUrl, {
		intent_uuid: initiated.intent_uuid,
	});

	return finalized.asset;
}

async function uploadMultipart(
	file: File,
	onProgress: (percent: number) => void,
	endpoints: DirectUploadEndpoints,
): Promise<unknown> {
	const { data: initiated } = await axios.post<InitiateMultipartResponse>(endpoints.multipartInitiateUrl, {
		original_filename: file.name,
		client_mime_type: file.type || null,
		byte_size: file.size,
	});

	const { intent_uuid, part_size, part_count } = initiated;
	let uploadedBytes = 0;

	for (let partNumber = 1; partNumber <= part_count; partNumber++) {
		const start = (partNumber - 1) * part_size;
		const end = Math.min(start + part_size, file.size);
		const chunk = file.slice(start, end);

		const { data: partSigned } = await axios.post<PartUrlResponse>(endpoints.multipartPartUrl, {
			intent_uuid,
			part_number: partNumber,
			content_length: chunk.size,
		});

		const partHeaders = normalizeUploadHeaders(partSigned.headers);

		try {
			await axios.put(partSigned.url, chunk, {
				headers: partHeaders,
				withCredentials: false,
				onUploadProgress: (event) => {
					const base = uploadedBytes;
					const total = file.size;
					const partTotal = event.total || chunk.size;
					const loaded = base + Math.min(event.loaded ?? 0, partTotal);
					onProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
				},
			});
		} catch (error: unknown) {
			rethrowStorageNetworkError(error);
		}

		uploadedBytes += chunk.size;
	}

	const { data: finalized } = await axios.post<FinalizeResponse>(endpoints.multipartCompleteUrl, {
		intent_uuid,
	});

	return finalized.asset;
}
