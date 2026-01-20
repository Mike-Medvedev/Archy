import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";

export default function useAzureAuth() {
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const account = accounts[0];

    const signIn = async () => {
        await instance.loginPopup(loginRequest);
    };

    const signOut = async () => {
        if (!account) return;
        await instance.logoutPopup({ account });
    };

    const getAccessToken = async () => {
        if (!account) {
            throw new Error("No account available");
        }
        try {
            const result = await instance.acquireTokenSilent({
                ...loginRequest,
                account,
            });
            return result.accessToken;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                const result = await instance.acquireTokenPopup(loginRequest);
                return result.accessToken;
            }
            throw error;
        }
    };

    return {
        isAuthenticated,
        account,
        signIn,
        signOut,
        getAccessToken,
    };
}
