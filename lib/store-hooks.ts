"use client";

import { useState, useEffect } from "react";
import { Category, Exam, Course, Settings } from "@/lib/store-types";

export function useCategories(scope: "public" | "all" = "public") {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/categories?scope=${scope}&t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          setCategories(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setCategories([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [scope]);

  return { categories, loading };
}

export function useExams(categoryId?: string, scope: "public" | "all" = "public") {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const url = categoryId
      ? `/api/exams?category=${categoryId}&scope=${scope}&t=${Date.now()}`
      : `/api/exams?scope=${scope}&t=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          setExams(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setExams([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [categoryId, scope]);

  return { exams, loading };
}

export function useCourses(examId?: string) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const url = examId ? `/api/courses?exam=${examId}&t=${Date.now()}` : `/api/courses?t=${Date.now()}`;
    fetch(url, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          setCourses(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setCourses([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [examId]);

  return { courses, loading };
}

export function useSliderCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/courses?slider=true&t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          setCourses(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setCourses([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  return { courses, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/settings?t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          setSettings(data && typeof data === "object" ? data : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSettings(null);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  return { settings, loading };
}