/* FraudGraph — Ring Detail page (full-page, standalone).
   Used for direct URL access to /rings/[id].
   Split-pane view is handled by the queue page (/rings). */
"use client";

import { useParams } from "next/navigation";
import { RingDetailContent } from "@/components/ring-detail";

export default function RingDetailPage() {
  const params = useParams<{ id: string }>();
  return <RingDetailContent ringId={params.id} />;
}
