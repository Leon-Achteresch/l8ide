_context: Claude Code (or compatible agent) with filesystem access — desktop-file-system tools are redundant; prefer native file tools.

Rules:
- Call exec with natural-language instructions; include all context (project/org context is NOT shared between calls)
- attachments: pass files/images/blobs by absolute path when relevant (screenshots for session analysis, CSVs for data import, etc.)
- On clarification_needed, retry ONCE with missing info in instructions; if still unclear, ask the user
- On error, retry ONCE with a more detailed request; if still failing, tell the user and move on (never retry unauthorized)
- Never fabricate PostHog data
- User-provided project/org IDs in the prompt OVERRIDE stored context

</system-reminder>
