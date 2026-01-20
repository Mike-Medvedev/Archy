import { PublicClientApplication } from "@azure/msal-browser";

const clientId =
    (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined) ??
    "PASTE_CLIENT_ID_HERE";

if (!clientId || clientId === "PASTE_CLIENT_ID_HERE") {
    throw new Error(
        "Missing client ID. Set VITE_AZURE_CLIENT_ID or paste it in msalConfig.ts.",
    );
}

export const msalInstance = new PublicClientApplication({
    auth: {
        clientId,
        authority: "https://login.microsoftonline.com/9ea67325-7963-4cf8-b7d2-816b72466990",
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "localStorage",
    },
});

export const loginRequest = {
    scopes: ["https://management.azure.com/user_impersonation"],
};
