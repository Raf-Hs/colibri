import { bucket } from "../config/gcs.js";

export async function getSignedUrl(gsUrl) {
  const [, , bucketName, ...pathParts] = gsUrl.split("/");
  const filePath = pathParts.join("/");

  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000 // 15 minutos
  });

  return url;
}
