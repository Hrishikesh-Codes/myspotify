import { Schema, model, Document } from "mongoose";

export interface IPlaylistItem {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  tracksTotal: number;
  public: boolean;
  collaborative: boolean;
}

export interface ICachedPlaylists extends Document {
  userId: string;
  playlists: IPlaylistItem[];
  fetchedAt: Date;
  expiresAt: Date;
}

const PlaylistItemSchema = new Schema<IPlaylistItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    tracksTotal: { type: Number, default: 0 },
    public: { type: Boolean, default: false },
    collaborative: { type: Boolean, default: false },
  },
  { _id: false }
);

const CachedPlaylistsSchema = new Schema<ICachedPlaylists>({
  userId: { type: String, required: true, unique: true, index: true },
  playlists: [PlaylistItemSchema],
  fetchedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const CachedPlaylists = model<ICachedPlaylists>(
  "CachedPlaylists",
  CachedPlaylistsSchema
);
