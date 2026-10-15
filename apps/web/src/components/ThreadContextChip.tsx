import { useAtomValue } from "@effect/atom-react";
import type { ThreadContextRecord } from "@t3tools/contracts";
import { Link } from "@tanstack/react-router";
import { MessagesSquareIcon } from "lucide-react";

import { useThreadShell } from "~/state/entities";
import { environmentProviderEntriesAtom } from "~/state/server";
import { ThreadProviderStack } from "./ThreadProviderStack";
import { ContextChip, ContextChipLabel } from "./ContextChip";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

/**
 * Inline chip for an attached thread, in the composer and in sent messages. Prefers the
 * live title so a renamed thread never shows a stale label, and opens the thread on click.
 */
export function ThreadContextChip(props: {
  record: Pick<ThreadContextRecord, "environmentId" | "threadId" | "title">;
  copyMarkdown?: string;
}) {
  const { environmentId, threadId } = props.record;
  const shell = useThreadShell({ environmentId, threadId });
  const providerEntryByInstanceId = useAtomValue(environmentProviderEntriesAtom(environmentId));
  const title = shell?.title?.trim() || props.record.title;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ContextChip
            kind="thread"
            render={<Link to="/$environmentId/$threadId" params={{ environmentId, threadId }} />}
            aria-label={`Thread, ${title}`}
            data-markdown-copy={props.copyMarkdown}
            className="no-underline"
          >
            <MessagesSquareIcon />
            <ContextChipLabel>{title}</ContextChipLabel>
            {shell ? (
              <span aria-hidden className="inline-flex shrink-0 items-center">
                <ThreadProviderStack
                  thread={shell}
                  providerEntryByInstanceId={providerEntryByInstanceId}
                  size="compact"
                />
              </span>
            ) : null}
          </ContextChip>
        }
      />
      <TooltipPopup side="top">{shell ? "Open thread" : "Thread no longer available"}</TooltipPopup>
    </Tooltip>
  );
}
