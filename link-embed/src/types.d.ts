/**
 * Message sent to the parent window when the embedded link is fully loaded.
 */
export interface EmbedLinkMessageLoaded {
    event: "loaded";
}

/**
 * Message sent to the parent window when the embedded link needs to be closed.
 */
export interface EmbedLinkMessageClose {
    event: "close";
}

/**
 * Message sent to the parent window when the link is successfully completed.
 *
 * If `redirect` is set to `true`, the parent window should redirect to the `successURL`.
 */
export interface EmbedLinkMessageSuccess {
    event: "success";
    successURL: string;
    redirect: boolean;
    user: {
        name: string;
        email: string;
        avatar: string;
        id: string;
        username: string;
    };
}

/**
 * Represents an embedded link message.
 */
export type EmbedLinkMessage =
    | EmbedLinkMessageLoaded
    | EmbedLinkMessageClose
    | EmbedLinkMessageSuccess;
