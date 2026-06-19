# Stream internally but post final Discord reply

The API streams provider output to the Bot Worker so the Bot Worker can maintain typing indicators and process long responses progressively. For short answers, the Bot Worker posts a single final Discord reply after generation completes.

This avoids noisy token-by-token Discord edits while preserving responsive internal streaming.
