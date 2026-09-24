"use client";

import { useState, useEffect } from "react";
import { Category, Exam, Course, Settings } from "@/lib/store-types";

// Client-side memory cache and in-flight request deduplication
const CLIENT_CACHE = new Map<string, { data: any; timestamp: number }>();
const PENDING_REQUESTS = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 5 * 1000; // 5 seconds client cache for snappy speed without locking out updates

export function clearClientStoreCache() {
  CLIENT_CACHE.clear();
}

export async function fetchWithCache<T>(url: string, bypassCache = false): Promise<T> {
  const cached = CLIENT_CACHE.get(url);
  if (!bypassCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  const inFlight = PENDING_REQUESTS.get(url);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      CLIENT_CACHE.set(url, { data, timestamp: Date.now() });
      PENDING_REQUESTS.delete(url);
      return data;
    })
    .catch((err) => {
      PENDING_REQUESTS.delete(url);
      throw err;
    });

  PENDING_REQUESTS.set(url, promise);
  return promise as Promise<T>;
}

export function useCategories(scope: "public" | "all" = "public") {
  const [categories, setCategories] = useState<Category[]>(() => {
    const key = scope === "all" ? `/api/categories?scope=all` : `/api/categories?scope=public`;
    return (CLIENT_CACHE.get(key)?.data as Category[]) || [];
  });
  const [loading, setLoading] = useState(() => categories.length === 0);

  useEffect(() => {
    let mounted = true;
    const bypass = scope === "all";
    const url = bypass ? `/api/categories?scope=all&t=${Date.now()}` : `/api/categories?scope=public`;
    
    fetchWithCache<Category[]>(url, bypass)
      .then((data) => {
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

    return () => {
      mounted = false;
    };
  }, [scope]);

  return { categories, loading };
}

export function useExams(categoryId?: string, scope: "public" | "all" = "public") {
  const bypass = scope === "all";
  const url = categoryId
    ? (bypass ? `/api/exams?category=${categoryId}&scope=all&t=${Date.now()}` : `/api/exams?category=${categoryId}&scope=public`)
    : (bypass ? `/api/exams?scope=all&t=${Date.now()}` : `/api/exams?scope=public`);

  const [exams, setExams] = useState<Exam[]>(() => {
    return (CLIENT_CACHE.get(url)?.data as Exam[]) || [];
  });
  const [loading, setLoading] = useState(() => exams.length === 0);

  useEffect(() => {
    let mounted = true;
    fetchWithCache<Exam[]>(url, bypass)
      .then((data) => {
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

    return () => {
      mounted = false;
    };
  }, [categoryId, scope, url, bypass]);

  return { exams, loading };
}

export function useCourses(examId?: string) {
  const url = examId ? `/api/courses?exam=${encodeURIComponent(examId)}` : `/api/courses`;
  const [courses, setCourses] = useState<Course[]>(() => {
    return (CLIENT_CACHE.get(url)?.data as Course[]) || [];
  });
  const [loading, setLoading] = useState(() => courses.length === 0);

  useEffect(() => {
    let mounted = true;
    fetchWithCache<Course[]>(url)
      .then((data) => {
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

    return () => {
      mounted = false;
    };
  }, [examId, url]);

  return { courses, loading };
}

export function useSliderCourses() {
  const url = `/api/courses?slider=true`;
  const [courses, setCourses] = useState<Course[]>(() => {
    return (CLIENT_CACHE.get(url)?.data as Course[]) || [];
  });
  const [loading, setLoading] = useState(() => courses.length === 0);

  useEffect(() => {
    let mounted = true;
    fetchWithCache<Course[]>(url)
      .then((data) => {
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

    return () => {
      mounted = false;
    };
  }, [url]);

  return { courses, loading };
}

export function useSettings() {
  const url = `/api/settings`;
  const [settings, setSettings] = useState<Settings | null>(() => {
    return (CLIENT_CACHE.get(url)?.data as Settings) || null;
  });
  const [loading, setLoading] = useState(() => !settings);

  useEffect(() => {
    let mounted = true;
    fetchWithCache<Settings>(url)
      .then((data) => {
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

    return () => {
      mounted = false;
    };
  }, [url]);

  return { settings, loading };
}