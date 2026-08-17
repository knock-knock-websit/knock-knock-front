import { RegisterPage } from "@/components/auth-pages";
import GuestRouteGuard from "@/components/guest-route-guard";
export const metadata = { title: "會員註冊" };
export default function Page() {
  return <GuestRouteGuard><RegisterPage /></GuestRouteGuard>;
}
