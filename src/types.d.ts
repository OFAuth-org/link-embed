/**
 * Message sent to the parent window when the embedded login is fully loaded.
 */
export interface EmbedLoginMessageLoaded {
    event: "loaded";
}

/**
 * Message sent to the parent window when the embedded login needs to be closed.
 */
export interface EmbedLoginMessageClose {
    event: "close";
}

/**
 * Message sent to the parent window when the login is successfully completed.
 *
 * If `redirect` is set to `true`, the parent window should redirect to the `successURL`.
 */
export interface EmbedLoginMessageSuccess {
    event: "success";
    successURL: string;
    redirect: boolean;
}

/**
 * Represents an embedded login message.
 */
export type EmbedLoginMessage =
    | EmbedLoginMessageLoaded
    | EmbedLoginMessageClose
    | EmbedLoginMessageSuccess;
