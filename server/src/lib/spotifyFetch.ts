import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { User, IUser } from "../models/User";

/**
 * Makes a Spotify API request on behalf of a user.
 * If Spotify returns 401 (expired token), automatically refreshes the access
 * token once and retries. Throws on any other error.
 */
export async function spotifyFetch<T = unknown>(
  user: IUser,
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const makeRequest = (token: string) =>
    axios<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  try {
    return await makeRequest(user.accessToken);
  } catch (err: unknown) {
    if (!axios.isAxiosError(err) || err.response?.status !== 401) {
      throw err;
    }

    // Token expired — refresh it
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await axios.post<{
      access_token: string;
      refresh_token?: string;
    }>(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    user.accessToken = tokenRes.data.access_token;
    if (tokenRes.data.refresh_token) {
      user.refreshToken = tokenRes.data.refresh_token;
    }
    await User.findByIdAndUpdate(user._id, {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    });

    return makeRequest(user.accessToken);
  }
}
