"use client";

import { useState, useEffect } from "react";
import { Category, Exam, Course, Settings } from "@/lib/store-types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then(res => res.json())
      .then(data => { setCategories(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { categories, loading };
}

export function useExams(categoryId?: string) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = categoryId ? `/api/exams?category=${categoryId}` : "/api/exams";
    fetch(url)
      .then(res => res.json())
      .then(data => { setExams(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [categoryId]);

  return { exams, loading };
}

export function useCourses(examId?: string) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = examId ? `/api/courses?exam=${examId}` : "/api/courses";
    fetch(url)
      .then(res => res.json())
      .then(data => { setCourses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [examId]);

  return { courses, loading };
}

export function useSliderCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/courses?slider=true")
      .then(res => res.json())
      .then(data => { setCourses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { courses, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return { settings, loading };
}