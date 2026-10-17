import { afterEach, describe, expect, it, vi } from "vitest";
import { createAlibabaAdapter } from "@/server/providers/alibaba";
import { createFlytodayAdapter } from "@/server/providers/flytoday";
import { createSafarmarketAdapter } from "@/server/providers/safarmarket";
import { createSnapptripAdapter } from "@/server/providers/snapptrip";
import { ProviderError } from "@/server/providers/contracts";
import { QUERY } from "./provider-fixtures";

const providers = [
  { id: "alibaba", create: createAlibabaAdapter },
  { id: "flytoday", create: createFlytodayAdapter },
  { id: "safarmarket", create: createSafarmarketAdapter },
  { id: "snapptrip", create: createSnapptripAdapter },
] as const;
const context = () => ({ signal: new AbortController().signal });

afterEach(() => { vi.restoreAllMocks(); });

describe("named provider integration boundaries", () => {
  it.each(providers)("keeps $id unavailable without making network requests", async ({ id, create }) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network must remain unused."));
    const adapter = create();
    expect(adapter.provider.id).toBe(id);
    expect(adapter.mode).toBe("LIVE");
    expect(adapter.readiness.status).not.toBe("connected");
    expect(adapter.readiness.authorizationReference).toBeUndefined();
    expect(adapter.readiness.missingRequirements?.length).toBeGreaterThanOrEqual(4);
    await expect(adapter.search(QUERY, context())).rejects.toBeInstanceOf(ProviderError);
    await expect(adapter.search(QUERY, context())).rejects.toMatchObject({ code: "not-authorized" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
