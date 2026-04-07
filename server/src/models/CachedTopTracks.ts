import { Schema, model, Document } from "mongoose";

export interface ITrackItem {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  albumName: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
  popularity: number;
}

export interface ICachedTopTracks extends Document {
  userId: string;
  timeRange: "short_term" | "medium_term" | "long_term";
  tracks: ITrackItem[];
  fetchedAt: Date;
  expiresAt: Date;
}

const TrackItemSchema = new Schema<ITrackItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    artists: [{ id: String, name: String }],
    albumName: { type: String, required: true },
    albumArt: { type: String, default: "" },
    durationMs: { type: Number, required: true },
    previewUrl: { type: String, default: null },
    popularity: { type: Number, default: 0 },
  },
  { _id: false }
);

const CachedTopTracksSchema = new Schema<ICachedTopTracks>({
  userId: { type: String, required: true, index: true },
  timeRange: {
    type: String,
    enum: ["short_term", "medium_term", "long_term"],
    required: true,
  },
  tracks: [TrackItemSchema],
  fetchedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

CachedTopTracksSchema.index({ userId: 1, timeRange: 1 }, { unique: true });

export const CachedTopTracks = model<ICachedTopTracks>(
  "CachedTopTracks",
  CachedTopTracksSchema
);
