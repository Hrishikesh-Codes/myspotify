import { Schema, model, Document } from "mongoose";
import { ITrackItem } from "./CachedTopTracks";

export interface IPlayedTrack {
  track: ITrackItem;
  playedAt: string;
}

export interface ICachedRecentlyPlayed extends Document {
  userId: string;
  tracks: IPlayedTrack[];
  fetchedAt: Date;
  expiresAt: Date;
}

const TrackItemSchema = new Schema(
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

const PlayedTrackSchema = new Schema<IPlayedTrack>(
  {
    track: { type: TrackItemSchema, required: true },
    playedAt: { type: String, required: true },
  },
  { _id: false }
);

const CachedRecentlyPlayedSchema = new Schema<ICachedRecentlyPlayed>({
  userId: { type: String, required: true, unique: true, index: true },
  tracks: [PlayedTrackSchema],
  fetchedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const CachedRecentlyPlayed = model<ICachedRecentlyPlayed>(
  "CachedRecentlyPlayed",
  CachedRecentlyPlayedSchema
);
