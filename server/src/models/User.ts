import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  spotifyId: string;
  displayName: string;
  email: string;
  profileImage: string;
  accessToken: string;
  refreshToken: string;
  lastLogin: Date;
}

const UserSchema = new Schema<IUser>(
  {
    spotifyId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true },
    profileImage: { type: String, default: "" },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
