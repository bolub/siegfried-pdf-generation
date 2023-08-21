export interface FileStorageTypes {
  upload: (args: {
    path: string;
    file: File | NodeJS.ReadableStream | ArrayBuffer | Blob;
    bucket: string;
    opts?: { contentType?: string; upsert?: boolean };
  }) => Promise<{ path: string }>;
  temporalUrl: (args: {
    bucket: string;
    path: string;
    expiresIn?: number;
  }) => Promise<{ url: string }>;
  download: (args: { bucket: string; path: string }) => Promise<{ blob: Blob }>;
}
