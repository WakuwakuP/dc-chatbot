# Use admin and regular owner roles

Owner Discord Users will be split into Admin Owners and Regular Owners instead of giving every owner identical authority or introducing fine-grained RBAC in the MVP.

Admin Owners can manage owner-level settings such as owner membership and connection assignment. Regular Owners can view candidates, usage, and their own connection status, and can perform day-to-day member management for members assigned to their own ChatGPT Subscription Connection, such as promoting candidates to their own connection and disabling members assigned to them. Regular Owners cannot manage owners, view or manage all members, or change connection assignment. This keeps multiple-owner support safer than all-owner equality while avoiding the complexity of a full permission matrix.
