/**
 * Message sent to the parent window when the iframe is fully loaded, 
 * and happens before the loading spinner is hidden and the iframe is displayed.
 */
export interface EmbedLinkMessageLoaded {
    event: "loaded";
}

export type CloseType = "user_exit" | "error" | "forced_exit";
export type CloseStep = "pre-login" | "login" | "2fa" | "approval" | "success" | "error";

export interface CloseError {
    error_type: string;
    error_message: string;
}

export interface UserData {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

export interface Connection {
    id: string;
    userData: UserData;
}

export interface SuccessMetadata {
    successUrl: string;
    redirect: boolean;
    connection: Connection;

    /**
     * @deprecated Will be removed in a future release, use `connection.userData` instead.
     */
    user: UserData;
}

export interface CloseMetadata {
    type: CloseType;
    step?: CloseStep;
    error: CloseError | null;
}

export interface EmbedLinkMessageSuccess {
    event: "success";
    metadata: SuccessMetadata;
}

/**
 * Message sent to the parent window when the embedded link signals it has closed.
 * The SDK maps this to the public `close` event with metadata.
 */
export interface EmbedLinkMessageExit {
    event: "exit";
    metadata: CloseMetadata;
}

export interface EmbedLinkMessageInvalidSession {
    event: "invalid_session";
}

export type EmbedLinkMessage =
    | EmbedLinkMessageLoaded
    | EmbedLinkMessageExit
    | EmbedLinkMessageSuccess
    | EmbedLinkMessageInvalidSession;
