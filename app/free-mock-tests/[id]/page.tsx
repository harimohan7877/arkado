import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FREE_MOCKS } from "@/lib/free-mocks";
import FreeMockAttempt from "./FreeMockAttempt";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return FREE_MOCKS.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mock = FREE_MOCKS.find((entry) => entry.id === id);
  return mock ? { title: `${mock.name} Free Mock Test` } : {};
}

export default async function FreeMockPage({ params }: Props) {
  const { id } = await params;
  const mock = FREE_MOCKS.find((entry) => entry.id === id);
  if (!mock) notFound();
  return <FreeMockAttempt key={id} mock={mock} />;
}
