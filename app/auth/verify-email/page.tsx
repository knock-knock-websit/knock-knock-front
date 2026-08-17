import { VerifyEmailPage } from "@/components/auth-pages";
import GuestRouteGuard from "@/components/guest-route-guard";
export const metadata = { title: "驗證 Email" };
export default function Page() {
  return <GuestRouteGuard><VerifyEmailPage /></GuestRouteGuard>;
}
