import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { formatComposerThreadIdLabel, matchComposerThreadItems } from "./composerThreadItems.ts";

const env = EnvironmentId.make("env-1");
const otherEnv = EnvironmentId.make("env-2");
const shell = (
  id: string,
  title: string,
  overrides: Partial<Parameters<typeof matchComposerThreadItems>[0]["shells"][number]> = {},
) => ({
  environmentId: env,
  id: ThreadId.make(id),
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
  archivedAt: null,
  ...overrides,
});

describe("formatComposerThreadIdLabel", () => {
  it.each([
    ["019abcde-1234-5678-90ab-a1b2c3d4e5f", "019abcde"],
    ["short", "short"],
    ["import:codex:019abcde-1234-5678-90ab-a1b2c3d4e5f", "019abcde"],
    ["import:codex_work:session-123:child", "session-"],
    ["import:claudeAgent:abc12345-rest", "abc12345"],
    ["thread:provider:acpRegistry:native-thread:abc12345-rest", "abc12345"],
    ["thread:provider:acpRegistry:provider-instance:work:native-thread:abc12345-rest", "abc12345"],
    ["thread:provider:acpRegistry:native-thread:abc%2F1234-rest", "abc/1234"],
    ["thread:provider:acpRegistry:native-thread:abc%ZZ12-rest", "abc%ZZ12"],
    ["import:codex:", "import:c"],
    ["thread:legacy:original", "thread:l"],
  ])("displays %s as %s", (threadId, expected) => {
    expect(formatComposerThreadIdLabel(threadId)).toBe(expected);
  });
});

describe("matchComposerThreadItems", () => {
  it("offers nothing for a bare @ so the picker stays a file picker", () => {
    expect(
      matchComposerThreadItems({
        shells: [shell("t1", "Fix login")],
        environmentId: env,
        excludeThreadId: null,
        query: "  ",
      }),
    ).toEqual([]);
  });

  it("matches titles within the environment, newest first, skipping self and archived", () => {
    const items = matchComposerThreadItems({
      shells: [
        shell("old", "Login flow", { updatedAt: "2026-01-01T00:00:00.000Z" }),
        shell("new", "Login redesign", { updatedAt: "2026-02-01T00:00:00.000Z" }),
        shell("self", "Login self"),
        shell("gone", "Login archived", { archivedAt: "2026-01-02T00:00:00.000Z" }),
        shell("foreign", "Login elsewhere", { environmentId: otherEnv }),
        shell("nope", "Unrelated"),
      ],
      environmentId: env,
      excludeThreadId: ThreadId.make("self"),
      query: "LOGIN",
    });
    expect(items.map((item) => item.thread.threadId)).toEqual(["new", "old"]);
    expect(items[0]).toMatchObject({ type: "thread", label: "Login redesign" });
  });
});

describe("dedicated thread search", () => {
  const input = {
    environmentId: env,
    excludeThreadId: ThreadId.make("self"),
    mode: "thread" as const,
  };
  it("offers five latest eligible threads for an empty query across projects", () => {
    const shells = Array.from({ length: 7 }, (_, index) =>
      shell(`t${index}`, "Title", { updatedAt: `2026-01-0${index + 1}T00:00:00.000Z` }),
    );
    expect(
      matchComposerThreadItems({
        ...input,
        query: "",
        shells: [
          ...shells,
          shell("self", "Self", { updatedAt: "2026-12-01" }),
          shell("archived", "Archived", { archivedAt: "2026-01-01", updatedAt: "2026-12-01" }),
          shell("foreign", "Foreign", { environmentId: otherEnv, updatedAt: "2026-12-01" }),
        ],
      }).map((item) => item.thread.threadId),
    ).toEqual(["t6", "t5", "t4", "t3", "t2"]);
  });
  it("matches canonical IDs case-insensitively and ranks an exact ID before newer title and partial ID matches", () => {
    const shells = [
      shell("abc-123", "Unrelated", { updatedAt: "2026-01-01" }),
      shell("prefix-abc-123-suffix", "Other", { updatedAt: "2026-03-01" }),
      shell("title", "Fix ABC-123 login", { updatedAt: "2026-04-01" }),
    ];
    expect(
      matchComposerThreadItems({ ...input, shells, query: "ABC-123" }).map(
        (item) => item.thread.threadId,
      ),
    ).toEqual(["abc-123", "title", "prefix-abc-123-suffix"]);
    expect(
      matchComposerThreadItems({ ...input, shells, query: "fix abc-123 login" }).map(
        (item) => item.thread.threadId,
      ),
    ).toEqual(["title"]);
    expect(
      matchComposerThreadItems({
        environmentId: env,
        excludeThreadId: ThreadId.make("self"),
        shells,
        query: "abc-123",
      }).map((item) => item.thread.threadId),
    ).toEqual(["title"]);
  });
  it("returns an empty list when no title or ID matches", () => {
    expect(
      matchComposerThreadItems({ ...input, shells: [shell("one", "Login")], query: "missing" }),
    ).toEqual([]);
  });
  it("finds the displayed native session ID as well as its canonical thread ID", () => {
    const id = "thread:provider:acpRegistry:provider-instance:work:native-thread:abc%2F1234-rest";
    for (const query of ["ABC/1234", id]) {
      expect(
        matchComposerThreadItems({ ...input, shells: [shell(id, "Unrelated")], query }).map(
          (item) => item.thread.threadId,
        ),
      ).toEqual([id]);
    }
  });
});
