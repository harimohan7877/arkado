import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
  not: vi.fn(),
  select: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: db.from } }));
vi.mock("next/cache", () => ({ revalidatePath: db.revalidate }));

import { deleteCatalogueCourse, patchStoreSettings, saveCatalogueCourse, setStoreData } from "@/lib/store-data";
import { applySettingsPatch, diffSettings } from "@/lib/settings-patch";

const course = { id: "rrb-kit", slug: "rrb-notes", title: "Railway Notes", price: 49 };

beforeEach(() => {
  vi.resetAllMocks();
  db.from.mockReturnValue({ upsert: db.upsert, delete: db.remove, select: db.select, update: db.update });
  db.upsert.mockResolvedValue({ error: null });
  db.remove.mockReturnValue({ eq: db.eq, not: db.not });
  db.eq.mockResolvedValue({ error: null });
});

describe("catalogue writes", () => {
  it("updates only the selected course and refreshes its canonical and ID pages", async () => {
    await saveCatalogueCourse({ ...course, slug: "rrb-study-notes" }, course);
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: course.id }), { onConflict: "id" });
    expect(db.remove).not.toHaveBeenCalled();
    expect(db.revalidate).toHaveBeenCalledWith("/course/rrb-notes");
    expect(db.revalidate).toHaveBeenCalledWith("/course/rrb-study-notes");
    expect(db.revalidate).toHaveBeenCalledWith("/course/rrb-kit");
  });

  it("does not copy a public sample into the paid delivery field", async () => {
    await saveCatalogueCourse({ ...course, sample_pdf_url: "https://drive.google.com/file/d/sample/view" });
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({ drive_url: "" }), { onConflict: "id" });
  });

  it("never deletes unlisted courses after a failed bulk upsert", async () => {
    const error = new Error("write failed");
    db.upsert.mockResolvedValue({ error });
    await expect(setStoreData("courses", "data/courses.json", [course])).rejects.toBe(error);
    expect(db.remove).not.toHaveBeenCalled();
    expect(db.revalidate).not.toHaveBeenCalled();
  });

  it("deletes only the resolved course ID", async () => {
    await deleteCatalogueCourse(course);
    expect(db.eq).toHaveBeenCalledWith("id", course.id);
    expect(db.not).not.toHaveBeenCalled();
  });
});

describe("settings patches", () => {
  it("preserves fields another tab changed while this form was open", () => {
    const previous = { homepage: { section_order: ["hero"], title: "Old title" }, contact: { phone: "123" } };
    const edited = { ...previous, homepage: { ...previous.homepage, title: "New title" } };
    const latest = { ...previous, homepage: { ...previous.homepage, section_order: ["hero", "categories"] } };

    expect(applySettingsPatch(latest, diffSettings(previous, edited))).toEqual({
      ...latest,
      homepage: { section_order: ["hero", "categories"], title: "New title" },
    });
  });

  it("removes a cleared section override without changing a sibling override", () => {
    expect(applySettingsPatch({ overrides: { first: { cols: 2 }, second: { cols: 3 } } }, {
      overrides: { first: null },
    })).toEqual({ overrides: { second: { cols: 3 } } });
  });

  it("reads a fresh version and retries when another settings save wins", async () => {
    const oldTime = "2026-11-24T12:00:00.000Z";
    const newTime = "2026-11-25T12:00:00.000Z";
    db.select.mockReturnValue({ limit: db.limit });
    db.limit.mockReturnValue({ maybeSingle: db.maybeSingle });
    db.maybeSingle
      .mockResolvedValueOnce({ data: { id: "settings", gemini_key: '{"homepage":{"title":"Old"}}', updated_at: oldTime } })
      .mockResolvedValueOnce({ data: { id: "settings", gemini_key: '{"homepage":{"title":"Other edit"}}', updated_at: newTime } });
    const writeSelect = vi.fn().mockReturnValue({
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: "settings" }, error: null }),
    });
    db.update.mockReturnValue({ eq: db.eq });
    db.eq.mockReturnValue({ eq: db.eq, select: writeSelect });

    const result = await patchStoreSettings({ contact: { email: "help@example.test" } });
    expect(result).toMatchObject({ homepage: { title: "Other edit" }, contact: { email: "help@example.test" } });
    expect(db.update).toHaveBeenCalledTimes(2);
    expect(db.eq).toHaveBeenCalledWith("updated_at", oldTime);
    expect(db.eq).toHaveBeenCalledWith("updated_at", newTime);
  });
});
