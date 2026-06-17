export interface OAuthAuthorizeUrlOptions {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  accessType?: "online" | "offline";
  prompt?: string;
}

export const createOAuthAuthorizeUrl = (
  options: OAuthAuthorizeUrlOptions,
): string => {
  const {
    baseUrl,
    clientId,
    redirectUri,
    scope,
    state,
    accessType = "offline",
    prompt = "consent",
  } = options;

  const url = new URL(`${baseUrl}/oauth/v2/auth`);

  url.searchParams.set("scope", scope);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", accessType);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("redirect_uri", redirectUri);

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
};
