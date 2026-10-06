<?php

return [
    'max_file_size' => env('MAX_FILE_SIZE', '100M'),

    'portable_packages' => [
        'max_upload_size' => env('PORTABLE_PACKAGE_MAX_UPLOAD_SIZE', '1gb'),
        'max_uncompressed_size' => (int) env('PORTABLE_PACKAGE_MAX_UNCOMPRESSED_SIZE', 2 * 1024 * 1024 * 1024),
        'max_files' => (int) env('PORTABLE_PACKAGE_MAX_FILES', 1000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Direct upload to S3-compatible storage (e.g. DigitalOcean Spaces)
    |--------------------------------------------------------------------------
    |
    | When enabled and the project disk uses the s3 driver, the dashboard uploader
    | uses presigned URLs (and multipart above the threshold) instead of posting
    | files through Laravel. Classic POST upload remains the default fallback.
    |
    */
    'direct_upload' => [
        'enabled' => env('ASSET_DIRECT_UPLOAD', false),
        'url_ttl_minutes' => (int) env('ASSET_DIRECT_UPLOAD_URL_TTL', 15),
        'multipart_threshold_bytes' => (int) env('ASSET_DIRECT_UPLOAD_MULTIPART_THRESHOLD', 100 * 1024 * 1024),
        'multipart_part_size_bytes' => (int) env('ASSET_DIRECT_UPLOAD_MULTIPART_PART_SIZE', 10 * 1024 * 1024),
    ],

    'allowed_upload_mimes' => [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
        'mp3', 'wav', 'ogg', 'aac', 'flac',
        'mp4', 'webm', 'mov', 'avi', 'wmv', 'flv',
    ],

    'image_extensions' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
    'video_extensions' => ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'],
    'audio_extensions' => ['mp3', 'wav', 'ogg', 'aac', 'flac'],
    'document_extensions' => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
];
