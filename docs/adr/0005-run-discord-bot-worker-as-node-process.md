# Run Discord bot worker as Node process

The Discord bot will run as a separate long-lived Node.js process using discord.js. It is not deployed as a Cloudflare Worker because Discord Gateway events, message content handling, typing indicators, and long-lived websocket behavior fit a Node process better.

The Bot Worker does not access D1 or ChatGPT credentials directly. It talks to the Cloudflare Worker API for membership checks, candidate updates, auditing, provider calls, and connection handling.
