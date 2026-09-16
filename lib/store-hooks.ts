"use client";

import { useState, useEffect } from "react";
import { Category, Exam, Course, Settings } from "@/lib/store-types";

const clientCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL = 30 * 1000; // 30 seconds

function getCachedData<T>(key: string): T | null {
  const entry = clientCache.get(key);
  if (entry && Date.now() - entry.timestamp < CLIENT_CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCachedData<T>(key: string, data: T) {
  clientCache.set(key, { data, timestamp: Date.now() });
}

export function useCategories(scope: "public" | "all" = "public") {
  const cacheKey = `categories_${scope}`;
  const cached = getCachedData<Category[]>(cacheKey);
  const [categories, setCategories] = useState<Category[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/categories?scope=${scope}`)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const list = Array.isArray(data) ? data : [];
          setCachedData(cacheKey, list);
          setCategories(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          if (!cached) setCategories([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [scope, cacheKey, cached]);

  return { categories, loading };
}

export function useExams(categoryId?: string, scope: "public" | "all" = "public") {
  const cacheKey = `exams_${categoryId || "all"}_${scope}`;
  const cached = getCachedData<Exam[]>(cacheKey);
  const [exams, setExams] = useState<Exam[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;
    const url = categoryId
      ? `/api/exams?category=${categoryId}&scope=${scope}`
      : `/api/exams?scope=${scope}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const list = Array.isArray(data) ? data : [];
          setCachedData(cacheKey, list);
          setExams(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          if (!cached) setExams([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [categoryId, scope, cacheKey, cached]);

  return { exams, loading };
}

export function useCourses(examId?: string) {
  const cacheKey = `courses_${examId || "all"}`;
  const cached = getCachedData<Course[]>(cacheKey);
  const [courses, setCourses] = useState<Course[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;
    const url = examId ? `/api/courses?exam=${examId}` : `/api/courses`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const list = Array.isArray(data) ? data : [];
          setCachedData(cacheKey, list);
          setCourses(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          if (!cached) setCourses([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [examId, cacheKey, cached]);

  return { courses, loading };
}

export function useSliderCourses() {
  const cacheKey = "slider_courses";
  const cached = getCachedData<Course[]>(cacheKey);
  const [courses, setCourses] = useState<Course[]>(cached || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/courses?slider=true`)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const list = Array.isArray(data) ? data : [];
          setCachedData(cacheKey, list);
          setCourses(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          if (!cached) setCourses([]);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [cacheKey, cached]);

  return { courses, loading };
}

export function useSettings() {
  const cacheKey = "site_settings";
  const cached = getCachedData<Settings>(cacheKey);
  const [settings, setSettings] = useState<Settings | null>(cached || null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const val = data && typeof data === "object" ? data : null;
          setCachedData(cacheKey, val);
          setSettings(val);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          if (!cached) setSettings(null);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [cacheKey, cached]);

  return { settings, loading };
}