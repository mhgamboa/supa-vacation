import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { decode } from "base64-arraybuffer";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    let { image } = req.body;

    // Retrieve the image data from the request's body and check that it is not empty
    if (!image) {
      return res.status(500).json({ message: "No image provided" });
    }
    try {
      // Check the image data as it should be encoded in Base64
      const contentType = image.match(/data:(.*);base64/)?.[1];
      const base64FileData = image.split("base64,")?.[1];

      if (!contentType || !base64FileData) {
        return res.status(500).json({ message: "Image data not valid" });
      }

      // Generate a unique filename
      const fileName = nanoid();
      const ext = contentType.split("/")[1];
      const path = `${fileName}.${ext}`;

      // Upload your file to your Supbase bucket
      const { data, error: uploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET)
        .upload(path, decode(base64FileData), {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error("Unable to upload image to storage");
      }

      // Construct its public URL and return it to the client who initiated the HTTP request
      const url = `${process.env.SUPABASE_URL.replace(".co", ".in")}/storage/v1/object/public/${
        data.Key
      }`;

      return res.status(200).json({ url });
    } catch (e) {
      res.status(500).json({ message: "Something went wrong" });
    }
  }
  // HTTP method not supported!
  else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ message: `HTTP method ${req.method} is not supported.` });
  }
}
