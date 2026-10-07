import Media from "../models/media.model.js";
import { notFound } from "../utils/httpError.js";
import { assertObjectId } from "../utils/validation.js";

/** GET /media/:id — serve a stored image. Media ids never change, so cache aggressively. */
export const getMedia = async (req, res) => {
  assertObjectId(req.params.id, "media id");
  const media = await Media.findById(req.params.id).lean();
  if (!media) throw notFound("Image not found");

  const data = media.data.buffer ? Buffer.from(media.data.buffer) : media.data;
  res.set({
    "Content-Type": media.contentType,
    "Content-Length": data.length,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  res.send(data);
};
