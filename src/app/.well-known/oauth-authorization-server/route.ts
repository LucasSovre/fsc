import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { auth, productionReady } from "../../../server/auth";
const metadata = oauthProviderAuthServerMetadata(auth);
export function GET(request: Request) { productionReady(); return metadata(request); }
