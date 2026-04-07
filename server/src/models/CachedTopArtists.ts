import { Schema, model, Document } from "mongoose";

export interface IArtistItem {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
  followers: number;
}

export interface ICachedTopArtists extends Document {
  userId: string;
  timeRange: "short_term" | "medium_term" | "long_term";
  artists: IArtistItem[];
  fetchedAt: Date;
  expiresAt: Date;
}

const ArtistItemSchema = new Schema<IArtistItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    images: [{ url: String, width: Number, height: Number }],
    genres: [String],
    popularity: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
  },
  { _id: false }
);

const CachedTopArtistsSchema = new Schema<ICachedTopArtists>({
  userId: { type: String, required: true, index: true },
  timeRange: {
    type: String,
    enum: ["short_term", "medium_term", "long_term"],
    required: true,
  },
  artists: [ArtistItemSchema],
  fetchedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

CachedTopArtistsSchema.index({ userId: 1, timeRange: 1 }, { unique: true });

export const CachedTopArtists = model<ICachedTopArtists>(
  "CachedTopArtists",
  CachedTopArtistsSchema
);
