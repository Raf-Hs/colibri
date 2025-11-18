import { Storage } from "@google-cloud/storage";
import path from "path";

const storage = new Storage({
  keyFilename: path.join(process.cwd(), "gcs-key.json"), 
});

const bucketName = "colibri-identificaciones";
const bucket = storage.bucket(bucketName);

export { bucket };
