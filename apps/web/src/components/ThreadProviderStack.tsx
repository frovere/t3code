import { useAtomValue } from "@effect/atom-react";
import {
  resolveThreadProviderStack,
  type EnvironmentThreadShell,
} from "@t3tools/client-runtime/state/models";
import type { ScopedThreadRef } from "@t3tools/contracts";

import { cn } from "~/lib/utils";
import { useThreadShell } from "~/state/entities";
import { environmentProviderEntriesAtom } from "~/state/server";
import { shouldShowInstanceBadge, type ProviderInstanceEntry } from "../providerInstances";
import { ProviderInstanceIcon } from "./chat/ProviderInstanceIcon";

type ThreadProviderStackThread = Pick<
  EnvironmentThreadShell,
  "providerInstanceHistory" | "modelSelection" | "runtime"
>;

/** The current provider and up to two earlier providers, shared with the sidebar. */
export function ThreadProviderStack(props: {
  thread: ThreadProviderStackThread;
  providerEntryByInstanceId: ReadonlyMap<string, ProviderInstanceEntry>;
  size?: "default" | "compact";
  className?: string;
}) {
  const compact = props.size === "compact";
  const stack = resolveThreadProviderStack(props.thread);
  const currentInstanceId = stack[stack.length - 1]!;
  const currentEntry = props.providerEntryByInstanceId.get(currentInstanceId) ?? null;
  if (currentEntry === null) return null;
  const showInstanceBadge = shouldShowInstanceBadge(
    currentEntry,
    props.providerEntryByInstanceId.values(),
  );
  const current = (
    <ProviderInstanceIcon
      driverKind={currentEntry.driverKind}
      displayName={currentEntry.displayName}
      accentColor={currentEntry.accentColor}
      acpRegistryAgentId={currentEntry.acpRegistryAgentId}
      acpRegistryIconUrl={currentEntry.acpRegistryIconUrl}
      showBadge={showInstanceBadge}
      // Glyph dims, badge stays saturated; offset matches the composer trigger.
      iconClassName={compact ? "size-[1em]! opacity-60" : "size-3.5 opacity-60"}
      badgeClassName={
        compact
          ? "-right-0.5 -bottom-0.5 h-2.5 min-w-2.5 px-0.5 text-5xs"
          : "right-[-0.1875rem] bottom-[-0.1875rem] h-3 min-w-3 px-0.5 text-5xs"
      }
    />
  );
  if (stack.length === 1) {
    return (
      <span className={cn("inline-flex shrink-0 items-center", props.className)}>{current}</span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center",
        compact ? "gap-1" : "gap-1.5",
        props.className,
      )}
    >
      {stack.slice(0, -1).map((instanceId) => {
        const entry = props.providerEntryByInstanceId.get(instanceId);
        if (entry === undefined) return null;
        return (
          <ProviderInstanceIcon
            key={instanceId}
            driverKind={entry.driverKind}
            displayName={entry.displayName}
            acpRegistryAgentId={entry.acpRegistryAgentId}
            acpRegistryIconUrl={entry.acpRegistryIconUrl}
            iconClassName={
              compact ? "size-[0.85em]! opacity-35 grayscale" : "size-3 opacity-35 grayscale"
            }
          />
        );
      })}
      <span className="relative z-10 inline-flex items-center">{current}</span>
    </span>
  );
}

/** Resolve a referenced thread in its own environment, including remote thread mentions. */
export function ScopedThreadProviderStack(props: {
  threadRef: ScopedThreadRef;
  size?: "default" | "compact";
  className?: string;
}) {
  const { threadRef, ...stackProps } = props;
  const thread = useThreadShell(threadRef);
  const providerEntryByInstanceId = useAtomValue(
    environmentProviderEntriesAtom(threadRef.environmentId),
  );
  if (thread === null) return null;
  return (
    <ThreadProviderStack
      thread={thread}
      providerEntryByInstanceId={providerEntryByInstanceId}
      {...stackProps}
    />
  );
}
