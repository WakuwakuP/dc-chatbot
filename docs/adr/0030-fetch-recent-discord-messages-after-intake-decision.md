# Fetch recent Discord messages after intake decision

The Bot Worker does not send recent messages during intake. If the API determines that a response may be needed, it returns a context fetch plan. The Bot Worker then fetches recent Discord messages according to that plan and sends them to the response stream endpoint.

This minimizes message content sent to the API for ignored events while still allowing contextual responses when needed.
