// Backblaze B2 via API S3-compatível.
// Configura B2_ENDPOINT, B2_KEY_ID, B2_APP_KEY, B2_BUCKET (e B2_PUBLIC_URL) no .env.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function b2Configured() {
  return !!(
    process.env.B2_ENDPOINT &&
    process.env.B2_KEY_ID &&
    process.env.B2_APP_KEY &&
    process.env.B2_BUCKET
  );
}

function client() {
  return new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION || "eu-central-003",
    credentials: {
      accessKeyId: process.env.B2_KEY_ID!,
      secretAccessKey: process.env.B2_APP_KEY!,
    },
    // O B2 não suporta os checksums que o SDK v3 adiciona por omissão;
    // sem isto o PUT presigned falha (ou dispara preflight desnecessário).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function presignUpload(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.B2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client(), cmd, { expiresIn: 600 });
  return { uploadUrl, publicUrl: publicUrl(key) };
}

/** Upload direto pelo servidor (sem CORS no browser). */
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return { key, publicUrl: publicUrl(key) };
}

export function publicUrl(key: string) {
  const base =
    process.env.B2_PUBLIC_URL ||
    `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET}`;
  return `${base}/${key}`;
}
