# Support Discord image vision without persisting images

The bot will support Discord image attachments for vision-capable responses. Bot Worker sends attachment URLs to the API, and the API fetches image data just-in-time for provider calls. Image bytes and attachment URLs must not be stored in D1 or logs.

The MVP target supports up to 10 images per request and up to 10 MB per image. If more than 10 images are attached, only the first 10 are processed and the user-facing response must make the truncation clear. Oversized images should be resized or compressed inside the Worker API if practical; if the Worker/runtime/provider constraints make that unsafe, oversized images may be skipped with a user-visible note.

Audit metadata may record only non-content processing metadata such as attachment count, image count, processed image count, skipped image count, resized image count, maximum image size, and oversized-image presence.
