# Use Vite, React, React Router, Tailwind CSS, and shadcn/ui for the web frontend

The Owner management web frontend will use Vite, React, React Router, Tailwind CSS, and shadcn/ui.

Vite is chosen as the build tool because the frontend is deployed as a Cloudflare Pages application and does not require a server-rendered framework for the MVP. React matches the existing ADR direction for a React management UI. React Router provides explicit client-side route definitions for Owner-facing management screens such as connection status, Registered Member management, Candidate Discord User promotion, usage metadata, model settings, prompt settings metadata, and Automated Trigger Source settings.

Tailwind CSS is chosen as the styling foundation because it fits a Vite/React frontend and is the expected styling layer for shadcn/ui. shadcn/ui is chosen for reusable source-owned UI components, especially forms, cards, tables, dialogs, tabs, empty states, badges, and settings screens.

When using shadcn/ui, components should be added as source code through the shadcn CLI and composed from existing components before writing custom UI. UI code should use semantic tokens and component variants rather than hard-coded colors. Form layout should use shadcn's field/form composition patterns instead of ad-hoc layout wrappers.

The frontend must keep sensitive content out of frontend state. It must not store Discord message content, selected Conversation Context content, prompt bodies, response text, plaintext credential material, attachment URLs, attachment bytes, or provider raw request/response bodies.
