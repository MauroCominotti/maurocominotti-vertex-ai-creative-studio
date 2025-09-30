// src/app/opal-messages.ts
/** A Message from Opal to AI Flow, sent via window.parent.postMessage */
export type OpalMessage =
    | HandshakeReadyMessage
    | HomeLoadedMessage
    | BoardIdCreatedMessage;

/** Event when Opal has begun listening for messages from AI Flow. */
export declare interface HandshakeReadyMessage {
    type: 'handshake_ready';
}

/** Event when the Opal homepage is loaded. */
export declare interface HomeLoadedMessage {
    type: 'home_loaded';
    isSignedIn: boolean;
}

/** Event when a new opal has been created. */
export declare interface BoardIdCreatedMessage {
    type: 'board_id_created';
    id: string;
}

/** A message from AI Flow to Opal, sent via iframe.contentWindow.postMessage */
export type AiFlowMessage = CreateNewBoardMessage;

/** Message that creates a new Opal board. */
export declare interface CreateNewBoardMessage {
    type: 'create_new_board';
    prompt: string;
}