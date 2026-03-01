/* FraudGraph — Root redirect to Ring Queue */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/rings");
}
