import { Schema, model, Document } from "mongoose";

export interface IAudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number;
  timeSignature: number;
}

export interface ITrackAudioFeatures extends Document {
  trackId: string;
  features: IAudioFeatures;
  fetchedAt: Date;
}

const AudioFeaturesSchema = new Schema<IAudioFeatures>(
  {
    danceability: Number,
    energy: Number,
    valence: Number,
    tempo: Number,
    acousticness: Number,
    instrumentalness: Number,
    speechiness: Number,
    liveness: Number,
    loudness: Number,
    key: Number,
    mode: Number,
    timeSignature: Number,
  },
  { _id: false }
);

const TrackAudioFeaturesSchema = new Schema<ITrackAudioFeatures>({
  trackId: { type: String, required: true, unique: true, index: true },
  features: { type: AudioFeaturesSchema, required: true },
  fetchedAt: { type: Date, required: true },
});

export const TrackAudioFeatures = model<ITrackAudioFeatures>(
  "TrackAudioFeatures",
  TrackAudioFeaturesSchema
);
