/* FraudGraph — Root redirect to Alert Queue */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/alerts");
}
