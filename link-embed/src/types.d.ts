/**
 * Message sent to the parent window when the iframe is fully loaded, 
 * and happens before the loading spinner is hidden and the iframe is displayed.
 */
export interface EmbedLinkMessageLoaded {
    event: "loaded";
}

/**
 * Message sent to the parent window when the embedded link has been signaled to close.
 * The embedded link will close itself after this message is received, but it can be used to clean up or trigger other actions as a result of the close.
 */
export interface EmbedLinkMessageClose {
    event: "close";
}

/**
 * Message sent to the parent window when the link is successfully completed.
 * If `redirect` is set to `true`, the parent window should redirect to the `successUrl`.
 * 
 * The `connection` object is the same as the `connection` object returned in the `EmbedLinkMessageSuccess` event.
 * 
 * The `user` object is the same as the `user` object returned in the `EmbedLinkMessageSuccess` event.
 * 
 * Deprecated: The `user` object is deprecated and will be removed in the next major version. Use the `connection` object instead.
 */
export interface EmbedLinkMessageSuccess {
    event: "success";
    successUrl: string;
    redirect: boolean;

    // @deprecated - Set to be deprecated in next major version, use connection.user instead
    user: {
        name: string;
        avatar: string;
        id: string;
        username: string;
    };

    connection: {
        id: string;
        user: {
            userId: string;
            name: string;
            username: string;
            avatar: string;
        }
    }
}

/**
 * Represents an embedded link message.
 */
export type EmbedLinkMessage =
    | EmbedLinkMessageLoaded
    | EmbedLinkMessageClose
    | EmbedLinkMessageSuccess;
