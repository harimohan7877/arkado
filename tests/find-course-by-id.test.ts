import { describe, it, expect } from "vitest";
import { findCourseById } from "@/lib/seo";
import type { CourseBundle } from "@/lib/courses";

// Ticket 08: a bare exam id must NOT resolve to a course. /course/5004 used
// to serve the first exam_id:5004 kit (MTS Maths book, HTTP 200, Maths
// JSON-LD/canonical) instead of redirecting to the exam hub /exams/ssc-mts.
const courses = [
  { id: "c-maths", slug: "ssc-mts-maths-1000-mcq-book", exam_id: "5004", title: "MTS Maths" },
  { id: "c-eng", slug: "ssc-mts-english-1000-mcq-book", exam_id: "5004", title: "MTS English" },
  { id: "c-cgl", slug: "ssc-cgl-maths-1000-mcq-book", exam_id: "5001", title: "CGL Maths" },
] as unknown as CourseBundle[];

describe("findCourseById (ticket 08 — exam alias separation)", () => {
  it("does not resolve a bare exam id to any course", () => {
    expect(findCourseById(courses, "5004")).toBeUndefined();
    expect(findCourseById(courses, "5001")).toBeUndefined();
  });

  it("still resolves a course by its own slug and id", () => {
    expect(findCourseById(courses, "ssc-mts-maths-1000-mcq-book")?.id).toBe("c-maths");
    expect(findCourseById(courses, "c-eng")?.slug).toBe("ssc-mts-english-1000-mcq-book");
  });
});
