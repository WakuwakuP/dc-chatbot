# Support multiple owners and member connection assignment

The bot will support multiple Owner Discord Users. Registered Members can be assigned to use a specific Owner Discord User's ChatGPT Subscription Connection when the member does not have a direct connection.

This avoids assuming a single global owner connection and makes delegated subscription usage explicit per member. The trade-off is additional management and authorization complexity: owner records, owner status, connection assignment, and effective connection resolution must all be modeled separately.
