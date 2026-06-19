# Support limited text attachments without persisting content

The bot will support selected text-like Discord attachments in the MVP. Supported file types are `.txt`, `.md`, `.json`, `.log`, `.csv`, `.yaml`, `.yml`, and `.xml`. Attachment URLs and attachment contents must not be stored in D1 or logs.

Text attachment processing is limited to 256 KB per file and 512 KB total per request. If a file exceeds the per-file limit, the API may include the first and last portions of the file within the limit and must make partial processing clear in the user-facing response. If the total limit is exceeded, later attachments are skipped. Text decoding supports UTF-8 and UTF-16 BOM; undecodable files are skipped with a user-visible note.

Audit metadata may record only non-content processing metadata such as text attachment count, processed count, partial count, skipped count, and total text bytes considered.
