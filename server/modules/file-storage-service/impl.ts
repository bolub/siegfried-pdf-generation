import { type FileStorageTypes } from "@/server/modules/file-storage-service/interface";
import { supabase } from "@/server/modules/supabase/impl";

export const BUCKET_ACCESS_EXPIRATION_TIME = 600;

const upload: FileStorageTypes["upload"] = async ({
  path,
  file,
  bucket,
  opts,
}) => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { ...opts });

  if (error) {
    throw new Error(`Failed to upload file ${path} to Supabase.`);
  }
  return { path };
};

const temporalUrl: FileStorageTypes["temporalUrl"] = async ({
  bucket,
  path,
  expiresIn = BUCKET_ACCESS_EXPIRATION_TIME,
}) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error ?? data?.signedUrl === undefined) {
    throw new Error(`Unable to generate signed URL for ${path} from Supabase.`);
  }
  return { url: data.signedUrl };
};

const download: FileStorageTypes["download"] = async ({ bucket, path }) => {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || data === undefined) {
    throw new Error(`Unable to download blob ${path} from Supabase.`);
  }
  return { blob: data };
};

export const FileStorageService: FileStorageTypes = {
  upload,
  temporalUrl,
  download,
};
