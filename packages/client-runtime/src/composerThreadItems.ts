import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";

const COMPOSER_THREAD_RESULT_LIMIT = 5;

export interface ComposerThreadCandidate {
  readonly environmentId: EnvironmentId;
  readonly id: ThreadId;
  readonly title: string;
  readonly updatedAt: string;
  readonly archivedAt: string | null;
}

export interface ComposerThreadItem {
  readonly id: string;
  readonly type: "thread";
  readonly thread: ScopedThreadRef;
  readonly label: string;
  readonly description: string;
}

function composerThreadSessionId(threadId: string): string {
  const importedSessionId = /^import:[^:]+:(.+)$/u.exec(threadId)?.[1];
  if (importedSessionId) return importedSessionId;

  const nativeSessionId =
    /^thread:provider:[^:]+:(?:provider-instance:[^:]+:)?native-thread:([^:]+)$/u.exec(
      threadId,
    )?.[1];
  if (!nativeSessionId) return threadId;
  try {
    return decodeURIComponent(nativeSessionId);
  } catch {
    return nativeSessionId;
  }
}

/** Show the session's first eight characters without its import or provider namespace. */
export function formatComposerThreadIdLabel(threadId: string): string {
  return composerThreadSessionId(threadId).slice(0, 8);
}

/**
 * Threads the `@` picker offers next to file paths. The agent can only read threads on its
 * own server, so candidates stay within the composer's environment. A query is required:
 * bare `@` stays a file picker. Dedicated thread mode also offers recent threads and ID matches.
 */
export function matchComposerThreadItems(input: {
  shells: ReadonlyArray<ComposerThreadCandidate>;
  environmentId: EnvironmentId;
  excludeThreadId: ThreadId | null;
  query: string;
  mode?: "thread";
}): ComposerThreadItem[] {
  const query = input.query.trim().toLowerCase();
  if (query.length === 0 && input.mode !== "thread") return [];
  return input.shells
    .filter(
      (shell) =>
        shell.environmentId === input.environmentId &&
        shell.id !== input.excludeThreadId &&
        shell.archivedAt === null &&
        (shell.title.toLowerCase().includes(query) ||
          (input.mode === "thread" &&
            (shell.id.toLowerCase().includes(query) ||
              composerThreadSessionId(shell.id).toLowerCase().includes(query)))),
    )
    .sort((left, right) => {
      if (input.mode === "thread" && query.length > 0) {
        const exactOrder =
          Number(right.id.toLowerCase() === query) - Number(left.id.toLowerCase() === query);
        if (exactOrder !== 0) return exactOrder;
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, COMPOSER_THREAD_RESULT_LIMIT)
    .map((shell) => ({
      id: `thread:${shell.environmentId}:${shell.id}`,
      type: "thread",
      thread: { environmentId: shell.environmentId, threadId: shell.id },
      label: shell.title,
      description: "Thread",
    }));
}
