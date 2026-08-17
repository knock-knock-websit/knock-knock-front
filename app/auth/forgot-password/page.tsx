import { ForgotPasswordPage } from "@/components/auth-pages";
import GuestRouteGuard from "@/components/guest-route-guard";
export const metadata = { title: "忘記密碼" };
export default function Page() {
  return <GuestRouteGuard><ForgotPasswordPage /></GuestRouteGuard>;
}
